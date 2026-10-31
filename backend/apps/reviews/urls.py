from django.urls import path
from .views import (
    HealthView,
    CreateReviewView,
    PartnerReviewsListView,
    BookingReviewDetailView,
    ReplyReviewView,
)

app_name = "reviews"

urlpatterns = [
    path("health/", HealthView.as_view(), name="reviews-health"),
    path("", CreateReviewView.as_view(), name="review-create"),
    path("partner/<str:partner_id>/", PartnerReviewsListView.as_view(), name="review-partner-list"),
    path("booking/<uuid:booking_id>/", BookingReviewDetailView.as_view(), name="review-booking-detail"),
    path("<uuid:pk>/reply/", ReplyReviewView.as_view(), name="review-reply"),
]
