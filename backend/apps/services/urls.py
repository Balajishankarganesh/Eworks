"""services app URLs."""
from django.urls import path
from . import views

urlpatterns = [
    # Public
    path("categories/", views.ServiceCategoryListView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", views.ServiceCategoryDetailView.as_view(), name="category-detail"),
    # Partner
    path("my-services/", views.PartnerServiceListCreateView.as_view(), name="partner-service-list"),
    path("my-services/<uuid:pk>/", views.PartnerServiceDetailView.as_view(), name="partner-service-detail"),
    # Admin
    path("admin/categories/", views.AdminServiceCategoryListCreateView.as_view(), name="admin-category-list"),
    path("admin/categories/<uuid:pk>/", views.AdminServiceCategoryDetailView.as_view(), name="admin-category-detail"),
]
