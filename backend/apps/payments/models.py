"""
payments app models — Payment, PartnerEarning.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator


class Payment(models.Model):
    """Records every payment transaction linked to a booking."""

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        CARD = "CARD", "Credit / Debit Card"
        NETBANKING = "NETBANKING", "Net Banking"
        WALLET = "WALLET", "Wallet"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.PROTECT,
        related_name="payment",
    )
    customer = models.ForeignKey(
        "accounts.CustomerProfile",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    method = models.CharField(max_length=15, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    status = models.CharField(max_length=25, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True)

    # Gateway fields
    gateway_transaction_id = models.CharField(max_length=255, blank=True, db_index=True)
    gateway_order_id = models.CharField(max_length=255, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)

    # Refund
    refund_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    refund_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments_payment"
        verbose_name = "Payment"

    def __str__(self):
        return f"Payment {self.id} — ₹{self.amount} [{self.status}]"


class PartnerEarning(models.Model):
    """Tracks how much a partner earned from each completed booking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.PROTECT,
        related_name="earnings",
    )
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.PROTECT,
        related_name="partner_earning",
    )
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    is_paid_out = models.BooleanField(default=False)
    paid_out_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments_partner_earning"
        verbose_name = "Partner Earning"

    def __str__(self):
        return f"Earning {self.id} — ₹{self.net_amount} for {self.partner.user.email}"
