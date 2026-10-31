"""
Tests for the matching app — partner discovery, scoring, batch dispatch, timeout retries.
"""
import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch

from apps.bookings.models import Booking, BookingOffer, BookingStatusHistory
from apps.matching.services import (
    find_eligible_partners,
    dispatch_batch_offers,
    handle_batch_timeout,
    trigger_matching_cycle,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Partner Discovery / Scoring
# ═══════════════════════════════════════════════════════════════════════════════

class TestFindEligiblePartners:

    def test_finds_eligible_partner(self, booking, partner_service, partner_profile):
        candidates = find_eligible_partners(booking, radius_km=50.0)
        partner_ids = [p.id for p, _, _ in candidates]
        assert partner_profile.id in partner_ids

    def test_excludes_unapproved_partner(self, booking, partner_service, partner_profile):
        from apps.accounts.models import PartnerProfile
        partner_profile.status = PartnerProfile.Status.PENDING
        partner_profile.save()
        candidates = find_eligible_partners(booking, radius_km=50.0)
        partner_ids = [p.id for p, _, _ in candidates]
        assert partner_profile.id not in partner_ids

    def test_excludes_offline_partner(self, booking, partner_service, partner_profile):
        partner_profile.is_online = False
        partner_profile.save()
        candidates = find_eligible_partners(booking, radius_km=50.0)
        partner_ids = [p.id for p, _, _ in candidates]
        assert partner_profile.id not in partner_ids

    def test_excludes_already_offered_partners(self, booking, partner_service, partner_profile):
        # Create a previous offer
        BookingOffer.objects.create(
            booking=booking,
            partner=partner_profile,
            status=BookingOffer.OfferStatus.REJECTED,
            batch_number=1,
            expires_at=timezone.now() + timedelta(seconds=45),
        )
        candidates = find_eligible_partners(booking, radius_km=50.0)
        partner_ids = [p.id for p, _, _ in candidates]
        assert partner_profile.id not in partner_ids

    def test_returns_sorted_by_score(
        self, booking, partner_service, partner_profile,
        second_partner_service, second_partner_profile,
    ):
        # Give first partner better rating
        partner_profile.average_rating = Decimal("4.9")
        partner_profile.total_jobs_completed = 50
        partner_profile.save()

        second_partner_profile.average_rating = Decimal("3.5")
        second_partner_profile.total_jobs_completed = 2
        second_partner_profile.save()

        candidates = find_eligible_partners(booking, radius_km=50.0)
        if len(candidates) >= 2:
            # First candidate should have higher score
            assert candidates[0][2] >= candidates[1][2]

    def test_respects_radius_limit(self, booking, partner_service, partner_profile):
        # With very small radius, should not find partners
        candidates = find_eligible_partners(booking, radius_km=0.001)
        assert len(candidates) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# Batch Offer Dispatch
# ═══════════════════════════════════════════════════════════════════════════════

class TestDispatchBatchOffers:

    def test_dispatch_creates_offers(self, booking, partner_service, partner_profile):
        candidates = find_eligible_partners(booking, radius_km=50.0)
        offers = dispatch_batch_offers(booking, candidates, batch_number=1)
        assert len(offers) > 0
        assert all(o.status == BookingOffer.OfferStatus.PENDING for o in offers)

    def test_dispatch_updates_booking_to_matching(self, booking, partner_service, partner_profile):
        candidates = find_eligible_partners(booking, radius_km=50.0)
        dispatch_batch_offers(booking, candidates, batch_number=1)
        booking.refresh_from_db()
        assert booking.status == Booking.Status.MATCHING

    def test_dispatch_skips_already_matched_booking(self, matched_booking, partner_service, partner_profile):
        candidates = [(partner_profile, 1.5, 4.5)]
        offers = dispatch_batch_offers(matched_booking, candidates, batch_number=1)
        assert len(offers) == 0

    def test_dispatch_creates_status_history(self, booking, partner_service, partner_profile):
        candidates = find_eligible_partners(booking, radius_km=50.0)
        dispatch_batch_offers(booking, candidates, batch_number=1)
        history = BookingStatusHistory.objects.filter(
            booking=booking, to_status="MATCHING"
        )
        assert history.exists()


# ═══════════════════════════════════════════════════════════════════════════════
# Batch Timeout & Retry
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchTimeout:

    def test_timeout_expires_pending_offers(self, booking, partner_service, partner_profile):
        candidates = find_eligible_partners(booking, radius_km=50.0)
        offers = dispatch_batch_offers(booking, candidates, batch_number=1)

        # Manually expire all offers
        BookingOffer.objects.filter(booking=booking).update(
            expires_at=timezone.now() - timedelta(seconds=10)
        )

        handle_batch_timeout(str(booking.id), batch_number=1)

        for offer in BookingOffer.objects.filter(booking=booking, batch_number=1):
            assert offer.status in [
                BookingOffer.OfferStatus.EXPIRED,
                BookingOffer.OfferStatus.CANCELLED,
            ]

    def test_timeout_skips_already_matched_booking(self, matched_booking):
        # Should return early without changing anything
        handle_batch_timeout(str(matched_booking.id), batch_number=1)
        matched_booking.refresh_from_db()
        assert matched_booking.status == Booking.Status.MATCHED

    def test_timeout_sets_no_partners_on_max_attempts(self, booking, partner_service, partner_profile):
        # Exhaust all retry attempts
        candidates = find_eligible_partners(booking, radius_km=50.0)
        dispatch_batch_offers(booking, candidates, batch_number=1)

        # Mark offers expired
        BookingOffer.objects.filter(booking=booking).update(
            expires_at=timezone.now() - timedelta(seconds=10)
        )

        # Simulate max attempts reached
        handle_batch_timeout(str(booking.id), batch_number=3)
        booking.refresh_from_db()
        assert booking.status == Booking.Status.NO_PARTNERS


# ═══════════════════════════════════════════════════════════════════════════════
# Trigger Matching Cycle (Entry Point)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestTriggerMatchingCycle:

    def test_trigger_matching_with_candidates(self, booking, partner_service, partner_profile):
        result = trigger_matching_cycle(str(booking.id))
        assert result["success"] is True
        assert result["offers_count"] > 0

    def test_trigger_matching_no_partners(self, booking, service_category):
        # No partner registered for this category
        result = trigger_matching_cycle(str(booking.id))
        assert result["success"] is False

    def test_trigger_matching_invalid_booking(self):
        import uuid
        result = trigger_matching_cycle(str(uuid.uuid4()))
        assert result["success"] is False
        assert "not found" in result["error"].lower()

    def test_trigger_matching_wrong_status(self, completed_booking):
        result = trigger_matching_cycle(str(completed_booking.id))
        assert result["success"] is False


# ═══════════════════════════════════════════════════════════════════════════════
# Matching API Views
# ═══════════════════════════════════════════════════════════════════════════════

class TestMatchingViews:

    def test_trigger_match_endpoint(self, admin_api_client, booking, partner_service, partner_profile):
        response = admin_api_client.post(
            "/api/v1/matching/trigger/",
            {"booking_id": str(booking.id)},
            format="json",
        )
        assert response.status_code in [200, 201]
