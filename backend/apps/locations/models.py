"""
locations app models — ServiceAddress, PartnerLocation (PostGIS), PartnerAvailability.
"""
import uuid
from django.contrib.gis.db import models as gis_models
from django.db import models


class ServiceAddress(models.Model):
    """A saved address used by a customer for a booking."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "accounts.CustomerProfile",
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    label = models.CharField(max_length=50, default="Home", help_text="e.g. Home, Office, Other")
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    country = models.CharField(max_length=50, default="India")

    # PostGIS point: (longitude, latitude)
    location = gis_models.PointField(geography=True, null=True, blank=True, spatial_index=True)

    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "locations_service_address"
        verbose_name = "Service Address"
        verbose_name_plural = "Service Addresses"
        indexes = [
            models.Index(fields=["customer", "is_default"]),
        ]

    def __str__(self):
        return f"{self.label} — {self.address_line_1}, {self.city}"

    @property
    def latitude(self):
        return self.location.y if self.location else None

    @property
    def longitude(self):
        return self.location.x if self.location else None


class PartnerLocation(models.Model):
    """
    Real-time GPS location of a service partner.
    Updated by the partner's device (via REST or WebSocket).
    Indexed with PostGIS for fast geo-proximity queries.
    """

    partner = models.OneToOneField(
        "accounts.PartnerProfile",
        on_delete=models.CASCADE,
        related_name="current_location",
    )
    location = gis_models.PointField(geography=True, spatial_index=True)
    accuracy_meters = models.FloatField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        db_table = "locations_partner_location"
        verbose_name = "Partner Location"

    def __str__(self):
        return f"Location of {self.partner.user.email} @ {self.updated_at}"

    @property
    def latitude(self):
        return self.location.y

    @property
    def longitude(self):
        return self.location.x


class PartnerAvailability(models.Model):
    """
    Weekly recurring availability windows for a partner.
    Used by the scheduled booking engine to check free slots.
    """

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )
    day_of_week = models.IntegerField(choices=DayOfWeek.choices, db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "locations_partner_availability"
        verbose_name = "Partner Availability"
        verbose_name_plural = "Partner Availability Slots"
        unique_together = [("partner", "day_of_week", "start_time")]

    def __str__(self):
        return f"{self.partner.user.email} — {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"
