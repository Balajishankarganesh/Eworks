"""
notifications app models — Notification, WebSocket routing.
"""
import uuid
from django.db import models


class Notification(models.Model):
    """In-app notifications sent to customers and partners."""

    class NotificationType(models.TextChoices):
        BOOKING_CREATED = "BOOKING_CREATED", "Booking Created"
        BOOKING_MATCHED = "BOOKING_MATCHED", "Partner Assigned"
        BOOKING_STATUS_UPDATE = "BOOKING_STATUS_UPDATE", "Status Update"
        NEW_OFFER = "NEW_OFFER", "New Service Offer"
        OFFER_ACCEPTED = "OFFER_ACCEPTED", "Offer Accepted"
        OFFER_EXPIRED = "OFFER_EXPIRED", "Offer Expired"
        PAYMENT_RECEIVED = "PAYMENT_RECEIVED", "Payment Received"
        REVIEW_RECEIVED = "REVIEW_RECEIVED", "Review Received"
        PARTNER_APPROVED = "PARTNER_APPROVED", "Account Approved"
        SYSTEM = "SYSTEM", "System Notification"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=25, choices=NotificationType.choices, db_index=True
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True, help_text="Arbitrary payload for frontend routing")
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications_notification"
        verbose_name = "Notification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.email}"
