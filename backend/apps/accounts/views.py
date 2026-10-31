"""
Accounts views — registration, login, profiles, partner management.
"""
import logging
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.support.audit import log_action
from .models import User, CustomerProfile, PartnerProfile, PartnerVerification
from .permissions import IsAdmin, IsPartner, IsCustomer
from .serializers import (
    CustomTokenObtainPairSerializer,
    CustomerRegisterSerializer,
    PartnerRegisterSerializer,
    UserBasicSerializer,
    CustomerProfileSerializer,
    PartnerProfileSerializer,
    PartnerDocumentSerializer,
    AdminPartnerListSerializer,
    AdminApproveRejectSerializer,
    ChangePasswordSerializer,
    GoogleAuthSerializer,
)

logger = logging.getLogger(__name__)



class CustomerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/customer/ — public endpoint."""
    serializer_class = CustomerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Customer account created successfully.",
                "user": UserBasicSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PartnerRegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/partner/ — public endpoint."""
    serializer_class = PartnerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Partner account created. Awaiting admin verification.",
                "user": UserBasicSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — returns JWT pair with user info."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklist refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."})
        except Exception:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthView(APIView):
    """
    POST /api/v1/auth/google/
    Authenticate or register a user using Google OAuth credential (ID token) or access token.
    Accepts:
      - credential / id_token: Google ID token (JWT from Google Identity Services)
      - access_token: Google OAuth access token
      - role: "CUSTOMER" (default) or "PARTNER"
    Returns user info and JWT access/refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data.get("credential") or serializer.validated_data.get("id_token")
        access_token = serializer.validated_data.get("access_token")
        role = serializer.validated_data.get("role", User.Role.CUSTOMER)

        google_user_data = None

        if token:
            google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or ""
            # Try verification with google.oauth2.id_token
            try:
                from google.oauth2 import id_token as google_id_token
                from google.auth.transport import requests as google_requests

                req = google_requests.Request()
                audience = google_client_id if google_client_id else None
                google_user_data = google_id_token.verify_oauth2_token(token, req, audience=audience)
            except Exception as e:
                logger.warning("google.oauth2.id_token verification error: %s. Attempting tokeninfo fallback.", e)
                try:
                    resp = requests.get(
                        f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                        timeout=5
                    )
                    if resp.status_code == 200:
                        google_user_data = resp.json()
                    else:
                        raise AuthenticationFailed("Invalid or expired Google ID token.")
                except AuthenticationFailed:
                    raise
                except Exception as ex:
                    logger.error("Google tokeninfo endpoint error: %s", ex)
                    raise AuthenticationFailed("Could not verify Google authentication token.")

        elif access_token:
            try:
                resp = requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=5
                )
                if resp.status_code == 200:
                    google_user_data = resp.json()
                else:
                    raise AuthenticationFailed("Invalid Google access token.")
            except AuthenticationFailed:
                raise
            except Exception as e:
                logger.error("Google userinfo endpoint error: %s", e)
                raise AuthenticationFailed("Could not retrieve user information from Google.")

        if not google_user_data or not google_user_data.get("email"):
            raise AuthenticationFailed("Google authentication failed: Email address not returned.")

        email = google_user_data.get("email", "").strip().lower()
        if not email:
            raise AuthenticationFailed("Valid email address is required from Google.")

        first_name = (
            google_user_data.get("given_name")
            or (google_user_data.get("name", "").split()[0] if google_user_data.get("name") else "")
            or email.split("@")[0]
        )
        last_name = google_user_data.get("family_name") or ""
        if not last_name and google_user_data.get("name") and " " in google_user_data.get("name"):
            last_name = " ".join(google_user_data.get("name").split()[1:])

        created = False
        try:
            user = User.objects.get(email__iexact=email)
            if not user.is_active:
                return Response(
                    {"detail": "Your account has been deactivated. Please contact support."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.is_verified:
                user.is_verified = True
                user.save(update_fields=["is_verified"])
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                first_name=first_name[:100],
                last_name=last_name[:100],
                role=role if role in [User.Role.CUSTOMER, User.Role.PARTNER] else User.Role.CUSTOMER,
                is_verified=True,
            )
            user.set_unusable_password()
            user.save()
            created = True

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["email"] = user.email
        refresh["full_name"] = user.get_full_name()

        log_action(
            actor=user,
            action="GOOGLE_LOGIN" if not created else "GOOGLE_REGISTER",
            target=user,
            details={"email": user.email, "role": user.role, "created": created},
            request=request,
        )

        return Response(
            {
                "message": (
                    "Account created and logged in with Google."
                    if created
                    else "Successfully signed in with Google."
                ),
                "user": UserBasicSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )



class CurrentUserView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — view or update the authenticated user."""
    serializer_class = UserBasicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/customer-profile/"""
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get_object(self):
        return self.request.user.customer_profile


class PartnerProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/partner-profile/"""
    serializer_class = PartnerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def get_object(self):
        return self.request.user.partner_profile


class PartnerToggleOnlineView(APIView):
    """POST /api/v1/auth/partner/toggle-online/ — go online / offline."""
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request):
        profile = request.user.partner_profile
        if not profile.is_approved:
            return Response(
                {"error": "Your account is not yet approved by admin."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if "is_online" in request.data:
            profile.is_online = bool(request.data["is_online"])
        else:
            profile.is_online = not profile.is_online
        profile.save(update_fields=["is_online"])
        return Response(
            {"is_online": profile.is_online, "message": f"You are now {'online' if profile.is_online else 'offline'}."}
        )


class PartnerDocumentUploadView(generics.ListCreateAPIView):
    """GET/POST /api/v1/auth/partner/documents/"""
    serializer_class = PartnerDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def get_queryset(self):
        return self.request.user.partner_profile.verifications.all()

    def perform_create(self, serializer):
        serializer.save(partner=self.request.user.partner_profile)


class ChangePasswordView(APIView):
    """POST /api/v1/auth/password/change/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password changed successfully."})


# ── Admin views ───────────────────────────────────────────────────────────────

class AdminPartnerListView(generics.ListAPIView):
    """GET /api/v1/auth/admin/partners/ — list all partners (admin only)."""
    serializer_class = AdminPartnerListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filterset_fields = ["status", "is_online"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    ordering_fields = ["created_at", "average_rating"]

    def get_queryset(self):
        return PartnerProfile.objects.select_related("user").prefetch_related("verifications")


class AdminApprovePartnerView(APIView):
    """POST /api/v1/auth/admin/partners/<pk>/approve/"""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            partner = PartnerProfile.objects.get(user__id=pk)
        except PartnerProfile.DoesNotExist:
            return Response({"error": "Partner not found."}, status=status.HTTP_404_NOT_FOUND)

        partner.status = PartnerProfile.Status.APPROVED
        partner.approved_by = request.user
        partner.approved_at = timezone.now()
        partner.save(update_fields=["status", "approved_by", "approved_at"])

        log_action(request.user, "PARTNER_APPROVED", target=partner.user, details={"partner_id": str(pk)})

        return Response({"message": f"Partner {partner.user.email} approved."})


class AdminRejectPartnerView(APIView):
    """POST /api/v1/auth/admin/partners/<pk>/reject/"""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        serializer = AdminApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            partner = PartnerProfile.objects.get(user__id=pk)
        except PartnerProfile.DoesNotExist:
            return Response({"error": "Partner not found."}, status=status.HTTP_404_NOT_FOUND)

        partner.status = PartnerProfile.Status.REJECTED
        partner.rejection_reason = serializer.validated_data.get("reason", "")
        partner.save(update_fields=["status", "rejection_reason"])

        log_action(request.user, "PARTNER_REJECTED", target=partner.user, details={"reason": partner.rejection_reason})

        return Response({"message": f"Partner {partner.user.email} rejected."})


class PhoneSendOtpView(APIView):
    """
    POST /api/v1/auth/phone/send-otp/
    Generates and sends a 6-digit verification code via SMS and WhatsApp.
    Payload: { "phone": "+919876543210" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone_raw = str(request.data.get("phone", "")).strip()
        if not phone_raw:
            return Response(
                {"detail": "Please provide a valid phone number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import random
        from django.core.cache import cache
        from apps.notifications.sms import clean_phone_number, send_phone_verification_otp

        clean_phone = clean_phone_number(phone_raw)
        if len(clean_phone) != 10:
            return Response(
                {"detail": "Please provide a valid 10-digit Indian mobile number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = f"{random.randint(100000, 999999)}"
        cache.set(f"phone_otp_{clean_phone}", otp, timeout=300)

        # Dispatch via SMS & WhatsApp
        result = send_phone_verification_otp(clean_phone, otp)

        return Response({
            "message": f"Verification OTP sent to +91 {clean_phone} via SMS & WhatsApp.",
            "phone": clean_phone,
            "expires_in_seconds": 300,
        }, status=status.HTTP_200_OK)


class PhoneVerifyOtpView(APIView):
    """
    POST /api/v1/auth/phone/verify-otp/
    Verifies OTP, signs in existing user or creates new user, returns JWT tokens.
    Payload: { "phone": "9876543210", "otp": "123456", "role": "CUSTOMER" }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone_raw = str(request.data.get("phone", "")).strip()
        otp_input = str(request.data.get("otp", "")).strip()
        role = str(request.data.get("role", User.Role.CUSTOMER)).upper()

        if not phone_raw or not otp_input:
            return Response(
                {"detail": "Phone number and OTP code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.core.cache import cache
        from apps.notifications.sms import clean_phone_number

        clean_phone = clean_phone_number(phone_raw)
        cached_otp = cache.get(f"phone_otp_{clean_phone}")

        # Master demo OTP '123456' for rapid dev or match Redis cached OTP
        is_valid = (cached_otp and str(cached_otp) == otp_input) or otp_input == "123456"

        if not is_valid:
            return Response(
                {"detail": "Invalid or expired OTP. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache.delete(f"phone_otp_{clean_phone}")

        formatted_phone = f"+91{clean_phone}"
        user = User.objects.filter(phone=formatted_phone).first()
        if not user:
            user = User.objects.filter(phone=clean_phone).first()

        created = False
        if not user:
            placeholder_email = f"user_{clean_phone}@eworks.local"
            user = User.objects.create_user(
                email=placeholder_email,
                phone=formatted_phone,
                role=role if role in [User.Role.CUSTOMER, User.Role.PARTNER] else User.Role.CUSTOMER,
                first_name=f"User {clean_phone[-4:]}",
                is_phone_verified=True,
            )
            created = True
        else:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Phone number verified successfully!" if created else "Signed in successfully!",
            "is_new_user": created,
            "user": UserBasicSerializer(user).data,
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        }, status=status.HTTP_200_OK)
