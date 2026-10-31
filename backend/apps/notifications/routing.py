"""
WebSocket URL routing — wired into ASGI application in config/asgi.py.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Customer booking updates
    re_path(r"^ws/bookings/(?P<booking_id>[0-9a-f-]+)/$", consumers.BookingConsumer.as_asgi()),
    # Partner offer & status stream
    re_path(r"^ws/partner/stream/$", consumers.PartnerStreamConsumer.as_asgi()),
    # Generic user notifications
    re_path(r"^ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
]
