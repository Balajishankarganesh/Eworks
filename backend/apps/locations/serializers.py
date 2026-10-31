"""locations app serializers."""
from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import ServiceAddress, PartnerLocation, PartnerAvailability


class ServiceAddressSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = ServiceAddress
        fields = [
            "id", "label", "address_line_1", "address_line_2",
            "city", "state", "pincode", "country",
            "latitude", "longitude", "lat", "lng", "is_default",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_lat(self, obj):
        return obj.latitude

    def get_lng(self, obj):
        return obj.longitude

    def validate(self, attrs):
        lat = attrs.pop("latitude", None)
        lng = attrs.pop("longitude", None)
        if lat is not None and lng is not None:
            attrs["location"] = Point(lng, lat, srid=4326)
        return attrs

    def create(self, validated_data):
        customer = self.context["request"].user.customer_profile
        # If set as default, clear other defaults
        if validated_data.get("is_default"):
            ServiceAddress.objects.filter(customer=customer).update(is_default=False)
        return ServiceAddress.objects.create(customer=customer, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            ServiceAddress.objects.filter(
                customer=instance.customer
            ).exclude(id=instance.id).update(is_default=False)
        return super().update(instance, validated_data)


class PartnerLocationSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = PartnerLocation
        fields = ["lat", "lng", "latitude", "longitude", "accuracy_meters", "updated_at"]
        read_only_fields = ["updated_at"]

    def get_lat(self, obj):
        return obj.latitude

    def get_lng(self, obj):
        return obj.longitude

    def validate(self, attrs):
        lat = attrs.pop("latitude")
        lng = attrs.pop("longitude")
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            raise serializers.ValidationError("Invalid coordinates.")
        attrs["location"] = Point(lng, lat, srid=4326)
        return attrs


class PartnerAvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = PartnerAvailability
        fields = ["id", "day_of_week", "day_display", "start_time", "end_time", "is_available"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError("start_time must be before end_time.")
        return attrs
