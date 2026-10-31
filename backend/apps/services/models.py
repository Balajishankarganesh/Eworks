"""
services app models — ServiceCategory, PartnerService.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class ServiceCategory(models.Model):
    """
    Top-level service categories shown to customers.
    Examples: Electrician, Plumber, AC Repair, Carpenter, Appliance Repair, Cleaning.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name or class (e.g. lucide icon)")
    image = models.ImageField(upload_to="categories/", null=True, blank=True)

    # Pricing
    base_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Minimum / base price shown to customers (INR)",
    )
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Hourly rate if pricing is time-based",
    )
    estimated_duration_minutes = models.PositiveSmallIntegerField(
        default=60, help_text="Typical job duration used for scheduling"
    )

    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveSmallIntegerField(default=0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "services_category"
        verbose_name = "Service Category"
        verbose_name_plural = "Service Categories"
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class ServiceSubcategory(models.Model):
    """Optional subcategories under a main ServiceCategory."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.CASCADE, related_name="subcategories"
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, db_index=True)
    description = models.TextField(blank=True)
    additional_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services_subcategory"
        verbose_name = "Service Subcategory"
        verbose_name_plural = "Service Subcategories"
        unique_together = [("category", "slug")]

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class PartnerService(models.Model):
    """
    Associates a partner with a ServiceCategory they offer,
    including their specific pricing and experience level.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.ForeignKey(
        "accounts.PartnerProfile",
        on_delete=models.CASCADE,
        related_name="services",
    )
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.CASCADE,
        related_name="partner_services",
    )
    subcategories = models.ManyToManyField(ServiceSubcategory, blank=True)

    # Partner's own pricing (overrides category base if set)
    custom_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Partner's own price; falls back to category base_price if null",
    )
    experience_years = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "services_partner_service"
        verbose_name = "Partner Service"
        unique_together = [("partner", "category")]
        indexes = [
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self):
        return f"{self.partner.user.email} — {self.category.name}"

    @property
    def effective_price(self):
        return self.custom_price or self.category.base_price
