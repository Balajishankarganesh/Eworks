"""
Django Channels WebSocket consumers for real-time events.
- BookingConsumer: live status and partner location tracking for customers and assigned partners.
- PartnerStreamConsumer: Rapido-style incoming offers radar and offer cancellations for partners.
- NotificationConsumer: persistent user notifications and unread badge counters.
"""
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def can_access_booking(user, booking_id: str):
    """
    Checks if a user is permitted to connect to booking_{booking_id}.
    Allowed parties: Staff / Admin, Customer owner, Assigned partner, or partner with active offer.
    """
    if not user or not user.is_authenticated:
        return False, None

    try:
        from apps.bookings.models import Booking, BookingOffer

        booking = Booking.objects.select_related("customer", "partner").get(id=booking_id)

        # 1. Staff / Admin
        if getattr(user, "is_staff", False) or getattr(user, "role", None) == "ADMIN":
            return True, booking

        # 2. Customer owner
        if hasattr(user, "customer_profile") and booking.customer_id == user.customer_profile.id:
            return True, booking

        # 3. Assigned partner
        if hasattr(user, "partner_profile") and booking.partner_id == user.partner_profile.id:
            return True, booking

        # 4. Partner with pending offer
        if hasattr(user, "partner_profile"):
            if BookingOffer.objects.filter(booking=booking, partner=user.partner_profile).exists():
                return True, booking

        return False, None
    except Exception as exc:
        logger.debug(f"Error checking booking access for {user}: {exc}")
        return False, None


@database_sync_to_async
def update_partner_location(partner_profile_id: str, latitude: float, longitude: float, heading: float = None):
    """Updates the partner's live location record in PostGIS."""
    try:
        from django.contrib.gis.geos import Point
        from apps.locations.models import PartnerLocation

        point = Point(float(longitude), float(latitude), srid=4326)
        loc, _ = PartnerLocation.objects.update_or_create(
            partner_id=partner_profile_id,
            defaults={
                "location": point,
                "is_sharing_live_location": True,
                "updated_at": timezone.now(),
            },
        )
        return True
    except Exception as exc:
        logger.warning(f"Could not update partner live location: {exc}")
        return False


@database_sync_to_async
def get_unread_count(user):
    """Gets the count of unread notifications for a user."""
    try:
        from apps.notifications.models import Notification
        return Notification.objects.filter(recipient=user, is_read=False).count()
    except Exception:
        return 0


class BookingConsumer(AsyncJsonWebsocketConsumer):
    """
    Push booking status updates & live GPS tracking to the customer and assigned partner.
    Channel Group: booking_{booking_id}
    """

    async def connect(self):
        self.booking_id = self.scope["url_route"]["kwargs"]["booking_id"]
        self.group_name = f"booking_{self.booking_id}"
        self.user = self.scope.get("user")

        # Validate access
        has_access, booking = await can_access_booking(self.user, self.booking_id)
        if not has_access:
            logger.warning(f"Unauthorized WebSocket connection to {self.group_name} by {self.user}")
            await self.close(code=4403)
            return

        # Add to group
        if self.channel_layer:
            await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()
        await self.send_json({
            "type": "connection_established",
            "booking_id": self.booking_id,
            "status": booking.status if booking else "OK",
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name") and self.channel_layer:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        """Handle incoming messages from client (e.g. heartbeat or partner GPS stream)."""
        msg_type = content.get("type")

        if msg_type == "ping":
            await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})
            return

        # Partner streaming live location over WebSocket
        if msg_type == "update_location":
            partner_id = self.scope.get("partner_id")
            if not partner_id:
                return

            lat = content.get("latitude")
            lng = content.get("longitude")
            heading = content.get("heading")
            speed = content.get("speed")

            if lat is not None and lng is not None:
                # Update PostGIS
                await update_partner_location(partner_id, lat, lng, heading)

                # Broadcast to booking group for real-time customer map update
                if self.channel_layer:
                    await self.channel_layer.group_send(
                        self.group_name,
                        {
                            "type": "partner_location",
                            "data": {
                                "latitude": float(lat),
                                "longitude": float(lng),
                                "heading": heading,
                                "speed": speed,
                                "timestamp": timezone.now().isoformat(),
                            },
                        },
                    )

    # Channel Layer Event Handlers
    async def booking_update(self, event):
        """Handler for booking status updates."""
        await self.send_json({
            "type": "booking_update",
            "data": event.get("data", {}),
        })

    async def partner_location(self, event):
        """Handler for live partner GPS coordinate updates."""
        await self.send_json({
            "type": "partner_location",
            "data": event.get("data", {}),
        })


class PartnerStreamConsumer(AsyncJsonWebsocketConsumer):
    """
    Personal real-time stream for a service partner.
    Dispatches incoming offers, cancellations, and assignment notifications.
    Channel Group: partner_{partner_id}
    """

    async def connect(self):
        self.user = self.scope.get("user")
        self.partner_id = self.scope.get("partner_id")

        # Must be authenticated partner
        if not self.user or not self.user.is_authenticated or not self.partner_id:
            logger.warning(f"Unauthorized partner stream connection: {self.user}")
            await self.close(code=4403)
            return

        self.group_name = f"partner_{self.partner_id}"

        if self.channel_layer:
            await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()
        await self.send_json({
            "type": "connection_established",
            "partner_id": self.partner_id,
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name") and self.channel_layer:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})

    # Channel Layer Event Handlers
    async def new_offer(self, event):
        """Handler for incoming service offers."""
        await self.send_json({
            "type": "new_offer",
            "data": event.get("data", {}),
        })

    async def offer_cancelled(self, event):
        """Handler for offer cancellations/expiries."""
        await self.send_json({
            "type": "offer_cancelled",
            "data": event.get("data", {}),
        })

    async def booking_assigned(self, event):
        """Handler for assignment confirmation."""
        await self.send_json({
            "type": "booking_assigned",
            "data": event.get("data", {}),
        })


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Generic real-time notification stream for any authenticated user.
    Pushes notifications and unread badge counters.
    Channel Group: user_{user_id}
    """

    async def connect(self):
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            logger.warning("Unauthenticated user notification socket connection.")
            await self.close(code=4401)
            return

        self.user_id = str(self.user.id)
        self.group_name = f"user_{self.user_id}"

        if self.channel_layer:
            await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.accept()

        unread = await get_unread_count(self.user)
        await self.send_json({
            "type": "connection_established",
            "user_id": self.user_id,
            "unread_count": unread,
            "timestamp": timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name") and self.channel_layer:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})

    # Channel Layer Event Handlers
    async def notification_message(self, event):
        """Handler for individual notifications."""
        await self.send_json({
            "type": "notification",
            "data": event.get("data", {}),
        })

    async def unread_count_update(self, event):
        """Handler for badge counter updates."""
        await self.send_json({
            "type": "unread_count",
            "count": event.get("count", 0),
        })
