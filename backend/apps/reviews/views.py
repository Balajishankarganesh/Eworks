"""
Views for Reviews and Partner Ratings.
"""
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, Q
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsCustomer, IsPartner
from apps.accounts.models import PartnerProfile
from apps.bookings.models import Booking
from apps.notifications.broadcast import broadcast_user_notification
from .models import Review
from .serializers import (
    ReviewSerializer,
    CreateReviewSerializer,
    ReplyReviewSerializer,
)


class HealthView(APIView):
    """Health check endpoint for reviews app."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"app": "reviews", "status": "ok", "timestamp": timezone.now().isoformat()})


class CreateReviewView(APIView):
    """
    POST /api/v1/reviews/
    Customer posts a review and star rating for a completed booking.
    Body: {"booking_id": "<uuid>", "rating": 5, "comment": "Excellent work!"}
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking_id = serializer.validated_data["booking_id"]
        rating = serializer.validated_data["rating"]
        comment = serializer.validated_data.get("comment", "")

        customer = request.user.customer_profile
        booking = get_object_or_404(Booking, id=booking_id, customer=customer)

        if booking.status != Booking.Status.COMPLETED:
            return Response(
                {"detail": f"Can only review completed bookings (current status: '{booking.status}')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not booking.partner:
            return Response(
                {"detail": "No partner was assigned to this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        partner = booking.partner

        # Check if already reviewed
        if hasattr(booking, "review") or Review.objects.filter(booking=booking).exists():
            return Response(
                {"detail": "You have already submitted a review for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            review = Review.objects.create(
                booking=booking,
                customer=customer,
                partner=partner,
                rating=rating,
                comment=comment,
                is_visible=True,
            )

            # Recompute partner's aggregate rating and total reviews
            agg = Review.objects.filter(partner=partner, is_visible=True).aggregate(
                avg_rating=Avg("rating"),
                count=Count("id"),
            )

            new_avg = Decimal(str(round(agg["avg_rating"] or rating, 2)))
            new_count = agg["count"] or 1

            partner.average_rating = new_avg
            partner.total_reviews = new_count
            partner.save(update_fields=["average_rating", "total_reviews"])

        # Notify partner
        try:
            from apps.notifications.models import Notification
            broadcast_user_notification(
                user=partner.user,
                notification_type=Notification.NotificationType.REVIEW_RECEIVED,
                title=f"New {rating}★ Review from Customer!",
                body=f"\"{comment[:100]}\"" if comment else f"Customer rated your service {rating} stars.",
                data={"booking_id": str(booking.id), "review_id": str(review.id), "rating": rating},
            )
        except Exception:
            pass

        return Response(
            {
                "message": "Review submitted successfully! Thank you for your feedback.",
                "review": ReviewSerializer(review).data,
                "partner_new_average": float(new_avg),
                "partner_total_reviews": new_count,
            },
            status=status.HTTP_201_CREATED,
        )


class PartnerReviewsListView(APIView):
    """
    GET /api/v1/reviews/partner/<uuid:partner_id>/
    Public endpoint: lists reviews and rating distribution for a partner.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, partner_id):
        try:
            partner = PartnerProfile.objects.get(id=partner_id)
        except (PartnerProfile.DoesNotExist, ValueError):
            partner = get_object_or_404(PartnerProfile, user__id=partner_id)
        reviews_qs = Review.objects.filter(partner=partner, is_visible=True).order_by("-created_at")

        # Distribution count for 1 to 5 stars
        dist_agg = reviews_qs.aggregate(
            star_5=Count("id", filter=Q(rating=5)),
            star_4=Count("id", filter=Q(rating=4)),
            star_3=Count("id", filter=Q(rating=3)),
            star_2=Count("id", filter=Q(rating=2)),
            star_1=Count("id", filter=Q(rating=1)),
        )

        return Response({
            "partner_id": str(partner.id),
            "partner_name": partner.user.get_full_name() or partner.user.email,
            "average_rating": float(partner.average_rating or 0.0),
            "total_reviews": partner.total_reviews or reviews_qs.count(),
            "rating_distribution": {
                "5_star": dist_agg["star_5"],
                "4_star": dist_agg["star_4"],
                "3_star": dist_agg["star_3"],
                "2_star": dist_agg["star_2"],
                "1_star": dist_agg["star_1"],
            },
            "reviews": ReviewSerializer(reviews_qs[:50], many=True).data,
        })


class BookingReviewDetailView(APIView):
    """
    GET /api/v1/reviews/booking/<uuid:booking_id>/
    Retrieves the review submitted for a booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        review = Review.objects.filter(booking_id=booking_id).first()
        if not review:
            return Response({"review": None, "has_reviewed": False}, status=status.HTTP_200_OK)

        return Response({
            "review": ReviewSerializer(review).data,
            "has_reviewed": True,
        }, status=status.HTTP_200_OK)


class ReplyReviewView(APIView):
    """
    POST /api/v1/reviews/<uuid:pk>/reply/
    Partner posts a response to a review received.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request, pk):
        serializer = ReplyReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        partner = request.user.partner_profile
        review = get_object_or_404(Review, id=pk, partner=partner)

        review.partner_reply = serializer.validated_data["partner_reply"]
        review.partner_replied_at = timezone.now()
        review.save(update_fields=["partner_reply", "partner_replied_at"])

        return Response(
            {
                "message": "Reply posted successfully.",
                "review": ReviewSerializer(review).data,
            },
            status=status.HTTP_200_OK,
        )
