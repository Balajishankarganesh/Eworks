"""
Tests for the accounts app — registration, login, JWT, profiles, role-based access.
"""
import pytest
from django.urls import reverse
from rest_framework import status


# ═══════════════════════════════════════════════════════════════════════════════
# Registration Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestCustomerRegistration:
    """POST /api/v1/auth/register/customer/"""

    url = "/api/v1/auth/register/customer/"

    def test_register_customer_success(self, anon_api_client, db):
        data = {
            "email": "newcustomer@test.com",
            "first_name": "New",
            "last_name": "Customer",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "tokens" in response.data
        assert response.data["tokens"]["access"]
        assert response.data["tokens"]["refresh"]
        assert response.data["user"]["role"] == "CUSTOMER"

    def test_register_customer_password_mismatch(self, anon_api_client, db):
        data = {
            "email": "badpass@test.com",
            "first_name": "Bad",
            "password": "StrongPass123!",
            "password_confirm": "DifferentPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_customer_duplicate_email(self, anon_api_client, customer_user):
        data = {
            "email": "customer@test.com",
            "first_name": "Dup",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_customer_weak_password(self, anon_api_client, db):
        data = {
            "email": "weakpass@test.com",
            "first_name": "Weak",
            "password": "123",
            "password_confirm": "123",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_customer_creates_profile(self, anon_api_client, db):
        from apps.accounts.models import CustomerProfile
        data = {
            "email": "profilecheck@test.com",
            "first_name": "Profile",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        user_id = response.data["user"]["id"]
        assert CustomerProfile.objects.filter(user__id=user_id).exists()


class TestPartnerRegistration:
    """POST /api/v1/auth/register/partner/"""

    url = "/api/v1/auth/register/partner/"

    def test_register_partner_success(self, anon_api_client, db):
        data = {
            "email": "newpartner@test.com",
            "first_name": "New",
            "last_name": "Partner",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["user"]["role"] == "PARTNER"

    def test_register_partner_creates_pending_profile(self, anon_api_client, db):
        from apps.accounts.models import PartnerProfile
        data = {
            "email": "pendingpartner@test.com",
            "first_name": "Pending",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        profile = PartnerProfile.objects.get(user__email="pendingpartner@test.com")
        assert profile.status == PartnerProfile.Status.PENDING


# ═══════════════════════════════════════════════════════════════════════════════
# Login / JWT Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestLogin:
    """POST /api/v1/auth/login/"""

    url = "/api/v1/auth/login/"

    def test_login_success(self, anon_api_client, customer_user):
        data = {"email": "customer@test.com", "password": "TestPass123!"}
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["role"] == "CUSTOMER"

    def test_login_wrong_password(self, anon_api_client, customer_user):
        data = {"email": "customer@test.com", "password": "WrongPassword!"}
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, anon_api_client, db):
        data = {"email": "nobody@test.com", "password": "SomePass123!"}
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogout:
    """POST /api/v1/auth/logout/"""

    url = "/api/v1/auth/logout/"

    def test_logout_success(self, customer_api_client, customer_user):
        from tests.conftest import get_tokens_for_user
        tokens = get_tokens_for_user(customer_user)
        response = customer_api_client.post(
            self.url, {"refresh": tokens["refresh"]}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_logout_invalid_token(self, customer_api_client):
        response = customer_api_client.post(
            self.url, {"refresh": "invalid-token"}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════════════
# Profile & Auth Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestCurrentUser:
    """GET /api/v1/auth/me/"""

    url = "/api/v1/auth/me/"

    def test_get_current_user(self, customer_api_client, customer_user):
        response = customer_api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == "customer@test.com"
        assert response.data["role"] == "CUSTOMER"

    def test_unauthenticated_access_denied(self, anon_api_client):
        response = anon_api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_name(self, customer_api_client, customer_user):
        response = customer_api_client.patch(
            self.url, {"first_name": "Updated"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        customer_user.refresh_from_db()
        assert customer_user.first_name == "Updated"


class TestPartnerToggleOnline:
    """POST /api/v1/auth/partner/toggle-online/"""

    url = "/api/v1/auth/partner/toggle-online/"

    def test_toggle_online_approved_partner(self, partner_api_client, partner_profile):
        response = partner_api_client.post(self.url)
        assert response.status_code == status.HTTP_200_OK
        partner_profile.refresh_from_db()
        # Should toggle from True (set in fixture) to False
        assert response.data["is_online"] is False

    def test_toggle_online_unapproved_partner(self, partner_api_client, partner_user):
        # Profile is PENDING by default (not using partner_profile fixture)
        response = partner_api_client.post(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_customer_cannot_toggle_online(self, customer_api_client):
        response = customer_api_client.post(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestChangePassword:
    """POST /api/v1/auth/password/change/"""

    url = "/api/v1/auth/password/change/"

    def test_change_password_success(self, customer_api_client, customer_user):
        data = {
            "old_password": "TestPass123!",
            "new_password": "NewStrongPass456!",
            "new_password_confirm": "NewStrongPass456!",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        customer_user.refresh_from_db()
        assert customer_user.check_password("NewStrongPass456!")

    def test_change_password_wrong_old(self, customer_api_client):
        data = {
            "old_password": "WrongOldPassword!",
            "new_password": "NewStrongPass456!",
            "new_password_confirm": "NewStrongPass456!",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════════════
# Admin Partner Management Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdminPartnerManagement:
    """Admin partner approval / rejection endpoints."""

    def test_admin_list_partners(self, admin_api_client, partner_profile):
        response = admin_api_client.get("/api/v1/auth/admin/partners/")
        assert response.status_code == status.HTTP_200_OK

    def test_admin_approve_partner(self, admin_api_client, partner_user):
        url = f"/api/v1/auth/admin/partners/{partner_user.id}/approve/"
        response = admin_api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        partner_user.partner_profile.refresh_from_db()
        assert partner_user.partner_profile.status == "APPROVED"

    def test_admin_reject_partner(self, admin_api_client, partner_user):
        url = f"/api/v1/auth/admin/partners/{partner_user.id}/reject/"
        response = admin_api_client.post(
            url, {"reason": "Incomplete documents"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        partner_user.partner_profile.refresh_from_db()
        assert partner_user.partner_profile.status == "REJECTED"

    def test_customer_cannot_access_admin_endpoints(self, customer_api_client, partner_user):
        response = customer_api_client.get("/api/v1/auth/admin/partners/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_partner_cannot_approve_self(self, partner_api_client, partner_user):
        url = f"/api/v1/auth/admin/partners/{partner_user.id}/approve/"
        response = partner_api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ═══════════════════════════════════════════════════════════════════════════════
# Google OAuth Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestGoogleAuth:
    """POST /api/v1/auth/google/"""

    url = "/api/v1/auth/google/"

    def test_google_auth_missing_tokens(self, anon_api_client, db):
        response = anon_api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_google_auth_new_customer(self, anon_api_client, db, monkeypatch):
        fake_payload = {
            "email": "googlenew@example.com",
            "given_name": "Google",
            "family_name": "User",
            "name": "Google User",
            "email_verified": True,
            "sub": "1234567890",
        }

        # Mock google_id_token verification
        from google.oauth2 import id_token as google_id_token
        monkeypatch.setattr(
            google_id_token,
            "verify_oauth2_token",
            lambda token, req, audience=None: fake_payload,
        )

        response = anon_api_client.post(
            self.url,
            {"credential": "mock-valid-google-id-token", "role": "CUSTOMER"},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["created"] is True
        assert "tokens" in response.data
        assert response.data["user"]["email"] == "googlenew@example.com"
        assert response.data["user"]["role"] == "CUSTOMER"
        assert response.data["user"]["is_verified"] is True

    def test_google_auth_existing_user_login(self, anon_api_client, customer_user, monkeypatch):
        fake_payload = {
            "email": customer_user.email,
            "given_name": customer_user.first_name,
            "family_name": customer_user.last_name,
            "name": customer_user.get_full_name(),
            "email_verified": True,
            "sub": "987654321",
        }

        from google.oauth2 import id_token as google_id_token
        monkeypatch.setattr(
            google_id_token,
            "verify_oauth2_token",
            lambda token, req, audience=None: fake_payload,
        )

        response = anon_api_client.post(
            self.url,
            {"credential": "mock-existing-google-id-token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] is False
        assert "tokens" in response.data
        assert response.data["user"]["email"] == customer_user.email

    def test_google_auth_invalid_token(self, anon_api_client, db, monkeypatch):
        from google.oauth2 import id_token as google_id_token
        def raise_auth_error(*args, **kwargs):
            raise ValueError("Token invalid")

        monkeypatch.setattr(google_id_token, "verify_oauth2_token", raise_auth_error)

        import requests
        class MockResp:
            status_code = 400
            def json(self):
                return {"error": "invalid_token"}

        monkeypatch.setattr(requests, "get", lambda *args, **kwargs: MockResp())

        response = anon_api_client.post(
            self.url,
            {"credential": "invalid-token"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

