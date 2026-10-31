"""
bookings app models.
Central booking engine: Booking, BookingOffer, BookingStatusHistory.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator


class Booking(models.Model):
    """
    Core booking record created when a customer requests service.
    Covers both instant and scheduled bookings.
    """

    class BookingType(models.TextChoices):
        INSTANT = "INSTANT", "Instant"
        SCHEDULED = "SCHEDULED", "Scheduled"

    class Status(models.TextChoices):
        PENDING_MATCH = "PENDING_MATCH", "Pending Match"
        MATCHING = "MATCHING", "Matching in Progress"
        MATCHED = "MATCHED", "Partner Assigned"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PARTNER_EN_ROUTE = "PARTNER_EN_ROUTE", "Partner En Route"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED_CUSTOMER = "CANCELLED_CUSTOMER", "Cancelled by Customer"
        CANCELLED_PARTNER = "CANCELLED_PARTNER", "Cancelled by Partner"
        CANCELLED_ADMIN = "CANCELLED_ADMIN", "Cancelled by Admin"
        NO_PARTNERS = "NO_PARTNERS", "No Partners Available"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Parties
    customer = models.ForeignKey(
        "accounts.CustomerProfile",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="bookings",
    )

    # Service details
    service_category = models.ForeignKey(
        "services.ServiceCategory",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    problem_description = models.TextField()
    problem_photo = models.ImageField(upload_to="booking_photos/%Y/%m/", null=True, blank=True)

    # Type & status
    booking_type = models.CharField(
        max_length=10, choices=BookingType.choices, default=BookingType.INSTANT, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING_MATCH, db_index=True
    )

    # Location
    service_address = models.ForeignKey(
        "locations.ServiceAddress",
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="bookings",
    )
    service_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    service_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    service_address_text = models.TextField(blank=True)

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    estimated_duration_minutes = models.PositiveSmallIntegerField(default=60)

    # Pricing
    quoted_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0)],
    )
    final_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0)],
    )

    # Cancellation
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="cancelled_bookings",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Matching metadata
    matching_attempts = models.PositiveSmallIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # OTP for job start verification (partner scans / customer shares)
    job_start_otp = models.CharField(max_length=6, blank=True)

    class Meta:
        db_table = "bookings_booking"
        verbose_name = "Booking"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["partner", "status"]),
            models.Index(fields=["status", "booking_type"]),
            models.Index(fields=["scheduled_at"]),
        ]

    def __str__(self):
        return f"Booking {self.id} [{self.status}]"

    @property
    def total_amount(self):
        return self.final_price or self.quoted_price


class BookingOffer(models.Model):
    """
    An offer sent to a specific partner for a given booking.
    The matching engine tracks acceptance, rejection, and expiry here.
    """

    class OfferStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"  # closed because another partner accepted

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="offers")
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.CASCADE,
        related_name="received_offers",
    )
    status = models.CharField(
        max_length=10, choices=OfferStatus.choices, default=OfferStatus.PENDING, db_index=True
    )
    batch_number = models.PositiveSmallIntegerField(default=1)
    expires_at = models.DateTimeField(db_index=True)

    # Idempotency — prevent double-acceptance
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookings_offer"
        verbose_name = "Booking Offer"
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["partner", "status"]),
            models.Index(fields=["expires_at", "status"]),
        ]
        # Prevent sending duplicate PENDING offers to the same partner for the same booking
        constraints = [
            models.UniqueConstraint(
                fields=["booking", "partner"],
                condition=models.Q(status="PENDING"),
                name="unique_pending_offer_per_partner",
            )
        ]

    def __str__(self):
        return f"Offer {self.id} → {self.partner.user.email} [{self.status}]"

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expires_at < timezone.now()


class BookingStatusHistory(models.Model):
    """
    Immutable audit trail of every status change on a booking.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="booking_status_changes",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bookings_status_history"
        verbose_name = "Booking Status History"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.booking_id} | {self.from_status} → {self.to_status}"
