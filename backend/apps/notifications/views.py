"""
Views for Notifications API.
"""
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import get_object_or_404

from .models import Notification
from .serializers import NotificationSerializer
from .broadcast import _send_to_channel_layer


class HealthView(APIView):
    """Health check endpoint for the notifications app."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"app": "notifications", "status": "ok", "timestamp": timezone.now().isoformat()})


class NotificationListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/
    Lists recent notifications for the authenticated user.
    Optional query parameter: ?unread=true
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user).order_by("-created_at")

        unread_only = self.request.query_params.get("unread")
        if unread_only and unread_only.lower() in ["true", "1"]:
            qs = qs.filter(is_read=False)

        return qs[:50]


class NotificationMarkReadView(APIView):
    """
    POST /api/v1/notifications/<uuid:pk>/read/
    Marks a single notification as read and broadcasts updated count.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()

        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

        # Broadcast counter update
        _send_to_channel_layer(
            f"user_{request.user.id}",
            {"type": "unread_count_update", "count": unread_count},
        )

        return Response(
            {
                "message": "Notification marked as read.",
                "notification": NotificationSerializer(notification).data,
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    """
    POST /api/v1/notifications/mark-all-read/
    Marks all notifications for the authenticated user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True, read_at=now)

        # Broadcast 0 unread count
        _send_to_channel_layer(
            f"user_{request.user.id}",
            {"type": "unread_count_update", "count": 0},
        )

        return Response(
            {
                "message": "All notifications marked as read.",
                "marked_count": updated_count,
                "unread_count": 0,
            },
            status=status.HTTP_200_OK,
        )


class NotificationUnreadCountView(APIView):
    """
    GET /api/v1/notifications/unread-count/
    Returns the total unread notification count for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)
