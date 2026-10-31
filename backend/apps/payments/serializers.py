"""
Serializers for payments and partner earnings.
"""
from rest_framework import serializers
from .models import Payment, PartnerEarning


class CreateOrderSerializer(serializers.Serializer):
    """Payload to create a payment order for a booking."""
    booking_id = serializers.UUIDField(required=True)
    method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices,
        default=Payment.PaymentMethod.UPI,
    )


class VerifyPaymentSerializer(serializers.Serializer):
    """Payload to verify gateway payment."""
    payment_id = serializers.UUIDField(required=True)
    gateway_payment_id = serializers.CharField(required=False, allow_blank=True, default="")
    gateway_signature = serializers.CharField(required=False, allow_blank=True, default="")
    method = serializers.CharField(required=False, allow_blank=True, default="")


class PaymentSerializer(serializers.ModelSerializer):
    """Read serializer for payment records."""
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    customer_email = serializers.EmailField(source="customer.user.email", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking_id",
            "customer_email",
            "amount",
            "method",
            "status",
            "gateway_order_id",
            "gateway_transaction_id",
            "refund_amount",
            "refund_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PartnerEarningSerializer(serializers.ModelSerializer):
    """Read serializer for partner job earnings."""
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    service_title = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    completed_at = serializers.DateTimeField(source="booking.completed_at", read_only=True)

    class Meta:
        model = PartnerEarning
        fields = [
            "id",
            "booking_id",
            "service_title",
            "customer_name",
            "gross_amount",
            "platform_commission",
            "net_amount",
            "is_paid_out",
            "paid_out_at",
            "completed_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_service_title(self, obj):
        if obj.booking and obj.booking.service_category:
            return obj.booking.service_category.name
        return "Home Service"

    def get_customer_name(self, obj):
        if obj.booking and obj.booking.customer and obj.booking.customer.user:
            return obj.booking.customer.user.get_full_name() or obj.booking.customer.user.email
        return "Customer"


class RequestPayoutSerializer(serializers.Serializer):
    """Payload for partner requesting a withdrawal/payout."""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    upi_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bank_account_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    ifsc_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
