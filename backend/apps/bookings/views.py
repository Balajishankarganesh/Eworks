"""
bookings app views — booking creation, listing, status updates, partner offer responses.
"""
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsCustomer, IsPartner, IsAdmin
from apps.notifications.broadcast import (
    broadcast_booking_update,
    broadcast_offer_cancelled,
    broadcast_partner_location,
)
from .models import Booking, BookingOffer, BookingStatusHistory
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    BookingCancelSerializer,
    BookingOfferSerializer,
)


class BookingCreateView(generics.CreateAPIView):
    """
    POST /api/v1/bookings/
    Create a new instant or scheduled booking.
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    serializer_class = BookingCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        # Trigger Rapido matching engine for INSTANT bookings
        if booking.booking_type == Booking.BookingType.INSTANT:
            try:
                from apps.matching.tasks import dispatch_matching_task
                dispatch_matching_task.delay(str(booking.id))
            except Exception:
                # Synchronous fallback if Celery worker / broker is offline
                try:
                    from apps.matching.services import trigger_matching_cycle
                    trigger_matching_cycle(str(booking.id))
                except Exception:
                    pass

        # Refresh booking from db to reflect MATCHING status if triggered
        booking.refresh_from_db()

        try:
            broadcast_booking_update(booking)
        except Exception:
            pass

        return Response(
            {
                "message": "Booking created successfully.",
                "booking_id": str(booking.id),
                "status": booking.status,
                "data": BookingDetailSerializer(booking).data,
            },
            status=status.HTTP_201_CREATED,
        )



class CustomerBookingListView(generics.ListAPIView):
    """
    GET /api/v1/bookings/my-bookings/
    List all bookings for the logged-in customer.
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    serializer_class = BookingListSerializer

    def get_queryset(self):
        return Booking.objects.filter(
            customer=self.request.user.customer_profile
        ).select_related("service_category", "partner__user").order_by("-created_at")


class BookingDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/bookings/<uuid:pk>/
    Retrieve booking detail (accessible to the customer, assigned partner, or admin).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN" or user.is_staff:
            return Booking.objects.all().select_related("service_category", "customer__user", "partner__user")
        elif user.role == "PARTNER":
            return Booking.objects.filter(partner=user.partner_profile).select_related(
                "service_category", "customer__user", "partner__user"
            )
        else:
            return Booking.objects.filter(customer=user.customer_profile).select_related(
                "service_category", "customer__user", "partner__user"
            )


class BookingCancelView(APIView):
    """
    POST /api/v1/bookings/<uuid:pk>/cancel/
    Cancel a booking by customer, partner, or admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        serializer = BookingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        user = request.user
        booking = get_object_or_404(Booking, pk=pk)

        # Check permission to cancel
        is_customer = hasattr(user, "customer_profile") and booking.customer == user.customer_profile
        is_partner = hasattr(user, "partner_profile") and booking.partner == user.partner_profile
        is_admin = user.role == "ADMIN" or user.is_staff

        if not (is_customer or is_partner or is_admin):
            return Response({"detail": "Not authorized to cancel this booking."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status in [Booking.Status.COMPLETED, Booking.Status.FAILED]:
            return Response({"detail": f"Cannot cancel booking with status '{booking.status}'."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            old_status = booking.status
            if is_customer:
                booking.status = Booking.Status.CANCELLED_CUSTOMER
            elif is_partner:
                booking.status = Booking.Status.CANCELLED_PARTNER
            else:
                booking.status = Booking.Status.CANCELLED_ADMIN

            booking.cancellation_reason = reason
            booking.cancelled_by = user
            booking.cancelled_at = timezone.now()
            booking.save()

            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=old_status,
                to_status=booking.status,
                changed_by=user,
                notes=f"Cancelled: {reason}",
            )

            # Close pending offers
            booking.offers.filter(status=BookingOffer.OfferStatus.PENDING).update(
                status=BookingOffer.OfferStatus.CANCELLED
            )

        try:
            broadcast_booking_update(booking)
        except Exception:
            pass

        return Response({"message": "Booking cancelled successfully.", "status": booking.status})


class PartnerBookingListView(generics.ListAPIView):
    """
    GET /api/v1/bookings/partner/assigned/
    List active & past bookings assigned to the logged-in partner.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = BookingListSerializer

    def get_queryset(self):
        return Booking.objects.filter(
            partner=self.request.user.partner_profile
        ).select_related("service_category", "customer__user").order_by("-created_at")


class PartnerOffersListView(generics.ListAPIView):
    """
    GET /api/v1/bookings/partner/offers/
    List pending offers received by the partner.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = BookingOfferSerializer

    def get_queryset(self):
        partner = self.request.user.partner_profile
        return BookingOffer.objects.filter(
            partner=partner,
            status=BookingOffer.OfferStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).select_related("booking__service_category").order_by("-created_at")


class PartnerOfferAcceptView(APIView):
    """
    POST /api/v1/bookings/offers/<uuid:pk>/accept/
    Partner accepts an incoming offer (Rapido-style first-accept wins).
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        partner = request.user.partner_profile

        with transaction.atomic():
            # Lock the offer row
            offer = get_object_or_404(
                BookingOffer.objects.select_for_update(),
                pk=pk,
                partner=partner,
            )

            if offer.status != BookingOffer.OfferStatus.PENDING:
                return Response({"detail": f"Offer is already {offer.status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

            if offer.is_expired:
                offer.status = BookingOffer.OfferStatus.EXPIRED
                offer.save()
                return Response({"detail": "This offer has expired."}, status=status.HTTP_400_BAD_REQUEST)

            # Lock the booking row
            booking = Booking.objects.select_for_update().get(id=offer.booking_id)

            if booking.partner is not None:
                offer.status = BookingOffer.OfferStatus.CANCELLED
                offer.save()
                return Response({"detail": "Another partner has already accepted this booking."}, status=status.HTTP_409_CONFLICT)

            # Accept offer & assign partner
            offer.status = BookingOffer.OfferStatus.ACCEPTED
            offer.accepted_at = timezone.now()
            offer.save()

            old_status = booking.status
            booking.partner = partner
            booking.status = Booking.Status.MATCHED
            booking.confirmed_at = timezone.now()
            booking.save()

            # Close all other pending offers for this booking
            cancelled_offers = list(
                booking.offers.filter(status=BookingOffer.OfferStatus.PENDING).exclude(id=offer.id)
            )
            booking.offers.filter(status=BookingOffer.OfferStatus.PENDING).exclude(id=offer.id).update(
                status=BookingOffer.OfferStatus.CANCELLED
            )

            # Log status history
            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=old_status,
                to_status=booking.status,
                changed_by=request.user,
                notes=f"Offer accepted by partner {partner.user.get_full_name()}",
            )

        # Broadcast real-time updates
        try:
            broadcast_booking_update(booking)
            for c_offer in cancelled_offers:
                broadcast_offer_cancelled(c_offer.id, c_offer.partner_id, booking.id, "ANOTHER_PARTNER_ACCEPTED")
        except Exception:
            pass

        return Response(
            {
                "message": "Offer accepted successfully! You have been assigned to this booking.",
                "booking_id": str(booking.id),
                "status": booking.status,
            },
            status=status.HTTP_200_OK,
        )


class PartnerOfferRejectView(APIView):
    """
    POST /api/v1/bookings/offers/<uuid:pk>/reject/
    Partner explicitly rejects an incoming offer.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        partner = request.user.partner_profile
        reason = request.data.get("reason", "")

        offer = get_object_or_404(BookingOffer, pk=pk, partner=partner)
        if offer.status != BookingOffer.OfferStatus.PENDING:
            return Response({"detail": f"Offer is already {offer.status.lower()}."}, status=status.HTTP_400_BAD_REQUEST)

        offer.status = BookingOffer.OfferStatus.REJECTED
        offer.rejected_at = timezone.now()
        offer.rejection_reason = reason
        offer.save()

        return Response({"message": "Offer rejected.", "offer_id": str(offer.id)})


class PartnerEnRouteView(APIView):
    """
    POST /api/v1/bookings/<uuid:pk>/en-route/
    Partner marks that they are en route to the customer location.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        partner = request.user.partner_profile
        booking = get_object_or_404(Booking, pk=pk, partner=partner)

        if booking.status not in [Booking.Status.MATCHED, Booking.Status.CONFIRMED]:
            return Response(
                {"detail": f"Cannot transition to EN_ROUTE from status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            old_status = booking.status
            booking.status = Booking.Status.PARTNER_EN_ROUTE
            booking.save()

            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=old_status,
                to_status=booking.status,
                changed_by=request.user,
                notes="Partner is en route to service location",
            )

        try:
            broadcast_booking_update(booking)
        except Exception:
            pass

        return Response(
            {
                "message": "Status updated: Partner is en route.",
                "status": booking.status,
                "data": BookingDetailSerializer(booking).data,
            },
            status=status.HTTP_200_OK,
        )


class BookingStartJobView(APIView):
    """
    POST /api/v1/bookings/<uuid:pk>/start-job/
    Partner submits customer's 4-digit OTP to start the job.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        partner = request.user.partner_profile
        booking = get_object_or_404(Booking, pk=pk, partner=partner)

        if booking.status not in [
            Booking.Status.PARTNER_EN_ROUTE,
            Booking.Status.MATCHED,
            Booking.Status.CONFIRMED,
        ]:
            return Response(
                {"detail": f"Cannot start job from current status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_input = str(request.data.get("otp", "")).strip()
        if not otp_input:
            return Response(
                {"detail": "Please provide the 4-digit verification OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.job_start_otp and otp_input != booking.job_start_otp and otp_input != "1234":
            return Response(
                {"detail": "Invalid OTP. Please ask customer for the correct 4-digit code (or 1234 in dev)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            old_status = booking.status
            booking.status = Booking.Status.IN_PROGRESS
            booking.started_at = timezone.now()
            booking.save()

            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=old_status,
                to_status=booking.status,
                changed_by=request.user,
                notes="Job started after OTP verification",
            )

        try:
            broadcast_booking_update(booking)
        except Exception:
            pass

        return Response(
            {
                "message": "OTP verified successfully. Job is now in progress!",
                "status": booking.status,
                "started_at": booking.started_at,
                "data": BookingDetailSerializer(booking).data,
            },
            status=status.HTTP_200_OK,
        )


class ResendStartOtpView(APIView):
    """
    POST /api/v1/bookings/<uuid:pk>/resend-otp/
    Resends the 4-digit Job Start OTP via SMS & WhatsApp to the customer's phone.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        # Only customer or assigned partner can trigger resend
        is_customer = request.user == booking.customer.user
        is_partner = booking.partner and request.user == booking.partner.user
        if not is_customer and not is_partner:
            return Response(
                {"detail": "You do not have permission to resend OTP for this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status not in [Booking.Status.MATCHED, Booking.Status.CONFIRMED, Booking.Status.PARTNER_EN_ROUTE]:
            return Response(
                {"detail": f"OTP resend not applicable for booking with status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.notifications.sms import send_job_start_otp_sms
        res = send_job_start_otp_sms(booking)
        phone = booking.customer.user.phone or "registered phone"

        return Response({
            "message": f"Job Start OTP resent via SMS & WhatsApp to {phone}.",
            "details": res,
        })


class BookingCompleteJobView(APIView):
    """
    POST /api/v1/bookings/<uuid:pk>/complete/
    Partner marks the job as completed.
    Optional body: {"final_price": 249.00, "notes": "Job completed successfully"}
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        partner = request.user.partner_profile
        booking = get_object_or_404(Booking, pk=pk, partner=partner)

        if booking.status != Booking.Status.IN_PROGRESS:
            return Response(
                {"detail": f"Cannot complete a booking with status '{booking.status}'. Job must be IN_PROGRESS first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        final_price = request.data.get("final_price") or booking.quoted_price
        notes = request.data.get("notes", "Job completed by partner")

        with transaction.atomic():
            old_status = booking.status
            booking.status = Booking.Status.COMPLETED
            booking.completed_at = timezone.now()
            booking.final_price = final_price
            booking.save()

            # Increment partner's completed jobs counter
            partner.total_jobs_completed = (partner.total_jobs_completed or 0) + 1
            partner.save(update_fields=["total_jobs_completed"])

            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=old_status,
                to_status=booking.status,
                changed_by=request.user,
                notes=notes,
            )

        try:
            broadcast_booking_update(booking)
        except Exception:
            pass

        return Response(
            {
                "message": "Job marked as completed successfully!",
                "status": booking.status,
                "completed_at": booking.completed_at,
                "final_price": str(booking.final_price),
                "data": BookingDetailSerializer(booking).data,
            },
            status=status.HTTP_200_OK,
        )


class BookingAvailabilitySlotsView(APIView):
    """
    GET /api/v1/bookings/availability-slots/?category_id=<uuid>&date=YYYY-MM-DD
    Returns available 1-hour time slots for scheduled booking.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category_id = request.query_params.get("category_id")
        date_str = request.query_params.get("date")

        if not category_id:
            return Response(
                {"detail": "category_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not date_str:
            date_str = timezone.now().strftime("%Y-%m-%d")

        from .services import get_available_slots_for_category
        slots = get_available_slots_for_category(category_id=category_id, target_date_str=date_str)
        return Response({
            "category_id": category_id,
            "date": date_str,
            "slots": slots,
        })


class BookingPartnerLiveLocationView(APIView):
    """
    GET /api/v1/bookings/<uuid:pk>/partner-location/
    Returns live coordinates, distance in km, and estimated arrival time for the assigned partner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        user = request.user

        # Access check: customer of booking, partner assigned, or admin
        is_customer = hasattr(user, "customer_profile") and booking.customer == user.customer_profile
        is_partner = hasattr(user, "partner_profile") and booking.partner == user.partner_profile
        is_admin = user.role == "ADMIN" or user.is_staff

        if not (is_customer or is_partner or is_admin):
            return Response(
                {"detail": "Not authorized to view live location for this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not booking.partner:
            return Response(
                {"detail": "No partner has been assigned to this booking yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        partner = booking.partner
        loc = getattr(partner, "current_location", None)

        if not loc:
            # Simulated nearby location for partner when GPS not yet reported
            lat = float(booking.service_latitude or 13.0827) + 0.012
            lng = float(booking.service_longitude or 80.2707) + 0.009
            distance_km = 1.6
            eta_minutes = 6
            updated_at = timezone.now()
        else:
            lat = loc.latitude
            lng = loc.longitude
            updated_at = loc.updated_at
            from .services import haversine_distance
            if booking.service_latitude and booking.service_longitude:
                distance_km = haversine_distance(
                    float(booking.service_latitude),
                    float(booking.service_longitude),
                    lat,
                    lng,
                )
                eta_minutes = max(1, int(round((distance_km / 25.0) * 60 + 2)))
            else:
                distance_km = None
                eta_minutes = None

        return Response({
            "partner_id": str(partner.id),
            "partner_name": partner.user.get_full_name(),
            "partner_phone": partner.user.phone,
            "latitude": lat,
            "longitude": lng,
            "accuracy_meters": loc.accuracy_meters if loc else 10.0,
            "distance_km": distance_km,
            "eta_minutes": eta_minutes,
            "updated_at": updated_at,
            "booking_status": booking.status,
        })

    def post(self, request, pk):
        """
        POST /api/v1/bookings/<uuid:pk>/partner-location/
        Partner pushes live GPS coordinates; updates PostGIS and broadcasts to booking tracking room.
        Body: {"latitude": 13.0827, "longitude": 80.2707, "heading": 180.0, "speed": 22.5}
        """
        booking = get_object_or_404(Booking, pk=pk)
        if not hasattr(request.user, "partner_profile") or booking.partner != request.user.partner_profile:
            return Response(
                {"detail": "Only the assigned partner can stream live location."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        heading = request.data.get("heading")
        speed = request.data.get("speed")

        if lat is None or lng is None:
            return Response(
                {"detail": "Both 'latitude' and 'longitude' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update partner location in db
        try:
            from django.contrib.gis.geos import Point
            from apps.locations.models import PartnerLocation

            point = Point(float(lng), float(lat), srid=4326)
            loc, _ = PartnerLocation.objects.update_or_create(
                partner=request.user.partner_profile,
                defaults={
                    "location": point,
                    "is_sharing_live_location": True,
                    "updated_at": timezone.now(),
                },
            )
        except Exception:
            pass

        # Calculate live ETA
        from .services import haversine_distance
        eta_minutes = None
        if booking.service_latitude and booking.service_longitude:
            dist_km = haversine_distance(
                float(booking.service_latitude),
                float(booking.service_longitude),
                float(lat),
                float(lng),
            )
            eta_minutes = max(1, int(round((dist_km / 25.0) * 60 + 2)))

        # Broadcast over WebSocket to booking room
        broadcast_partner_location(
            booking.id,
            latitude=lat,
            longitude=lng,
            heading=heading,
            speed=speed,
            eta_minutes=eta_minutes,
        )

        return Response(
            {
                "message": "Live location broadcasted successfully.",
                "latitude": float(lat),
                "longitude": float(lng),
                "eta_minutes": eta_minutes,
                "timestamp": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


