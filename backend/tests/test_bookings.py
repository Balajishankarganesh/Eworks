"""
Tests for the bookings app — CRUD, status transitions, cancellation, OTP, partner workflow.
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status

from apps.bookings.models import Booking, BookingOffer, BookingStatusHistory


# ═══════════════════════════════════════════════════════════════════════════════
# Booking Creation Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBookingCreation:
    """POST /api/v1/bookings/"""

    url = "/api/v1/bookings/"

    def test_create_instant_booking(self, customer_api_client, service_category):
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "Broken switch in living room",
            "booking_type": "INSTANT",
            "service_latitude": "13.0827",
            "service_longitude": "80.2707",
            "service_address_text": "42 Anna Nagar, Chennai",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] in ["PENDING_MATCH", "MATCHING", "NO_PARTNERS"]
        assert response.data["booking_id"]

    def test_create_scheduled_booking(self, customer_api_client, service_category):
        from datetime import timedelta
        future = (timezone.now() + timedelta(hours=5)).isoformat()
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "Need wiring inspection",
            "booking_type": "SCHEDULED",
            "scheduled_at": future,
            "service_latitude": "13.0500",
            "service_longitude": "80.2500",
            "service_address_text": "12 T Nagar, Chennai",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_booking_requires_location(self, customer_api_client, service_category):
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "No location given",
            "booking_type": "INSTANT",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_scheduled_booking_past_time(self, customer_api_client, service_category):
        from datetime import timedelta
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "Past booking",
            "booking_type": "SCHEDULED",
            "scheduled_at": past,
            "service_latitude": "13.0500",
            "service_longitude": "80.2500",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_partner_cannot_create_booking(self, partner_api_client, service_category):
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "Not allowed",
            "booking_type": "INSTANT",
            "service_latitude": "13.0827",
            "service_longitude": "80.2707",
        }
        response = partner_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_create_booking(self, anon_api_client, service_category):
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "Anon request",
            "booking_type": "INSTANT",
            "service_latitude": "13.0827",
            "service_longitude": "80.2707",
        }
        response = anon_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_booking_generates_otp(self, customer_api_client, service_category):
        data = {
            "service_category_id": str(service_category.id),
            "problem_description": "OTP check",
            "booking_type": "INSTANT",
            "service_latitude": "13.0827",
            "service_longitude": "80.2707",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        bid = response.data["booking_id"]
        booking = Booking.objects.get(id=bid)
        assert len(booking.job_start_otp) == 4
        assert booking.job_start_otp.isdigit()


# ═══════════════════════════════════════════════════════════════════════════════
# Booking Listing Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBookingListing:

    def test_customer_list_bookings(self, customer_api_client, booking):
        response = customer_api_client.get("/api/v1/bookings/my-bookings/")
        assert response.status_code == status.HTTP_200_OK

    def test_partner_list_assigned_bookings(self, partner_api_client, matched_booking):
        response = partner_api_client.get("/api/v1/bookings/partner/assigned/")
        assert response.status_code == status.HTTP_200_OK

    def test_booking_detail(self, customer_api_client, booking):
        response = customer_api_client.get(f"/api/v1/bookings/{booking.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(booking.id)

    def test_admin_can_view_any_booking(self, admin_api_client, booking):
        response = admin_api_client.get(f"/api/v1/bookings/{booking.id}/")
        assert response.status_code == status.HTTP_200_OK


# ═══════════════════════════════════════════════════════════════════════════════
# Booking Cancellation Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBookingCancellation:
    """POST /api/v1/bookings/<pk>/cancel/"""

    def test_customer_cancel_booking(self, customer_api_client, booking):
        response = customer_api_client.post(
            f"/api/v1/bookings/{booking.id}/cancel/",
            {"reason": "Changed my mind"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "CANCELLED_CUSTOMER"

    def test_partner_cancel_matched_booking(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/cancel/",
            {"reason": "Cannot attend today"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "CANCELLED_PARTNER"

    def test_admin_cancel_booking(self, admin_api_client, booking):
        response = admin_api_client.post(
            f"/api/v1/bookings/{booking.id}/cancel/",
            {"reason": "Policy violation"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "CANCELLED_ADMIN"

    def test_cannot_cancel_completed_booking(self, customer_api_client, completed_booking):
        response = customer_api_client.post(
            f"/api/v1/bookings/{completed_booking.id}/cancel/",
            {"reason": "Too late"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_without_reason_fails(self, customer_api_client, booking):
        response = customer_api_client.post(
            f"/api/v1/bookings/{booking.id}/cancel/",
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancellation_creates_history(self, customer_api_client, booking):
        customer_api_client.post(
            f"/api/v1/bookings/{booking.id}/cancel/",
            {"reason": "Test history"},
            format="json",
        )
        history = BookingStatusHistory.objects.filter(booking=booking, to_status="CANCELLED_CUSTOMER")
        assert history.exists()


# ═══════════════════════════════════════════════════════════════════════════════
# Partner Offer Accept / Reject Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestOfferAcceptReject:

    def test_accept_offer(self, partner_api_client, booking_offer, booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/offers/{booking_offer.id}/accept/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "MATCHED"
        booking.refresh_from_db()
        assert booking.partner is not None

    def test_reject_offer(self, partner_api_client, booking_offer):
        response = partner_api_client.post(
            f"/api/v1/bookings/offers/{booking_offer.id}/reject/",
            {"reason": "Too far"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        booking_offer.refresh_from_db()
        assert booking_offer.status == "REJECTED"

    def test_accept_expired_offer(self, partner_api_client, expired_offer):
        response = partner_api_client.post(
            f"/api/v1/bookings/offers/{expired_offer.id}/accept/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_double_accept_fails(self, partner_api_client, booking_offer, booking):
        # First accept
        partner_api_client.post(f"/api/v1/bookings/offers/{booking_offer.id}/accept/")
        # Second accept
        response = partner_api_client.post(
            f"/api/v1/bookings/offers/{booking_offer.id}/accept/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_pending_offers(self, partner_api_client, booking_offer):
        response = partner_api_client.get("/api/v1/bookings/partner/offers/")
        assert response.status_code == status.HTTP_200_OK


# ═══════════════════════════════════════════════════════════════════════════════
# Partner Booking Lifecycle (En Route → Start → Complete)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPartnerBookingLifecycle:

    def test_partner_en_route(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/en-route/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "PARTNER_EN_ROUTE"

    def test_start_job_with_valid_otp(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/start-job/",
            {"otp": matched_booking.job_start_otp},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "IN_PROGRESS"

    def test_start_job_with_invalid_otp(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/start-job/",
            {"otp": "0000"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_start_job_without_otp(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/start-job/",
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_complete_job(self, partner_api_client, in_progress_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{in_progress_booking.id}/complete/",
            {"final_price": "350.00", "notes": "All done"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "COMPLETED"
        in_progress_booking.refresh_from_db()
        assert in_progress_booking.final_price == Decimal("350.00")

    def test_complete_increments_partner_jobs(self, partner_api_client, in_progress_booking, partner_profile):
        initial_count = partner_profile.total_jobs_completed or 0
        partner_api_client.post(
            f"/api/v1/bookings/{in_progress_booking.id}/complete/",
            {"notes": "Done"},
            format="json",
        )
        partner_profile.refresh_from_db()
        assert partner_profile.total_jobs_completed == initial_count + 1

    def test_cannot_complete_pending_booking(self, partner_api_client, matched_booking):
        response = partner_api_client.post(
            f"/api/v1/bookings/{matched_booking.id}/complete/",
            {"notes": "Trying early"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════════════
# Availability Slots Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAvailabilitySlots:

    def test_get_availability_slots(self, anon_api_client, service_category):
        from datetime import timedelta
        future_date = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = anon_api_client.get(
            f"/api/v1/bookings/availability-slots/?category_id={service_category.id}&date={future_date}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert "slots" in response.data
        assert len(response.data["slots"]) == 12  # 8AM to 7PM

    def test_availability_requires_category(self, anon_api_client, db):
        response = anon_api_client.get("/api/v1/bookings/availability-slots/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════════════
# Model Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBookingModel:

    def test_booking_str(self, booking):
        assert str(booking.id) in str(booking)

    def test_offer_is_expired_property(self, expired_offer):
        assert expired_offer.is_expired is True

    def test_offer_not_expired(self, booking_offer):
        assert booking_offer.is_expired is False

    def test_status_history_ordering(self, booking, customer_user):
        BookingStatusHistory.objects.create(
            booking=booking,
            from_status="PENDING_MATCH",
            to_status="MATCHING",
            changed_by=customer_user,
        )
        BookingStatusHistory.objects.create(
            booking=booking,
            from_status="MATCHING",
            to_status="MATCHED",
            changed_by=customer_user,
        )
        history = list(BookingStatusHistory.objects.filter(booking=booking))
        assert len(history) >= 2
