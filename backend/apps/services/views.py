"""
services app views — ServiceCategory CRUD (admin) and PartnerService management.
"""
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsAdmin, IsPartner, IsApprovedPartner
from .models import ServiceCategory, ServiceSubcategory, PartnerService
from .serializers import (
    ServiceCategorySerializer,
    ServiceCategoryListSerializer,
    ServiceSubcategorySerializer,
    PartnerServiceSerializer,
)


class ServiceCategoryListView(generics.ListAPIView):
    """
    GET /api/v1/services/categories/
    Public listing of all active service categories.
    Supports ?search= keyword query.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ServiceCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["display_order", "name", "base_price"]
    ordering = ["display_order", "name"]

    def get_queryset(self):
        return (
            ServiceCategory.objects.filter(is_active=True)
            .prefetch_related("subcategories")
            .order_by("display_order", "name")
        )


class ServiceCategoryDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/services/categories/<slug>/
    Public detail of an active service category by slug.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ServiceCategorySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return ServiceCategory.objects.filter(is_active=True).prefetch_related("subcategories")


class PartnerServiceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/services/my-services/  — list services offered by logged-in partner
    POST /api/v1/services/my-services/  — add a new service category to partner's offerings
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = PartnerServiceSerializer

    def get_queryset(self):
        partner = self.request.user.partner_profile
        return PartnerService.objects.filter(partner=partner).select_related("category")

    def perform_create(self, serializer):
        partner = self.request.user.partner_profile
        serializer.save(partner=partner)


class PartnerServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PATCH, DELETE /api/v1/services/my-services/<uuid:pk>/
    Manage an individual service category offered by the logged-in partner.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = PartnerServiceSerializer

    def get_queryset(self):
        partner = self.request.user.partner_profile
        return PartnerService.objects.filter(partner=partner).select_related("category")


class AdminServiceCategoryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/services/admin/categories/  — list all categories (including inactive)
    POST /api/v1/services/admin/categories/  — create a new category
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = ServiceCategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]
    queryset = ServiceCategory.objects.all().prefetch_related("subcategories").order_by("display_order", "name")


class AdminServiceCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, PATCH, DELETE /api/v1/services/admin/categories/<uuid:pk>/
    Admin full CRUD on individual service category.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = ServiceCategorySerializer
    queryset = ServiceCategory.objects.all().prefetch_related("subcategories")
