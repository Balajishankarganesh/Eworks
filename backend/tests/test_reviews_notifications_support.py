"""
Tests for reviews, notifications, and support apps.
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status

from apps.reviews.models import Review
from apps.notifications.models import Notification
from apps.support.models import SupportTicket, AuditLog


# ═══════════════════════════════════════════════════════════════════════════════
# Reviews Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreateReview:
    """POST /api/v1/reviews/"""

    url = "/api/v1/reviews/"

    def test_create_review_success(self, customer_api_client, completed_booking):
        data = {
            "booking_id": str(completed_booking.id),
            "rating": 5,
            "comment": "Excellent electrician, very professional!",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["review"]["rating"] == 5

    def test_create_review_updates_partner_rating(self, customer_api_client, completed_booking, partner_profile):
        data = {
            "booking_id": str(completed_booking.id),
            "rating": 4,
            "comment": "Good work",
        }
        customer_api_client.post(self.url, data, format="json")
        partner_profile.refresh_from_db()
        assert partner_profile.average_rating == Decimal("4.00")
        assert partner_profile.total_reviews == 1

    def test_cannot_review_non_completed_booking(self, customer_api_client, booking):
        data = {
            "booking_id": str(booking.id),
            "rating": 5,
            "comment": "Too early",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_double_review(self, customer_api_client, completed_booking, review):
        data = {
            "booking_id": str(completed_booking.id),
            "rating": 3,
            "comment": "Second review attempt",
        }
        response = customer_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_partner_cannot_create_review(self, partner_api_client, completed_booking):
        data = {
            "booking_id": str(completed_booking.id),
            "rating": 5,
            "comment": "Self-review attempt",
        }
        response = partner_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestPartnerReviewsList:
    """GET /api/v1/reviews/partner/<uuid>/"""

    def test_list_partner_reviews(self, anon_api_client, partner_profile, review):
        response = anon_api_client.get(f"/api/v1/reviews/partner/{partner_profile.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert "rating_distribution" in response.data
        assert response.data["total_reviews"] >= 1

    def test_list_reviews_public(self, anon_api_client, partner_profile):
        """Reviews list should be accessible without auth."""
        response = anon_api_client.get(f"/api/v1/reviews/partner/{partner_profile.id}/")
        assert response.status_code == status.HTTP_200_OK


class TestBookingReviewDetail:
    """GET /api/v1/reviews/booking/<uuid>/"""

    def test_get_booking_review(self, customer_api_client, completed_booking, review):
        response = customer_api_client.get(
            f"/api/v1/reviews/booking/{completed_booking.id}/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_reviewed"] is True

    def test_get_no_review(self, customer_api_client, completed_booking):
        response = customer_api_client.get(
            f"/api/v1/reviews/booking/{completed_booking.id}/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_reviewed"] is False


class TestReviewReply:
    """POST /api/v1/reviews/<uuid>/reply/"""

    def test_partner_reply_to_review(self, partner_api_client, review):
        response = partner_api_client.post(
            f"/api/v1/reviews/{review.id}/reply/",
            {"partner_reply": "Thank you for the kind words!"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.partner_reply == "Thank you for the kind words!"

    def test_customer_cannot_reply_to_review(self, customer_api_client, review):
        response = customer_api_client.post(
            f"/api/v1/reviews/{review.id}/reply/",
            {"partner_reply": "Not my job"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ═══════════════════════════════════════════════════════════════════════════════
# Notifications Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestNotifications:

    def test_notification_model(self, notification):
        assert notification.is_read is False
        assert str(notification.recipient.email) in str(notification)

    def test_notification_list(self, customer_api_client, notification):
        response = customer_api_client.get("/api/v1/notifications/")
        assert response.status_code == status.HTTP_200_OK

    def test_unread_count(self, customer_api_client, notification):
        response = customer_api_client.get("/api/v1/notifications/unread-count/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] >= 1

    def test_mark_notification_read(self, customer_api_client, notification):
        response = customer_api_client.post(
            f"/api/v1/notifications/{notification.id}/read/"
        )
        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is True

    def test_mark_all_read(self, customer_api_client, notification):
        response = customer_api_client.post("/api/v1/notifications/mark-all-read/")
        assert response.status_code == status.HTTP_200_OK


class TestBroadcastHelpers:
    """Test the broadcast utility functions with graceful fallback."""

    def test_broadcast_booking_update_no_crash(self, matched_booking):
        from apps.notifications.broadcast import broadcast_booking_update
        # Should not raise even without Redis
        broadcast_booking_update(matched_booking)

    def test_broadcast_user_notification_creates_record(self, customer_user):
        from apps.notifications.broadcast import broadcast_user_notification
        notif = broadcast_user_notification(
            user=customer_user,
            notification_type=Notification.NotificationType.SYSTEM,
            title="Test Broadcast",
            body="Testing broadcast helper",
        )
        if notif:
            assert Notification.objects.filter(id=notif.id).exists()

    def test_broadcast_partner_location_no_crash(self, matched_booking):
        from apps.notifications.broadcast import broadcast_partner_location
        broadcast_partner_location(
            matched_booking.id,
            latitude=13.0827,
            longitude=80.2707,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Support Ticket Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestSupportTickets:

    def test_create_ticket(self, customer_api_client, booking):
        response = customer_api_client.post(
            "/api/v1/support/tickets/",
            {
                "booking": str(booking.id),
                "category": "BOOKING_ISSUE",
                "subject": "Partner arrived late",
                "description": "The partner was 45 minutes late to the appointment.",
            },
            format="json",
        )
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    def test_list_tickets(self, customer_api_client, support_ticket):
        response = customer_api_client.get("/api/v1/support/tickets/")
        assert response.status_code == status.HTTP_200_OK

    def test_ticket_model_str(self, support_ticket):
        assert "Partner was late" in str(support_ticket)


# ═══════════════════════════════════════════════════════════════════════════════
# Audit Log Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuditLog:

    def test_log_action(self, admin_user, partner_user):
        from apps.support.audit import log_action
        log_action(
            actor=admin_user,
            action="PARTNER_APPROVED",
            target=partner_user,
            details={"reason": "All documents verified"},
        )
        log = AuditLog.objects.filter(actor=admin_user, action="PARTNER_APPROVED").first()
        assert log is not None
        assert log.details["reason"] == "All documents verified"

    def test_log_action_with_ip(self, admin_user, db):
        from apps.support.audit import log_action
        from unittest.mock import MagicMock

        mock_request = MagicMock()
        mock_request.META = {
            "REMOTE_ADDR": "192.168.1.100",
            "HTTP_USER_AGENT": "TestAgent/1.0",
        }
        log_action(
            actor=admin_user,
            action="TEST_ACTION",
            request=mock_request,
        )
        log = AuditLog.objects.filter(action="TEST_ACTION").first()
        assert log is not None
        assert log.ip_address == "192.168.1.100"
        assert log.user_agent == "TestAgent/1.0"

    def test_audit_log_immutable_ordering(self, admin_user, db):
        from apps.support.audit import log_action
        log_action(actor=admin_user, action="FIRST_ACTION")
        log_action(actor=admin_user, action="SECOND_ACTION")
        logs = list(AuditLog.objects.filter(actor=admin_user))
        # Newest first (ordering = ["-created_at"])
        assert logs[0].action == "SECOND_ACTION"
        assert logs[1].action == "FIRST_ACTION"
