"""
Shared pytest fixtures and model factories for the HomeWorks test suite.
Uses factory-boy to build realistic test data for all 9 Django apps.
"""
import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


# ── Helper: generate JWT tokens ───────────────────────────────────────────────

def get_tokens_for_user(user):
    """Generate JWT access + refresh tokens for a given User instance."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def authenticated_client(user):
    """Return a DRF APIClient with Bearer token set for the given user."""
    client = APIClient()
    tokens = get_tokens_for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    return client


# ── User Factories ────────────────────────────────────────────────────────────

@pytest.fixture
def customer_user(db):
    """Create a verified customer user with auto-generated profile (via signal)."""
    from apps.accounts.models import User
    user = User.objects.create_user(
        email="customer@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Customer",
        role=User.Role.CUSTOMER,
        is_verified=True,
    )
    return user


@pytest.fixture
def partner_user(db):
    """Create a verified partner user with auto-generated profile (via signal)."""
    from apps.accounts.models import User
    user = User.objects.create_user(
        email="partner@test.com",
        password="TestPass123!",
        first_name="Test",
        last_name="Partner",
        role=User.Role.PARTNER,
        is_verified=True,
    )
    return user


@pytest.fixture
def admin_user(db):
    """Create an admin superuser."""
    from apps.accounts.models import User
    user = User.objects.create_superuser(
        email="admin@test.com",
        password="AdminPass123!",
        first_name="Admin",
        last_name="User",
    )
    return user


@pytest.fixture
def second_partner_user(db):
    """Create a second partner for multi-partner test scenarios."""
    from apps.accounts.models import User
    user = User.objects.create_user(
        email="partner2@test.com",
        password="TestPass123!",
        first_name="Second",
        last_name="Partner",
        role=User.Role.PARTNER,
        is_verified=True,
    )
    return user


# ── Profile Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def customer_profile(customer_user):
    """Return the auto-created CustomerProfile for the customer user."""
    return customer_user.customer_profile


@pytest.fixture
def partner_profile(partner_user):
    """Return the auto-created PartnerProfile, set to APPROVED + online."""
    from apps.accounts.models import PartnerProfile
    profile = partner_user.partner_profile
    profile.status = PartnerProfile.Status.APPROVED
    profile.is_online = True
    profile.service_radius_km = 15.0
    profile.save()
    return profile


@pytest.fixture
def second_partner_profile(second_partner_user):
    """Approved + online second partner profile."""
    from apps.accounts.models import PartnerProfile
    profile = second_partner_user.partner_profile
    profile.status = PartnerProfile.Status.APPROVED
    profile.is_online = True
    profile.service_radius_km = 15.0
    profile.save()
    return profile


# ── API Client Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def customer_api_client(customer_user):
    """Authenticated APIClient as customer."""
    return authenticated_client(customer_user)


@pytest.fixture
def partner_api_client(partner_user):
    """Authenticated APIClient as partner."""
    return authenticated_client(partner_user)


@pytest.fixture
def admin_api_client(admin_user):
    """Authenticated APIClient as admin."""
    return authenticated_client(admin_user)


@pytest.fixture
def anon_api_client():
    """Unauthenticated APIClient."""
    return APIClient()


# ── Service Category Fixture ─────────────────────────────────────────────────

@pytest.fixture
def service_category(db):
    """Create a test service category."""
    from apps.services.models import ServiceCategory
    return ServiceCategory.objects.create(
        name="Electrician",
        slug="electrician",
        description="Electrical repair and installation services",
        icon="Zap",
        base_price=Decimal("299.00"),
        estimated_duration_minutes=60,
        is_active=True,
        display_order=1,
    )


@pytest.fixture
def plumbing_category(db):
    """Create a second service category for multi-category tests."""
    from apps.services.models import ServiceCategory
    return ServiceCategory.objects.create(
        name="Plumber",
        slug="plumber",
        description="Plumbing repair services",
        icon="Wrench",
        base_price=Decimal("349.00"),
        estimated_duration_minutes=90,
        is_active=True,
        display_order=2,
    )


# ── Partner Service Registration ──────────────────────────────────────────────

@pytest.fixture
def partner_service(partner_profile, service_category):
    """Register the partner to offer the electrician category."""
    from apps.services.models import PartnerService
    return PartnerService.objects.create(
        partner=partner_profile,
        category=service_category,
        is_active=True,
        experience_years=3,
    )


@pytest.fixture
def second_partner_service(second_partner_profile, service_category):
    """Register the second partner for the electrician category."""
    from apps.services.models import PartnerService
    return PartnerService.objects.create(
        partner=second_partner_profile,
        category=service_category,
        is_active=True,
        experience_years=1,
    )


# ── Booking Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def booking(customer_profile, service_category):
    """Create an INSTANT booking in PENDING_MATCH status."""
    from apps.bookings.models import Booking
    return Booking.objects.create(
        customer=customer_profile,
        service_category=service_category,
        problem_description="Flickering lights in kitchen",
        booking_type=Booking.BookingType.INSTANT,
        status=Booking.Status.PENDING_MATCH,
        service_latitude=Decimal("13.0827"),
        service_longitude=Decimal("80.2707"),
        service_address_text="42 Anna Nagar, Chennai 600040",
        quoted_price=service_category.base_price,
        estimated_duration_minutes=60,
        job_start_otp="1234",
    )


@pytest.fixture
def scheduled_booking(customer_profile, service_category):
    """Create a SCHEDULED booking in PENDING_MATCH status."""
    from apps.bookings.models import Booking
    return Booking.objects.create(
        customer=customer_profile,
        service_category=service_category,
        problem_description="Need wiring inspection",
        booking_type=Booking.BookingType.SCHEDULED,
        status=Booking.Status.PENDING_MATCH,
        scheduled_at=timezone.now() + timedelta(hours=4),
        service_latitude=Decimal("13.0500"),
        service_longitude=Decimal("80.2500"),
        service_address_text="12 T Nagar, Chennai 600017",
        quoted_price=service_category.base_price,
        estimated_duration_minutes=60,
        job_start_otp="5678",
    )


@pytest.fixture
def matched_booking(booking, partner_profile):
    """A booking that has been matched with a partner."""
    from apps.bookings.models import Booking
    booking.partner = partner_profile
    booking.status = Booking.Status.MATCHED
    booking.confirmed_at = timezone.now()
    booking.save()
    return booking


@pytest.fixture
def in_progress_booking(matched_booking):
    """A booking currently in progress."""
    from apps.bookings.models import Booking
    matched_booking.status = Booking.Status.IN_PROGRESS
    matched_booking.started_at = timezone.now()
    matched_booking.save()
    return matched_booking


@pytest.fixture
def completed_booking(in_progress_booking):
    """A completed booking."""
    from apps.bookings.models import Booking
    in_progress_booking.status = Booking.Status.COMPLETED
    in_progress_booking.completed_at = timezone.now()
    in_progress_booking.final_price = in_progress_booking.quoted_price
    in_progress_booking.save()
    return in_progress_booking


# ── Booking Offer Fixture ────────────────────────────────────────────────────

@pytest.fixture
def booking_offer(booking, partner_profile):
    """Create a pending offer for the partner on the booking."""
    from apps.bookings.models import BookingOffer
    return BookingOffer.objects.create(
        booking=booking,
        partner=partner_profile,
        status=BookingOffer.OfferStatus.PENDING,
        batch_number=1,
        expires_at=timezone.now() + timedelta(seconds=45),
    )


@pytest.fixture
def expired_offer(booking, partner_profile):
    """Create an already-expired offer."""
    from apps.bookings.models import BookingOffer
    return BookingOffer.objects.create(
        booking=booking,
        partner=partner_profile,
        status=BookingOffer.OfferStatus.PENDING,
        batch_number=1,
        expires_at=timezone.now() - timedelta(seconds=10),
    )


# ── Payment Fixture ──────────────────────────────────────────────────────────

@pytest.fixture
def payment(completed_booking, customer_profile):
    """Create a pending payment for a completed booking."""
    from apps.payments.models import Payment
    return Payment.objects.create(
        booking=completed_booking,
        customer=customer_profile,
        amount=Decimal("363.22"),
        method=Payment.PaymentMethod.UPI,
        status=Payment.PaymentStatus.INITIATED,
    )


# ── Review Fixture ───────────────────────────────────────────────────────────

@pytest.fixture
def review(completed_booking, customer_profile, partner_profile):
    """Create a review for a completed booking."""
    from apps.reviews.models import Review
    return Review.objects.create(
        booking=completed_booking,
        customer=customer_profile,
        partner=partner_profile,
        rating=5,
        comment="Excellent work, very professional!",
        is_visible=True,
    )


# ── Notification Fixture ─────────────────────────────────────────────────────

@pytest.fixture
def notification(customer_user):
    """Create a test notification for customer user."""
    from apps.notifications.models import Notification
    return Notification.objects.create(
        recipient=customer_user,
        notification_type=Notification.NotificationType.BOOKING_STATUS_UPDATE,
        title="Booking Update",
        body="Your booking status has changed.",
        data={"booking_id": str(uuid.uuid4())},
    )


# ── Support Ticket Fixture ───────────────────────────────────────────────────

@pytest.fixture
def support_ticket(customer_user, booking):
    """Create a support ticket."""
    from apps.support.models import SupportTicket
    return SupportTicket.objects.create(
        raised_by=customer_user,
        booking=booking,
        category=SupportTicket.TicketCategory.BOOKING_ISSUE,
        subject="Partner was late",
        description="The partner arrived 30 minutes late.",
    )


# ── Celery Eager Mode ────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def celery_eager_mode(settings):
    """Force Celery tasks to execute synchronously in tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    # Ensure DRF throttles do not interfere with test runs
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []

