"""
Bookings admin — full registration with search, filters, and inline models.
"""
from django.contrib import admin
from .models import Booking, BookingOffer, BookingStatusHistory


class BookingStatusHistoryInline(admin.TabularInline):
    model = BookingStatusHistory
    extra = 0
    readonly_fields = ["id", "from_status", "to_status", "changed_by", "notes", "created_at"]
    ordering = ["-created_at"]
    can_delete = False


class BookingOfferInline(admin.TabularInline):
    model = BookingOffer
    extra = 0
    readonly_fields = [
        "id", "partner", "status", "batch_number",
        "expires_at", "accepted_at", "rejected_at", "rejection_reason", "created_at",
    ]
    ordering = ["-created_at"]
    can_delete = False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "short_id", "customer_email", "partner_name", "service_category",
        "booking_type", "status", "quoted_price", "final_price",
        "created_at", "completed_at",
    ]
    list_filter = ["status", "booking_type", "service_category", "created_at"]
    search_fields = [
        "id", "customer__user__email", "customer__user__first_name",
        "partner__user__email", "partner__user__first_name",
        "service_category__name", "service_address_text",
    ]
    readonly_fields = [
        "id", "customer", "partner", "job_start_otp", "matching_attempts",
        "created_at", "updated_at", "confirmed_at", "started_at",
        "completed_at", "cancelled_at", "cancelled_by",
    ]
    list_per_page = 30
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    inlines = [BookingStatusHistoryInline, BookingOfferInline]

    fieldsets = (
        ("Booking Info", {
            "fields": (
                "id", "customer", "partner", "service_category",
                "booking_type", "status", "problem_description", "problem_photo",
            ),
        }),
        ("Location", {
            "fields": (
                "service_address", "service_latitude", "service_longitude",
                "service_address_text",
            ),
        }),
        ("Scheduling & Pricing", {
            "fields": (
                "scheduled_at", "estimated_duration_minutes",
                "quoted_price", "final_price",
            ),
        }),
        ("Matching & OTP", {
            "fields": ("matching_attempts", "job_start_otp"),
        }),
        ("Cancellation", {
            "fields": (
                "cancellation_reason", "cancelled_by", "cancelled_at",
            ),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": (
                "created_at", "updated_at", "confirmed_at",
                "started_at", "completed_at",
            ),
        }),
    )

    @admin.display(description="ID")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Customer")
    def customer_email(self, obj):
        return obj.customer.user.email if obj.customer else "—"

    @admin.display(description="Partner")
    def partner_name(self, obj):
        return obj.partner.user.get_full_name() if obj.partner else "—"


@admin.register(BookingOffer)
class BookingOfferAdmin(admin.ModelAdmin):
    list_display = [
        "short_id", "booking_short", "partner_email",
        "status", "batch_number", "expires_at", "created_at",
    ]
    list_filter = ["status", "batch_number", "created_at"]
    search_fields = ["id", "booking__id", "partner__user__email"]
    readonly_fields = [
        "id", "booking", "partner", "accepted_at", "rejected_at",
        "rejection_reason", "created_at",
    ]
    list_per_page = 30
    ordering = ["-created_at"]

    @admin.display(description="ID")
    def short_id(self, obj):
        return str(obj.id)[:8]

    @admin.display(description="Booking")
    def booking_short(self, obj):
        return str(obj.booking_id)[:8]

    @admin.display(description="Partner")
    def partner_email(self, obj):
        return obj.partner.user.email


@admin.register(BookingStatusHistory)
class BookingStatusHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "booking_short", "from_status", "to_status",
        "changed_by_name", "notes_short", "created_at",
    ]
    list_filter = ["to_status", "created_at"]
    search_fields = ["booking__id", "notes"]
    readonly_fields = [
        "id", "booking", "from_status", "to_status",
        "changed_by", "notes", "created_at",
    ]
    list_per_page = 50
    ordering = ["-created_at"]

    @admin.display(description="Booking")
    def booking_short(self, obj):
        return str(obj.booking_id)[:8]

    @admin.display(description="Changed By")
    def changed_by_name(self, obj):
        return obj.changed_by.get_full_name() if obj.changed_by else "System"

    @admin.display(description="Notes")
    def notes_short(self, obj):
        return obj.notes[:80] if obj.notes else "—"
