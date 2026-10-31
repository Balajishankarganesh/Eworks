"""
bookings app serializers — BookingCreate, BookingList, BookingDetail, BookingCancel, BookingOffer.
"""
import random
from django.utils import timezone
from rest_framework import serializers
from apps.services.models import ServiceCategory
from apps.locations.models import ServiceAddress
from .models import Booking, BookingOffer, BookingStatusHistory


class BookingStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.get_full_name", read_only=True)

    class Meta:
        model = BookingStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by_name", "notes", "created_at"]


class BookingCreateSerializer(serializers.ModelSerializer):
    service_category_id = serializers.UUIDField(write_only=True)
    service_address_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "service_category_id",
            "problem_description",
            "problem_photo",
            "booking_type",
            "service_address_id",
            "service_latitude",
            "service_longitude",
            "service_address_text",
            "scheduled_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        booking_type = attrs.get("booking_type", Booking.BookingType.INSTANT)
        scheduled_at = attrs.get("scheduled_at")

        if booking_type == Booking.BookingType.SCHEDULED:
            if not scheduled_at:
                raise serializers.ValidationError({"scheduled_at": "Scheduled time is required for scheduled bookings."})
            if scheduled_at <= timezone.now():
                raise serializers.ValidationError({"scheduled_at": "Scheduled time must be in the future."})

        # Validate category
        category_id = attrs.get("service_category_id")
        try:
            category = ServiceCategory.objects.get(id=category_id, is_active=True)
            attrs["service_category"] = category
        except ServiceCategory.DoesNotExist:
            raise serializers.ValidationError({"service_category_id": "Service category not found or inactive."})

        # Validate address / coordinates
        address_id = attrs.get("service_address_id")
        if address_id:
            try:
                address = ServiceAddress.objects.get(id=address_id)
                attrs["service_address"] = address
                attrs["service_latitude"] = address.latitude
                attrs["service_longitude"] = address.longitude
                attrs["service_address_text"] = f"{address.address_line_1}, {address.city}, {address.pincode}"
            except ServiceAddress.DoesNotExist:
                raise serializers.ValidationError({"service_address_id": "Service address not found."})
        elif not (attrs.get("service_latitude") and attrs.get("service_longitude")):
            raise serializers.ValidationError(
                {"service_address_id": "Either a saved address or GPS coordinates must be provided."}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("service_category_id", None)
        validated_data.pop("service_address_id", None)
        customer = self.context["request"].user.customer_profile
        category = validated_data["service_category"]

        # Generate 4-digit job start OTP
        otp = f"{random.randint(1000, 9999)}"

        booking = Booking.objects.create(
            customer=customer,
            quoted_price=category.base_price,
            estimated_duration_minutes=category.estimated_duration_minutes,
            job_start_otp=otp,
            **validated_data,
        )

        # Audit initial status
        BookingStatusHistory.objects.create(
            booking=booking,
            from_status="",
            to_status=booking.status,
            changed_by=self.context["request"].user,
            notes="Booking initiated",
        )

        return booking


class BookingListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="service_category.name", read_only=True)
    category_icon = serializers.CharField(source="service_category.icon", read_only=True)
    partner_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.user.get_full_name", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_type",
            "status",
            "category_name",
            "category_icon",
            "partner_name",
            "customer_name",
            "service_address_text",
            "quoted_price",
            "final_price",
            "scheduled_at",
            "created_at",
        ]

    def get_partner_name(self, obj):
        if obj.partner and obj.partner.user:
            return obj.partner.user.get_full_name()
        return None


class BookingDetailSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    partner_details = serializers.SerializerMethodField()
    customer_details = serializers.SerializerMethodField()
    status_history = BookingStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_type",
            "status",
            "category",
            "problem_description",
            "problem_photo",
            "service_address_text",
            "service_latitude",
            "service_longitude",
            "scheduled_at",
            "estimated_duration_minutes",
            "quoted_price",
            "final_price",
            "job_start_otp",
            "cancellation_reason",
            "partner_details",
            "customer_details",
            "status_history",
            "created_at",
            "confirmed_at",
            "started_at",
            "completed_at",
        ]

    def get_category(self, obj):
        return {
            "id": str(obj.service_category.id),
            "name": obj.service_category.name,
            "icon": obj.service_category.icon,
            "base_price": str(obj.service_category.base_price),
        }

    def get_partner_details(self, obj):
        if not obj.partner:
            return None
        return {
            "id": str(obj.partner.id),
            "name": obj.partner.user.get_full_name(),
            "phone": obj.partner.user.phone,
            "rating": str(obj.partner.average_rating),
            "total_jobs": obj.partner.total_completed_jobs,
        }

    def get_customer_details(self, obj):
        return {
            "id": str(obj.customer.id),
            "name": obj.customer.user.get_full_name(),
            "phone": obj.customer.user.phone,
        }


class BookingCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=True)


class BookingOfferSerializer(serializers.ModelSerializer):
    booking_id = serializers.UUIDField(source="booking.id", read_only=True)
    category_name = serializers.CharField(source="booking.service_category.name", read_only=True)
    problem_description = serializers.CharField(source="booking.problem_description", read_only=True)
    service_address_text = serializers.CharField(source="booking.service_address_text", read_only=True)
    quoted_price = serializers.DecimalField(source="booking.quoted_price", max_digits=10, decimal_places=2, read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = BookingOffer
        fields = [
            "id",
            "booking_id",
            "category_name",
            "problem_description",
            "service_address_text",
            "quoted_price",
            "status",
            "batch_number",
            "expires_at",
            "is_expired",
            "created_at",
        ]
