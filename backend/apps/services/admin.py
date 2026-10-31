"""services admin."""
from django.contrib import admin
from .models import ServiceCategory, ServiceSubcategory, PartnerService


class SubcategoryInline(admin.TabularInline):
    model = ServiceSubcategory
    extra = 1
    fields = ["name", "slug", "additional_price", "is_active"]


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "base_price", "estimated_duration_minutes", "is_active", "display_order"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["display_order"]
    inlines = [SubcategoryInline]


@admin.register(PartnerService)
class PartnerServiceAdmin(admin.ModelAdmin):
    list_display = ["partner", "category", "custom_price", "is_active", "created_at"]
    list_filter = ["is_active", "category"]
    search_fields = ["partner__user__email", "category__name"]
    raw_id_fields = ["partner", "category"]
