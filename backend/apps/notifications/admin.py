"""
Notifications admin — Notification model registration.
"""
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient_email", "notification_type", "title", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read", "created_at"]
    search_fields = ["recipient__email", "title", "body"]
    readonly_fields = ["id", "created_at", "read_at"]
    ordering = ["-created_at"]

    def recipient_email(self, obj):
        return obj.recipient.email
    recipient_email.short_description = "Recipient"

    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description="Mark selected notifications as unread")
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
