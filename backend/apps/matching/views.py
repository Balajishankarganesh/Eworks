"""
matching app views — Matching trigger, real-time dispatch telemetry, and retry controls.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.bookings.models import Booking, BookingOffer
from .services import (
    trigger_matching_cycle,
    DEFAULT_BASE_RADIUS_KM,
    RADIUS_STEP_KM,
    MAX_MATCHING_ATTEMPTS,
)


class HealthView(APIView):
    """Health check endpoint for matching service."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"app": "matching", "status": "ok", "timestamp": timezone.now().isoformat()})


class MatchingTriggerView(APIView):
    """
    POST /api/v1/matching/trigger/<uuid:booking_id>/
    Trigger the Rapido-style partner dispatch engine for a booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id=None):
        b_id = booking_id or request.data.get("booking_id")
        if not b_id:
            return Response(
                {"detail": "booking_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking = get_object_or_404(Booking, pk=b_id)
        user = request.user

        is_owner = hasattr(user, "customer_profile") and booking.customer == user.customer_profile
        is_admin = user.role == "ADMIN" or user.is_staff

        if not (is_owner or is_admin):
            return Response(
                {"detail": "Not authorized to trigger matching for this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )

        result = trigger_matching_cycle(str(booking.id), is_retry=False)
        http_status = status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)


class MatchingStatusView(APIView):
    """
    GET /api/v1/matching/status/<uuid:booking_id>/
    Retrieve real-time matching engine telemetry: attempts, search radius, active offers, partner assignment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, pk=booking_id)
        user = request.user

        is_customer = hasattr(user, "customer_profile") and booking.customer == user.customer_profile
        is_partner = hasattr(user, "partner_profile") and booking.partner == user.partner_profile
        is_admin = user.role == "ADMIN" or user.is_staff

        if not (is_customer or is_partner or is_admin):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        offers_qs = booking.offers.all()
        pending_count = offers_qs.filter(status=BookingOffer.OfferStatus.PENDING).count()
        accepted_offer = offers_qs.filter(status=BookingOffer.OfferStatus.ACCEPTED).first()

        attempts = booking.matching_attempts or 1
        current_radius = DEFAULT_BASE_RADIUS_KM + max(0, attempts - 1) * RADIUS_STEP_KM

        return Response({
            "booking_id": str(booking.id),
            "status": booking.status,
            "matching_attempts": attempts,
            "max_attempts": MAX_MATCHING_ATTEMPTS,
            "current_radius_km": current_radius,
            "total_offers_sent": offers_qs.count(),
            "pending_offers_count": pending_count,
            "can_retry": booking.status in [Booking.Status.NO_PARTNERS, Booking.Status.PENDING_MATCH],
            "is_matched": booking.partner is not None,
            "assigned_partner": (
                {
                    "id": str(booking.partner.id),
                    "name": booking.partner.user.get_full_name(),
                    "phone": booking.partner.user.phone,
                    "rating": str(booking.partner.average_rating),
                }
                if booking.partner
                else None
            ),
        })


class MatchingRetryView(APIView):
    """
    POST /api/v1/matching/retry/<uuid:booking_id>/
    Retry matching with an expanded search radius when previous attempts resulted in NO_PARTNERS.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, pk=booking_id)
        user = request.user

        is_owner = hasattr(user, "customer_profile") and booking.customer == user.customer_profile
        is_admin = user.role == "ADMIN" or user.is_staff

        if not (is_owner or is_admin):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status not in [Booking.Status.NO_PARTNERS, Booking.Status.PENDING_MATCH]:
            return Response(
                {"detail": f"Cannot retry matching for booking with status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = trigger_matching_cycle(str(booking.id), is_retry=True)
        return Response(result, status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST)
