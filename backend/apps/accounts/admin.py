"""Accounts admin registration."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, CustomerProfile, PartnerProfile, PartnerVerification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "first_name", "last_name", "role", "is_active", "is_verified", "date_joined")
    list_filter = ("role", "is_active", "is_verified", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "date_joined", "updated_at", "last_login")

    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_verified", "is_phone_verified")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("date_joined", "updated_at", "last_login", "last_login_ip")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "role", "password1", "password2"),
        }),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "total_bookings", "created_at")
    search_fields = ("user__email", "user__first_name")
    raw_id_fields = ("user",)


@admin.register(PartnerProfile)
class PartnerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "is_online", "average_rating", "total_jobs_completed", "created_at")
    list_filter = ("status", "is_online")
    search_fields = ("user__email", "user__first_name")
    raw_id_fields = ("user", "approved_by")
    readonly_fields = ("average_rating", "total_reviews", "total_jobs_completed")

    actions = ["approve_partners", "reject_partners"]

    @admin.action(description="Approve selected partners")
    def approve_partners(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status__in=["PENDING", "UNDER_REVIEW"]).update(
            status=PartnerProfile.Status.APPROVED,
            approved_by=request.user,
            approved_at=timezone.now(),
        )
        self.message_user(request, f"{updated} partner(s) approved.")

    @admin.action(description="Reject selected partners")
    def reject_partners(self, request, queryset):
        queryset.update(status=PartnerProfile.Status.REJECTED)
        self.message_user(request, "Selected partners rejected.")


@admin.register(PartnerVerification)
class PartnerVerificationAdmin(admin.ModelAdmin):
    list_display = ("partner", "document_type", "status", "submitted_at", "reviewed_at")
    list_filter = ("status", "document_type")
    search_fields = ("partner__user__email",)
    raw_id_fields = ("partner", "reviewed_by")
