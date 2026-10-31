"""
Channel Layer Event Broadcasting Helpers.
Dispatches real-time WebSocket events to bookings, partner streams, and user notifications.
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

logger = logging.getLogger(__name__)


def _send_to_channel_layer(group_name: str, message: dict):
    """Safely dispatches a message to a channel layer group with Redis fallback."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.debug(f"No channel layer configured; skipped broadcast to {group_name}")
            return
        async_to_sync(channel_layer.group_send)(group_name, message)
    except Exception as exc:
        logger.warning(f"Failed to broadcast to group {group_name}: {exc}")


def broadcast_booking_update(booking, extra_data: dict = None):
    """
    Broadcasts booking status updates to the booking group: booking_{booking_id}.
    Also sends user notifications to customer and assigned partner.
    """
    try:
        partner_info = None
        if booking.partner:
            p_user = booking.partner.user
            partner_info = {
                "id": str(booking.partner.id),
                "name": p_user.get_full_name() or p_user.email,
                "phone": p_user.phone or "",
                "rating": float(booking.partner.average_rating or 5.0),
                "experience": booking.partner.years_of_experience,
                "profile_picture": p_user.profile_picture.url if p_user.profile_picture else None,
            }

        payload = {
            "booking_id": str(booking.id),
            "id": str(booking.id),
            "status": booking.status,
            "partner_details": partner_info,
            "scheduled_at": booking.scheduled_at.isoformat() if booking.scheduled_at else None,
            "quoted_price": float(booking.quoted_price) if booking.quoted_price else 0.0,
            "total_amount": float(booking.total_amount) if booking.total_amount else 0.0,
            "job_start_otp": booking.job_start_otp if booking.status in ["MATCHED", "PARTNER_EN_ROUTE", "IN_PROGRESS"] else "",
            "category_name": booking.service_category.name if booking.service_category else "",
            "updated_at": booking.updated_at.isoformat() if hasattr(booking, "updated_at") and booking.updated_at else timezone.now().isoformat(),
        }

        if extra_data:
            payload.update(extra_data)

        # 1. Send to booking room
        _send_to_channel_layer(
            f"booking_{booking.id}",
            {"type": "booking_update", "data": payload},
        )

        # 2. Trigger notification to customer if status is noteworthy
        status_titles = {
            "MATCHED": ("Partner Assigned!", f"{partner_info['name'] if partner_info else 'A technician'} accepted your request and is preparing."),
            "PARTNER_EN_ROUTE": ("Partner En Route!", "Your technician is on their way to your service address."),
            "IN_PROGRESS": ("Service Started", "Work is underway. Live tracking active."),
            "COMPLETED": ("Service Completed!", "Your job has been marked as finished. Please review and pay."),
            "CANCELLED_CUSTOMER": ("Booking Cancelled", "You cancelled this service booking."),
            "CANCELLED_PARTNER": ("Booking Rescheduling", "Partner was unable to attend. Searching for a replacement."),
            "NO_PARTNERS": ("No Partners Available", "All technicians in your area are currently busy. You can retry with a wider radius."),
        }

        if booking.status in status_titles and booking.customer and booking.customer.user:
            title, body = status_titles[booking.status]
            from apps.notifications.models import Notification
            broadcast_user_notification(
                user=booking.customer.user,
                notification_type=Notification.NotificationType.BOOKING_STATUS_UPDATE,
                title=title,
                body=body,
                data={"booking_id": str(booking.id), "status": booking.status},
            )

            # Automatically dispatch Start OTP via SMS & WhatsApp when Partner is assigned/en route
            if booking.status in ["MATCHED", "PARTNER_EN_ROUTE"] and booking.job_start_otp:
                try:
                    from apps.notifications.sms import send_job_start_otp_sms
                    send_job_start_otp_sms(booking)
                except Exception as sms_err:
                    logger.warning(f"SMS OTP dispatch failed: {sms_err}")

    except Exception as exc:
        logger.warning(f"Error in broadcast_booking_update for booking {getattr(booking, 'id', 'unknown')}: {exc}")


def broadcast_new_offer(offer):
    """
    Dispatches a new job offer directly to a partner's personal stream: partner_{partner_id}.
    """
    try:
        b = offer.booking
        dist_km = getattr(offer, "calculated_distance_km", 2.5)

        payload = {
            "id": str(offer.id),
            "offer_id": str(offer.id),
            "booking_id": str(b.id),
            "category_name": b.service_category.name if b.service_category else "Service",
            "problem_description": b.problem_description or "Standard service request",
            "customer_address": getattr(b, "address_line1", "") or getattr(b, "service_address", "Customer Location"),
            "quoted_price": float(b.quoted_price or 0.0),
            "partner_payout": float(b.quoted_price * 0.85 if b.quoted_price else 0.0),
            "expires_at": offer.expires_at.isoformat(),
            "batch_number": offer.batch_number,
            "distance_km": round(dist_km, 1) if isinstance(dist_km, (int, float)) else 2.5,
        }

        # 1. Send to partner stream
        _send_to_channel_layer(
            f"partner_{offer.partner_id}",
            {"type": "new_offer", "data": payload},
        )

        # 2. Also notify partner's user channel
        if offer.partner and offer.partner.user:
            from apps.notifications.models import Notification
            broadcast_user_notification(
                user=offer.partner.user,
                notification_type=Notification.NotificationType.NEW_OFFER,
                title=f"New {payload['category_name']} Request ({payload['distance_km']} km)",
                body=f"Earn ₹{payload['partner_payout']:.0f}. Tap to accept within 45s!",
                data=payload,
            )

    except Exception as exc:
        logger.warning(f"Error in broadcast_new_offer: {exc}")


def broadcast_offer_cancelled(offer_id, partner_id, booking_id, reason="EXPIRED"):
    """
    Notifies a partner when an offer is no longer valid (expired, timeout, or accepted by someone else).
    """
    try:
        payload = {
            "offer_id": str(offer_id),
            "booking_id": str(booking_id),
            "reason": reason,
        }
        _send_to_channel_layer(
            f"partner_{partner_id}",
            {"type": "offer_cancelled", "data": payload},
        )
    except Exception as exc:
        logger.warning(f"Error in broadcast_offer_cancelled: {exc}")


def broadcast_user_notification(user, notification_type: str, title: str, body: str, data: dict = None):
    """
    Creates a Notification model record and sends a real-time event to user_{user_id}.
    """
    try:
        from apps.notifications.models import Notification
        from apps.notifications.serializers import NotificationSerializer

        # Persist notification in database
        notification = Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data or {},
        )

        # Calculate current unread count
        unread_count = Notification.objects.filter(recipient=user, is_read=False).count()

        # Serialize
        serialized = NotificationSerializer(notification).data

        # Broadcast real-time message and count update
        group_name = f"user_{user.id}"
        _send_to_channel_layer(
            group_name,
            {"type": "notification_message", "data": serialized},
        )
        _send_to_channel_layer(
            group_name,
            {"type": "unread_count_update", "count": unread_count},
        )

        return notification
    except Exception as exc:
        logger.warning(f"Error in broadcast_user_notification: {exc}")
        return None


def broadcast_partner_location(booking_id, latitude: float, longitude: float, heading: float = None, speed: float = None, eta_minutes: int = None):
    """
    Broadcasts real-time partner GPS coordinates to the booking tracking room.
    """
    try:
        payload = {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "heading": float(heading) if heading is not None else None,
            "speed": float(speed) if speed is not None else None,
            "eta_minutes": eta_minutes,
            "timestamp": timezone.now().isoformat(),
        }
        _send_to_channel_layer(
            f"booking_{booking_id}",
            {"type": "partner_location", "data": payload},
        )
    except Exception as exc:
        logger.warning(f"Error in broadcast_partner_location: {exc}")
