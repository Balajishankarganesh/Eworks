"""
Serializers for Customer Reviews and Partner Feedback.
"""
from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """Read serializer for customer reviews."""
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    customer_name = serializers.SerializerMethodField()
    service_title = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "booking_id",
            "customer_name",
            "service_title",
            "partner_id",
            "rating",
            "comment",
            "is_visible",
            "partner_reply",
            "partner_replied_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            return obj.customer.user.get_full_name() or obj.customer.user.email.split("@")[0].title()
        return "Customer"

    def get_service_title(self, obj):
        if obj.booking and obj.booking.service_category:
            return obj.booking.service_category.name
        return "Service"


class CreateReviewSerializer(serializers.Serializer):
    """Payload to post a review for a completed booking."""
    booking_id = serializers.UUIDField(required=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=True)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class ReplyReviewSerializer(serializers.Serializer):
    """Payload for partner to reply to a review."""
    partner_reply = serializers.CharField(required=True, min_length=2, max_length=1000)
