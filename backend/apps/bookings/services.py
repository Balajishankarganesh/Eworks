"""
Bookings services — Availability checking, slot calculation, and overlap prevention.
"""
from datetime import datetime, timedelta, time
import math
from django.utils import timezone
from django.db.models import Q
from apps.locations.models import PartnerAvailability, PartnerLocation
from apps.services.models import PartnerService
from .models import Booking


def check_partner_availability(partner, scheduled_at: datetime, duration_minutes: int = 60) -> tuple[bool, str]:
    """
    Validate whether a given partner is available at `scheduled_at` for `duration_minutes`.
    Checks:
    1. Weekly working schedule (PartnerAvailability).
    2. No overlapping active bookings for this partner.
    Returns (is_available, reason).
    """
    # 1. Partner must be approved
    if partner.status != "APPROVED":
        return False, "Partner account is not approved."

    # 2. Check weekly availability window
    day_of_week = scheduled_at.weekday()  # 0 = Monday, 6 = Sunday
    booking_start_time = scheduled_at.time()
    booking_end_dt = scheduled_at + timedelta(minutes=duration_minutes)
    booking_end_time = booking_end_dt.time()

    # Query matching availability slots for this day
    slots = PartnerAvailability.objects.filter(
        partner=partner,
        day_of_week=day_of_week,
        is_available=True,
    )

    if slots.exists():
        # Check if requested time fits inside any configured working slot
        within_slot = False
        for slot in slots:
            if slot.start_time <= booking_start_time and slot.end_time >= booking_end_time:
                within_slot = True
                break
        if not within_slot:
            return False, f"Partner does not work during requested window on {scheduled_at.strftime('%A')}."

    # 3. Overlap check against existing confirmed / in-progress bookings
    active_statuses = [
        Booking.Status.PENDING_MATCH,
        Booking.Status.MATCHING,
        Booking.Status.MATCHED,
        Booking.Status.CONFIRMED,
        Booking.Status.PARTNER_EN_ROUTE,
        Booking.Status.IN_PROGRESS,
    ]

    overlapping_bookings = Booking.objects.filter(
        partner=partner,
        status__in=active_statuses,
        scheduled_at__isnull=False,
    )

    for existing in overlapping_bookings:
        existing_start = existing.scheduled_at
        existing_end = existing_start + timedelta(minutes=existing.estimated_duration_minutes)
        # Check if [scheduled_at, booking_end_dt] overlaps with [existing_start, existing_end]
        if max(scheduled_at, existing_start) < min(booking_end_dt, existing_end):
            return False, f"Partner has another booking scheduled from {existing_start.strftime('%H:%M')} to {existing_end.strftime('%H:%M')}."

    return True, "Partner is available."


def get_available_slots_for_category(category_id: str, target_date_str: str) -> list[dict]:
    """
    Calculate 1-hour availability slots for a service category on a specific date.
    Returns list of slot status dictionaries.
    """
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        target_date = timezone.now().date()

    day_of_week = target_date.weekday()
    now = timezone.now()

    # Find all approved partners who offer this category
    partner_services = PartnerService.objects.filter(
        category_id=category_id,
        is_active=True,
        partner__status="APPROVED",
    ).select_related("partner")

    partners = [ps.partner for ps in partner_services]

    # Standard daily time slots from 08:00 to 20:00 (every hour)
    standard_hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    results = []

    for hour in standard_hours:
        slot_time = time(hour, 0)
        slot_dt = timezone.make_aware(datetime.combine(target_date, slot_time))

        # Can't book slots in the past
        if slot_dt <= now + timedelta(minutes=30):
            results.append({
                "time": slot_time.strftime("%H:%M"),
                "display": slot_time.strftime("%I:%M %p"),
                "is_available": False,
                "reason": "Past time slot",
                "available_partner_count": 0,
            })
            continue

        available_count = 0
        if not partners:
            # If no partners registered yet in system, enable default slots
            available_count = 1
        else:
            for p in partners:
                ok, _ = check_partner_availability(p, slot_dt, duration_minutes=60)
                if ok:
                    available_count += 1

        results.append({
            "time": slot_time.strftime("%H:%M"),
            "display": slot_time.strftime("%I:%M %p"),
            "is_available": available_count > 0,
            "reason": "Available" if available_count > 0 else "Fully booked",
            "available_partner_count": available_count,
        })

    return results


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)
