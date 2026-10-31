"""
services app serializers — ServiceCategory, PartnerService.
"""
from rest_framework import serializers
from .models import ServiceCategory, ServiceSubcategory, PartnerService


class ServiceSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceSubcategory
        fields = ["id", "name", "slug", "description", "additional_price", "is_active"]


class ServiceCategorySerializer(serializers.ModelSerializer):
    subcategories = ServiceSubcategorySerializer(many=True, read_only=True)
    partner_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = [
            "id", "name", "slug", "description", "icon", "image",
            "base_price", "price_per_hour", "estimated_duration_minutes",
            "is_active", "display_order", "subcategories", "partner_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_partner_count(self, obj):
        return obj.partner_services.filter(
            is_active=True,
            partner__status="APPROVED",
            partner__is_online=True,
        ).count()


class ServiceCategoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for category lists (no subcategories)."""
    class Meta:
        model = ServiceCategory
        fields = [
            "id", "name", "slug", "icon", "image",
            "base_price", "estimated_duration_minutes", "display_order",
        ]


class PartnerServiceSerializer(serializers.ModelSerializer):
    category = ServiceCategoryListSerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True)
    effective_price = serializers.ReadOnlyField()

    class Meta:
        model = PartnerService
        fields = [
            "id", "category", "category_id", "custom_price",
            "experience_years", "is_active", "effective_price", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        category_id = validated_data.pop("category_id")
        try:
            category = ServiceCategory.objects.get(id=category_id, is_active=True)
        except ServiceCategory.DoesNotExist:
            raise serializers.ValidationError({"category_id": "Service category not found or inactive."})
        return PartnerService.objects.create(category=category, **validated_data)
