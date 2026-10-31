"""Root URL configuration for the Home Services Marketplace API."""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

# API v1 URL patterns
api_v1_patterns = [
    path("auth/", include("apps.accounts.urls")),
    path("services/", include("apps.services.urls")),
    path("locations/", include("apps.locations.urls")),
    path("bookings/", include("apps.bookings.urls")),
    path("matching/", include("apps.matching.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("payments/", include("apps.payments.urls")),
    path("reviews/", include("apps.reviews.urls")),
    path("support/", include("apps.support.urls")),
    # OpenAPI schema
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="v1:schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="v1:schema"), name="redoc"),
]

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include((api_v1_patterns, "api"), namespace="v1")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Custom admin site branding
admin.site.site_header = "Home Services Marketplace Admin"
admin.site.site_title = "HSM Admin"
admin.site.index_title = "Platform Administration"
