"""
Locations admin — ServiceAddress, PartnerLocation, and PartnerAvailability.
"""
from django.contrib import admin
from .models import ServiceAddress, PartnerLocation, PartnerAvailability


@admin.register(ServiceAddress)
class ServiceAddressAdmin(admin.ModelAdmin):
    list_display = ["customer_email", "label", "city", "state", "pincode", "is_default", "created_at"]
    list_filter = ["city", "state", "is_default", "created_at"]
    search_fields = ["customer__user__email", "address_line_1", "city", "pincode"]
    readonly_fields = ["id", "created_at", "updated_at"]

    def customer_email(self, obj):
        return obj.customer.user.email
    customer_email.short_description = "Customer"


@admin.register(PartnerLocation)
class PartnerLocationAdmin(admin.ModelAdmin):
    list_display = ["partner_email", "latitude", "longitude", "accuracy_meters", "updated_at"]
    search_fields = ["partner__user__email", "partner__user__first_name", "partner__user__last_name"]
    readonly_fields = ["updated_at"]

    def partner_email(self, obj):
        return obj.partner.user.email
    partner_email.short_description = "Partner"


@admin.register(PartnerAvailability)
class PartnerAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["partner_email", "day_of_week_label", "start_time", "end_time", "is_available"]
    list_filter = ["day_of_week", "is_available"]
    search_fields = ["partner__user__email"]
    ordering = ["partner", "day_of_week", "start_time"]

    def partner_email(self, obj):
        return obj.partner.user.email
    partner_email.short_description = "Partner"

    def day_of_week_label(self, obj):
        return obj.get_day_of_week_display()
    day_of_week_label.short_description = "Day"
