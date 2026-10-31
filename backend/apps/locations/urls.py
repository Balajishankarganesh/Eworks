"""locations app URLs."""
from django.urls import path
from . import views

urlpatterns = [
    # Customer saved addresses
    path("addresses/", views.ServiceAddressListCreateView.as_view(), name="address-list"),
    path("addresses/<uuid:pk>/", views.ServiceAddressDetailView.as_view(), name="address-detail"),

    # Partner live location & availability
    path("partner/location/", views.PartnerLocationUpdateView.as_view(), name="partner-location"),
    path("partner/update-location/", views.PartnerLocationUpdateView.as_view(), name="partner-update-location"),
    path("partner/availability/", views.PartnerAvailabilityListCreateView.as_view(), name="partner-availability-list"),
    path("availability/", views.PartnerAvailabilityListCreateView.as_view(), name="availability-list"),
    path("partner/availability/bulk/", views.PartnerAvailabilityBulkUpdateView.as_view(), name="partner-availability-bulk"),
    path("availability/bulk-update/", views.PartnerAvailabilityBulkUpdateView.as_view(), name="availability-bulk-update"),
    path("partner/availability/<uuid:pk>/", views.PartnerAvailabilityDetailView.as_view(), name="partner-availability-detail"),

    # Geo-Search & serviceability
    path("geo-search/partners/", views.NearbyPartnersGeoSearchView.as_view(), name="geo-search-partners"),
    path("service-area-check/", views.ServiceAreaCheckView.as_view(), name="service-area-check"),
    path("districts/", views.TamilNaduDistrictsView.as_view(), name="tamil-nadu-districts"),
    path("service-areas/", views.TamilNaduDistrictsView.as_view(), name="service-areas"),
]

