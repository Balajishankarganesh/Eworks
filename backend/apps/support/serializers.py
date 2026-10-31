"""
Serializers for Support Tickets and Audit Logs.
"""
from rest_framework import serializers
from .models import SupportTicket, AuditLog


class SupportTicketSerializer(serializers.ModelSerializer):
    """Read serializer for support tickets."""
    raised_by_email = serializers.EmailField(source="raised_by.email", read_only=True)
    raised_by_name = serializers.SerializerMethodField()
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True)
    booking_reference = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "raised_by_email",
            "raised_by_name",
            "booking",
            "booking_reference",
            "category",
            "subject",
            "description",
            "status",
            "assigned_to",
            "assigned_to_email",
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "raised_by_email",
            "raised_by_name",
            "assigned_to_email",
            "booking_reference",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def get_raised_by_name(self, obj):
        return obj.raised_by.get_full_name() or obj.raised_by.email

    def get_booking_reference(self, obj):
        if obj.booking:
            cat_name = obj.booking.service_category.name if obj.booking.service_category else "Service"
            return f"#{obj.booking.id.hex[:8]} - {cat_name}"
        return None


class CreateSupportTicketSerializer(serializers.ModelSerializer):
    """Payload to raise a support ticket."""
    class Meta:
        model = SupportTicket
        fields = [
            "booking",
            "category",
            "subject",
            "description",
        ]


class UpdateSupportTicketSerializer(serializers.ModelSerializer):
    """Admin payload to update ticket status or resolution."""
    class Meta:
        model = SupportTicket
        fields = [
            "status",
            "resolution_notes",
            "assigned_to",
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    """Read serializer for administrative audit logs."""
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    target_user_email = serializers.EmailField(source="target_user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_email",
            "action",
            "target_user_email",
            "target_object_type",
            "target_object_id",
            "details",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields
