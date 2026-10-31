"""
reviews app models — Review.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    """Customer review of a service partner after a completed booking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="review",
    )
    customer = models.ForeignKey(
        "accounts.CustomerProfile",
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        db_index=True,
    )
    comment = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)

    # Partner reply
    partner_reply = models.TextField(blank=True)
    partner_replied_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews_review"
        verbose_name = "Review"
        indexes = [
            models.Index(fields=["partner", "rating"]),
        ]

    def __str__(self):
        return f"Review {self.id} — {self.rating}★ by {self.customer.user.email}"
