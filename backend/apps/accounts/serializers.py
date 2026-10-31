"""
Accounts serializers.
"""
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, CustomerProfile, PartnerProfile, PartnerVerification


# ── JWT customisation ─────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Add user role and id to the JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "role": self.user.role,
            "full_name": self.user.get_full_name(),
            "is_verified": self.user.is_verified,
        }
        return data


# ── User serializers ──────────────────────────────────────────────────────────

class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "phone", "avatar", "is_verified"]
        read_only_fields = ["id", "role", "is_verified"]

    def get_full_name(self, obj):
        return obj.get_full_name()


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "password", "password_confirm"]

    def validate(self, attrs):
        pw_confirm = attrs.pop("password_confirm", None)
        if pw_confirm is not None and attrs.get("password") != pw_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            **validated_data,
            role=User.Role.CUSTOMER,
        )
        return user


class PartnerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone", "password", "password_confirm"]

    def validate(self, attrs):
        pw_confirm = attrs.pop("password_confirm", None)
        if pw_confirm is not None and attrs.get("password") != pw_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            **validated_data,
            role=User.Role.PARTNER,
        )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])


# ── Profile serializers ───────────────────────────────────────────────────────

class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "user", "default_address", "default_latitude", "default_longitude",
            "total_bookings", "created_at", "updated_at",
        ]
        read_only_fields = ["user", "total_bookings", "created_at", "updated_at"]


class PartnerProfileSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PartnerProfile
        fields = [
            "id", "user", "status", "status_display", "bio", "years_of_experience",
            "is_online", "service_radius_km", "average_rating",
            "total_reviews", "total_jobs_completed", "created_at", "updated_at",
        ]
        read_only_fields = [
            "user", "status", "average_rating", "total_reviews",
            "total_jobs_completed", "created_at", "updated_at",
        ]


class PartnerDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerVerification
        fields = ["id", "document_type", "document_number", "document_file", "status", "submitted_at"]
        read_only_fields = ["id", "status", "submitted_at"]


class AdminPartnerListSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    pending_documents = serializers.SerializerMethodField()

    class Meta:
        model = PartnerProfile
        fields = [
            "id", "user", "status", "is_online", "average_rating",
            "total_jobs_completed", "pending_documents", "created_at",
        ]

    def get_pending_documents(self, obj):
        return obj.verifications.filter(status="PENDING").count()


class AdminApproveRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth token verification and login."""
    credential = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)
    access_token = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        default=User.Role.CUSTOMER,
        required=False,
    )

    def validate(self, attrs):
        token = attrs.get("credential") or attrs.get("id_token") or attrs.get("access_token")
        if not token:
            raise serializers.ValidationError("A Google 'credential', 'id_token', or 'access_token' is required.")
        return attrs

