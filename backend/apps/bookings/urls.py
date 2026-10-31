"""
bookings app URLs.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Availability slots for scheduling (placed before <uuid:pk> patterns)
    path("availability-slots/", views.BookingAvailabilitySlotsView.as_view(), name="booking-availability-slots"),

    # Customer bookings
    path("", views.BookingCreateView.as_view(), name="booking-create"),
    path("my-bookings/", views.CustomerBookingListView.as_view(), name="customer-bookings"),
    path("<uuid:pk>/", views.BookingDetailView.as_view(), name="booking-detail"),
    path("<uuid:pk>/cancel/", views.BookingCancelView.as_view(), name="booking-cancel"),
    path("<uuid:pk>/partner-location/", views.BookingPartnerLiveLocationView.as_view(), name="booking-partner-location"),

    # Partner booking lifecycle & actions
    path("<uuid:pk>/en-route/", views.PartnerEnRouteView.as_view(), name="partner-en-route"),
    path("<uuid:pk>/start-job/", views.BookingStartJobView.as_view(), name="booking-start-job"),
    path("<uuid:pk>/complete/", views.BookingCompleteJobView.as_view(), name="booking-complete-job"),

    # Partner bookings & offers
    path("partner/assigned/", views.PartnerBookingListView.as_view(), name="partner-assigned-bookings"),
    path("partner/jobs/", views.PartnerBookingListView.as_view(), name="partner-jobs"),
    path("partner/offers/", views.PartnerOffersListView.as_view(), name="partner-offers"),
    path("offers/<uuid:pk>/accept/", views.PartnerOfferAcceptView.as_view(), name="offer-accept"),
    path("offers/<uuid:pk>/reject/", views.PartnerOfferRejectView.as_view(), name="offer-reject"),
]

