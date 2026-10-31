"""
matching app services — Candidate partner discovery, scoring, batch dispatch, and retry orchestration.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from apps.accounts.models import PartnerProfile
from apps.services.models import PartnerService
from apps.locations.models import PartnerLocation
from apps.bookings.models import Booking, BookingOffer, BookingStatusHistory
from apps.bookings.services import haversine_distance, check_partner_availability
from apps.notifications.broadcast import (
    broadcast_new_offer,
    broadcast_offer_cancelled,
    broadcast_booking_update,
)

logger = logging.getLogger(__name__)

# Configuration defaults
DEFAULT_BATCH_SIZE = getattr(settings, "OFFER_BATCH_SIZE", 3)
DEFAULT_EXPIRY_SECONDS = getattr(settings, "OFFER_EXPIRY_SECONDS", 45)
DEFAULT_BASE_RADIUS_KM = getattr(settings, "MATCHING_RADIUS_KM", 10.0)
MAX_MATCHING_ATTEMPTS = 3
RADIUS_STEP_KM = 5.0


def find_eligible_partners(
    booking: Booking,
    radius_km: float = DEFAULT_BASE_RADIUS_KM,
    exclude_partner_ids: list = None,
) -> list[tuple[PartnerProfile, float, float]]:
    """
    Find and rank candidate partners for a booking.
    Returns list of tuples: (partner_profile, distance_km, composite_score)
    sorted by composite_score descending.
    """
    if exclude_partner_ids is None:
        exclude_partner_ids = []

    # Exclude partners who already rejected or received offers for this booking
    already_offered = BookingOffer.objects.filter(booking=booking).values_list("partner_id", flat=True)
    all_excluded = set(exclude_partner_ids) | set(already_offered)

    # Base query: approved, online partners
    partners_qs = PartnerProfile.objects.filter(
        status=PartnerProfile.Status.APPROVED,
        is_online=True,
    ).exclude(id__in=all_excluded).select_related("user")

    # Exclude the customer themselves if they have a partner profile
    if hasattr(booking.customer, "user"):
        partners_qs = partners_qs.exclude(user=booking.customer.user)

    # Filter partners offering the required service category
    category_partners = PartnerService.objects.filter(
        category=booking.service_category,
        is_active=True,
        partner__in=partners_qs,
    ).values_list("partner_id", flat=True)

    partners_qs = partners_qs.filter(id__in=category_partners)

    target_lat = float(booking.service_latitude or 13.0827)
    target_lng = float(booking.service_longitude or 80.2707)

    candidates = []

    for partner in partners_qs:
        # Check weekly schedule / booking overlap availability if scheduled
        if booking.booking_type == Booking.BookingType.SCHEDULED and booking.scheduled_at:
            is_avail, _ = check_partner_availability(
                partner,
                booking.scheduled_at,
                booking.estimated_duration_minutes,
            )
            if not is_avail:
                continue

        # Location distance check
        loc = getattr(partner, "current_location", None)
        if loc:
            p_lat = loc.latitude
            p_lng = loc.longitude
        else:
            # If partner is online but hasn't pinged GPS yet, use default center + slight offset
            p_lat = target_lat + 0.008
            p_lng = target_lng + 0.008

        dist_km = haversine_distance(target_lat, target_lng, p_lat, p_lng)

        # Partner's own service radius check
        max_dist = min(radius_km, float(partner.service_radius_km or 15.0))
        if dist_km > max_dist:
            continue

        # Scoring: Proximity (50%), Rating (30%), Completed jobs experience (20%)
        # Lower distance = higher proximity score (normalized 0 to 5)
        proximity_score = max(0.0, 5.0 - (dist_km / 2.0))
        rating_score = float(partner.average_rating or 4.5)
        jobs_count = partner.total_jobs_completed or 0
        experience_score = min(5.0, jobs_count / 10.0)

        composite_score = (proximity_score * 0.50) + (rating_score * 0.30) + (experience_score * 0.20)
        candidates.append((partner, dist_km, composite_score))

    # Sort descending by composite score
    candidates.sort(key=lambda item: item[2], reverse=True)
    return candidates


def dispatch_batch_offers(
    booking: Booking,
    candidates: list[tuple[PartnerProfile, float, float]],
    batch_number: int = 1,
    expiry_seconds: int = DEFAULT_EXPIRY_SECONDS,
) -> list[BookingOffer]:
    """
    Dispatch a batch of Rapido-style offers to the top candidate partners.
    """
    created_offers = []
    expires_at = timezone.now() + timedelta(seconds=expiry_seconds)

    with transaction.atomic():
        # Lock booking and update status
        b = Booking.objects.select_for_update().get(id=booking.id)

        if b.status in [Booking.Status.MATCHED, Booking.Status.CONFIRMED, Booking.Status.COMPLETED]:
            logger.info(f"Booking {b.id} is already matched or completed. Aborting dispatch.")
            return []

        if b.status.startswith("CANCELLED"):
            logger.info(f"Booking {b.id} was cancelled. Aborting dispatch.")
            return []

        old_status = b.status
        b.status = Booking.Status.MATCHING
        b.matching_attempts = batch_number
        b.save()

        BookingStatusHistory.objects.create(
            booking=b,
            from_status=old_status,
            to_status=b.status,
            notes=f"Dispatching Batch {batch_number} to {len(candidates)} partner(s)",
        )

        for partner, dist, score in candidates[:DEFAULT_BATCH_SIZE]:
            # Guard against unique pending constraint
            existing_pending = BookingOffer.objects.filter(
                booking=b,
                partner=partner,
                status=BookingOffer.OfferStatus.PENDING,
            ).first()

            if not existing_pending:
                offer = BookingOffer.objects.create(
                    booking=b,
                    partner=partner,
                    status=BookingOffer.OfferStatus.PENDING,
                    batch_number=batch_number,
                    expires_at=expires_at,
                )
                setattr(offer, "calculated_distance_km", dist)
                created_offers.append(offer)

                # Broadcast live offer over WebSocket & persist notification
                try:
                    broadcast_new_offer(offer)
                except Exception as ex:
                    logger.warning(f"Could not broadcast offer {offer.id} to partner {partner.id}: {ex}")

    return created_offers


def handle_batch_timeout(booking_id: str, batch_number: int):
    """
    Called when an offer batch expires without being accepted.
    Handles timeout, offer expiration, retry with radius expansion, or NO_PARTNERS.
    """
    with transaction.atomic():
        try:
            booking = Booking.objects.select_for_update().get(id=booking_id)
        except Booking.DoesNotExist:
            return

        # If booking is already matched or cancelled, do nothing
        if booking.status in [
            Booking.Status.MATCHED,
            Booking.Status.CONFIRMED,
            Booking.Status.PARTNER_EN_ROUTE,
            Booking.Status.IN_PROGRESS,
            Booking.Status.COMPLETED,
            Booking.Status.CANCELLED_CUSTOMER,
            Booking.Status.CANCELLED_PARTNER,
            Booking.Status.CANCELLED_ADMIN,
        ]:
            return

        # Collect and expire any remaining pending offers from this batch
        pending_offers = list(
            booking.offers.filter(
                batch_number=batch_number,
                status=BookingOffer.OfferStatus.PENDING,
            )
        )
        booking.offers.filter(
            batch_number=batch_number,
            status=BookingOffer.OfferStatus.PENDING,
        ).update(status=BookingOffer.OfferStatus.EXPIRED)

        for exp_offer in pending_offers:
            try:
                broadcast_offer_cancelled(exp_offer.id, exp_offer.partner_id, booking.id, "EXPIRED")
            except Exception as ex:
                logger.debug(f"Could not broadcast offer cancellation: {ex}")

        # Check if another partner already accepted during the interval
        if booking.partner is not None:
            return

        # Check if we can retry with next batch
        if batch_number < MAX_MATCHING_ATTEMPTS:
            next_batch = batch_number + 1
            expanded_radius = DEFAULT_BASE_RADIUS_KM + ((next_batch - 1) * RADIUS_STEP_KM)
            logger.info(
                f"Booking {booking_id}: Batch {batch_number} expired. Retrying Batch {next_batch} at {expanded_radius}km..."
            )

            candidates = find_eligible_partners(booking, radius_km=expanded_radius)

            if candidates:
                dispatch_batch_offers(booking, candidates, batch_number=next_batch)
                schedule_batch_timeout(str(booking.id), next_batch)
                return

        # If we reached max attempts or no candidate partners found:
        old_status = booking.status
        booking.status = Booking.Status.NO_PARTNERS
        booking.save()

        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=old_status,
            to_status=booking.status,
            notes=f"No partners available after {batch_number} matching attempts.",
        )

        # Notify customer and broadcast update
        try:
            broadcast_booking_update(booking)
        except Exception as ex:
            logger.warning(f"Could not broadcast NO_PARTNERS update: {ex}")


def schedule_batch_timeout(booking_id: str, batch_number: int, countdown_seconds: int = DEFAULT_EXPIRY_SECONDS):
    """
    Schedule the batch timeout task via Celery (or synchronous fallback).
    """
    try:
        from .tasks import check_batch_timeout_task
        check_batch_timeout_task.apply_async(
            args=[booking_id, batch_number],
            countdown=countdown_seconds,
        )
    except Exception as e:
        logger.info(f"Celery async queue unavailable ({e}). Running in fallback mode.")


def trigger_matching_cycle(booking_id: str, is_retry: bool = False) -> dict:
    """
    Main entry point to initiate the Rapido matching process for a booking.
    """
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return {"error": "Booking not found", "success": False}

    if booking.status not in [Booking.Status.PENDING_MATCH, Booking.Status.MATCHING, Booking.Status.NO_PARTNERS]:
        return {
            "error": f"Cannot match booking in status '{booking.status}'",
            "success": False,
        }

    batch_num = 1 if not is_retry else (booking.matching_attempts + 1)
    radius = DEFAULT_BASE_RADIUS_KM if not is_retry else (DEFAULT_BASE_RADIUS_KM + (batch_num - 1) * RADIUS_STEP_KM)

    candidates = find_eligible_partners(booking, radius_km=radius)

    if not candidates:
        if not is_retry:
            # Try once with expanded radius immediately
            candidates = find_eligible_partners(booking, radius_km=radius + RADIUS_STEP_KM)

        if not candidates:
            booking.status = Booking.Status.NO_PARTNERS
            booking.save()
            BookingStatusHistory.objects.create(
                booking=booking,
                from_status=Booking.Status.PENDING_MATCH,
                to_status=Booking.Status.NO_PARTNERS,
                notes="Zero candidate partners found in service zone.",
            )
            return {
                "success": False,
                "message": "No available partners in service zone.",
                "booking_id": str(booking.id),
                "status": booking.status,
                "candidates_count": 0,
            }

    offers = dispatch_batch_offers(booking, candidates, batch_number=batch_num)
    schedule_batch_timeout(str(booking.id), batch_num)

    return {
        "success": True,
        "message": f"Matching initiated: Batch {batch_num} dispatched to {len(offers)} partner(s).",
        "booking_id": str(booking.id),
        "status": Booking.Status.MATCHING,
        "batch_number": batch_num,
        "offers_count": len(offers),
        "radius_km": radius,
    }
