"""
matching app tasks — Celery background workers for dispatch, timeout monitoring, and scheduled booking matching.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.matching.tasks.dispatch_matching_task", queue="matching")
def dispatch_matching_task(booking_id: str, is_retry: bool = False):
    """
    Celery task to run the matching dispatch asynchronously.
    """
    from .services import trigger_matching_cycle
    logger.info(f"Running dispatch_matching_task for booking {booking_id} (retry={is_retry})")
    result = trigger_matching_cycle(booking_id, is_retry=is_retry)
    return result


@shared_task(name="apps.matching.tasks.check_batch_timeout_task", queue="matching")
def check_batch_timeout_task(booking_id: str, batch_number: int):
    """
    Celery task that fires after the offer expiry window to check for timeout.
    """
    from .services import handle_batch_timeout
    logger.info(f"Running check_batch_timeout_task for booking {booking_id}, batch {batch_number}")
    handle_batch_timeout(booking_id, batch_number)


@shared_task(name="apps.matching.tasks.clean_stale_offers_task", queue="matching")
def clean_stale_offers_task():
    """
    Periodic task to expire dangling offers that exceeded their expiry window.
    """
    from apps.bookings.models import BookingOffer
    now = timezone.now()
    count = BookingOffer.objects.filter(
        status=BookingOffer.OfferStatus.PENDING,
        expires_at__lt=now,
    ).update(status=BookingOffer.OfferStatus.EXPIRED)
    if count > 0:
        logger.info(f"clean_stale_offers_task: expired {count} dangling offer(s).")
    return {"expired_count": count}


@shared_task(name="apps.matching.tasks.dispatch_scheduled_bookings_task", queue="matching")
def dispatch_scheduled_bookings_task():
    """
    Periodic task to scan upcoming scheduled bookings needing partner assignment.
    Finds bookings scheduled within the next 45 minutes that have no assigned partner.
    """
    from apps.bookings.models import Booking
    from .services import trigger_matching_cycle

    now = timezone.now()
    horizon = now + timedelta(minutes=45)

    upcoming_bookings = Booking.objects.filter(
        booking_type=Booking.BookingType.SCHEDULED,
        status__in=[Booking.Status.PENDING_MATCH, Booking.Status.CONFIRMED],
        partner__isnull=True,
        scheduled_at__isnull=False,
        scheduled_at__lte=horizon,
        scheduled_at__gte=now - timedelta(minutes=15),
    )

    dispatched_count = 0
    for booking in upcoming_bookings:
        logger.info(f"Auto-dispatching upcoming scheduled booking {booking.id} due at {booking.scheduled_at}")
        trigger_matching_cycle(str(booking.id))
        dispatched_count += 1

    return {"dispatched_count": dispatched_count}
