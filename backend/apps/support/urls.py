from django.urls import path
from .views import (
    HealthView,
    SupportTicketListCreateView,
    SupportTicketDetailUpdateView,
    AdminPlatformAnalyticsView,
    AdminAuditLogListView,
)

app_name = "support"

urlpatterns = [
    path("health/", HealthView.as_view(), name="support-health"),
    path("tickets/", SupportTicketListCreateView.as_view(), name="support-tickets-list-create"),
    path("tickets/<uuid:pk>/", SupportTicketDetailUpdateView.as_view(), name="support-ticket-detail-update"),
    path("admin/analytics/", AdminPlatformAnalyticsView.as_view(), name="support-admin-analytics"),
    path("admin/audit-logs/", AdminAuditLogListView.as_view(), name="support-admin-audit-logs"),
]
