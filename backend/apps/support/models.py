"""
support app models — SupportTicket, AuditLog.
"""
import uuid
from django.db import models


class SupportTicket(models.Model):
    """Customer or partner support requests."""

    class TicketStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    class TicketCategory(models.TextChoices):
        BOOKING_ISSUE = "BOOKING_ISSUE", "Booking Issue"
        PAYMENT_ISSUE = "PAYMENT_ISSUE", "Payment Issue"
        PARTNER_CONDUCT = "PARTNER_CONDUCT", "Partner Conduct"
        APP_BUG = "APP_BUG", "App Bug"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raised_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="support_tickets",
    )
    category = models.CharField(max_length=20, choices=TicketCategory.choices, default=TicketCategory.OTHER)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=15, choices=TicketStatus.choices, default=TicketStatus.OPEN, db_index=True)
    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_tickets",
    )
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "support_ticket"
        verbose_name = "Support Ticket"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Ticket {self.id} — {self.subject} [{self.status}]"


class AuditLog(models.Model):
    """
    Immutable audit trail for sensitive administrative actions.
    Written by the `log_action` utility; never deleted or updated.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100, db_index=True)
    target_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_target_logs",
    )
    target_object_type = models.CharField(max_length=100, blank=True)
    target_object_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "support_audit_log"
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor} → {self.action}"
