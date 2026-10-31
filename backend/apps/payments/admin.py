"""
Payments admin — Payment and PartnerEarning model registration.
"""
from django.contrib import admin
from .models import Payment, PartnerEarning


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "short_id", "booking_short_id", "customer_email", "amount",
        "method", "status", "gateway_transaction_id", "created_at"
    ]
    list_filter = ["status", "method", "created_at"]
    search_fields = [
        "id", "gateway_transaction_id", "gateway_order_id",
        "customer__user__email", "booking__id"
    ]
    readonly_fields = [
        "id", "gateway_transaction_id", "gateway_order_id",
        "gateway_response", "created_at", "updated_at"
    ]
    ordering = ["-created_at"]

    def short_id(self, obj):
        return str(obj.id)[:8] + "..."
    short_id.short_description = "ID"

    def booking_short_id(self, obj):
        return str(obj.booking.id)[:8] + "..."
    booking_short_id.short_description = "Booking"

    def customer_email(self, obj):
        return obj.customer.user.email
    customer_email.short_description = "Customer"


@admin.register(PartnerEarning)
class PartnerEarningAdmin(admin.ModelAdmin):
    list_display = [
        "short_id", "partner_email", "gross_amount", "platform_commission",
        "net_amount", "is_paid_out", "paid_out_at", "created_at"
    ]
    list_filter = ["is_paid_out", "created_at"]
    search_fields = ["partner__user__email", "booking__id"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]

    def short_id(self, obj):
        return str(obj.id)[:8] + "..."
    short_id.short_description = "ID"

    def partner_email(self, obj):
        return obj.partner.user.email
    partner_email.short_description = "Partner"

    actions = ["mark_as_paid_out"]

    @admin.action(description="Mark selected earnings as paid out")
    def mark_as_paid_out(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_paid_out=True, paid_out_at=timezone.now())
