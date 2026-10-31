"""Accounts URL patterns."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import views

urlpatterns = [
    # Registration
    path("register/customer/", views.CustomerRegisterView.as_view(), name="customer-register"),
    path("register/partner/", views.PartnerRegisterView.as_view(), name="partner-register"),

    # Auth
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("google/", views.GoogleAuthView.as_view(), name="google-auth"),
    path("phone/send-otp/", views.PhoneSendOtpView.as_view(), name="phone-send-otp"),
    path("phone/verify-otp/", views.PhoneVerifyOtpView.as_view(), name="phone-verify-otp"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),

    # Profiles
    path("me/", views.CurrentUserView.as_view(), name="current-user"),
    path("me/customer-profile/", views.CustomerProfileView.as_view(), name="customer-profile"),
    path("me/partner-profile/", views.PartnerProfileView.as_view(), name="partner-profile"),

    # Partner operations
    path("partner/toggle-online/", views.PartnerToggleOnlineView.as_view(), name="partner-toggle-online"),
    path("me/toggle-online/", views.PartnerToggleOnlineView.as_view(), name="me-toggle-online"),
    path("partner/documents/", views.PartnerDocumentUploadView.as_view(), name="partner-documents"),

    # Password
    path("password/change/", views.ChangePasswordView.as_view(), name="password-change"),

    # Admin — partner management
    path("admin/partners/", views.AdminPartnerListView.as_view(), name="admin-partner-list"),
    path("admin/partners/<uuid:pk>/approve/", views.AdminApprovePartnerView.as_view(), name="admin-approve-partner"),
    path("admin/partners/<uuid:pk>/reject/", views.AdminRejectPartnerView.as_view(), name="admin-reject-partner"),
]
