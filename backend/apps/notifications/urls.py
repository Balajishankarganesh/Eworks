from django.urls import path
from .views import (
    HealthView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("health/", HealthView.as_view(), name="notifications-health"),
]
