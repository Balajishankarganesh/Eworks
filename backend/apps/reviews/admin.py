"""
Reviews admin — Review model registration.
"""
from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["short_id", "customer_email", "partner_email", "rating_stars", "is_visible", "created_at"]
    list_filter = ["rating", "is_visible", "created_at"]
    search_fields = ["id", "customer__user__email", "partner__user__email", "comment"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def short_id(self, obj):
        return str(obj.id)[:8] + "..."
    short_id.short_description = "ID"

    def customer_email(self, obj):
        return obj.customer.user.email
    customer_email.short_description = "Customer"

    def partner_email(self, obj):
        return obj.partner.user.email
    partner_email.short_description = "Partner"

    def rating_stars(self, obj):
        return "★" * obj.rating + "☆" * (5 - obj.rating)
    rating_stars.short_description = "Rating"

    actions = ["make_visible", "hide_review"]

    @admin.action(description="Mark selected reviews as visible")
    def make_visible(self, request, queryset):
        queryset.update(is_visible=True)

    @admin.action(description="Hide selected reviews")
    def hide_review(self, request, queryset):
        queryset.update(is_visible=False)
