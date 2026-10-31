"""
Support admin — SupportTicket and AuditLog model registration.
"""
from django.contrib import admin
from .models import SupportTicket, AuditLog


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["short_id", "raised_by_email", "category", "subject", "status", "assigned_to_email", "created_at"]
    list_filter = ["status", "category", "created_at"]
    search_fields = ["id", "subject", "description", "raised_by__email", "assigned_to__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def short_id(self, obj):
        return str(obj.id)[:8] + "..."
    short_id.short_description = "ID"

    def raised_by_email(self, obj):
        return obj.raised_by.email
    raised_by_email.short_description = "Raised By"

    def assigned_to_email(self, obj):
        return obj.assigned_to.email if obj.assigned_to else "—"
    assigned_to_email.short_description = "Assigned To"


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor_email", "action", "target_user_email", "ip_address"]
    list_filter = ["action", "created_at"]
    search_fields = ["action", "actor__email", "target_user__email", "ip_address", "target_object_id"]
    readonly_fields = [
        "id", "actor", "action", "target_user", "target_object_type",
        "target_object_id", "details", "ip_address", "user_agent", "created_at"
    ]
    ordering = ["-created_at"]

    def actor_email(self, obj):
        return obj.actor.email if obj.actor else "System"
    actor_email.short_description = "Actor"

    def target_user_email(self, obj):
        return obj.target_user.email if obj.target_user else "—"
    target_user_email.short_description = "Target User"

    # Audit logs are immutable records
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
