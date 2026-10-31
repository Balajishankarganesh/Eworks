from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="matching-health"),
    path("trigger/", views.MatchingTriggerView.as_view(), name="matching-trigger-post"),
    path("trigger/<uuid:booking_id>/", views.MatchingTriggerView.as_view(), name="matching-trigger"),
    path("status/<uuid:booking_id>/", views.MatchingStatusView.as_view(), name="matching-status"),
    path("retry/<uuid:booking_id>/", views.MatchingRetryView.as_view(), name="matching-retry"),
]
