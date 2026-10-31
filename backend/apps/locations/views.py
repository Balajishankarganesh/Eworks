"""
locations app views — ServiceAddress management, PartnerLocation update, and PartnerAvailability.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point

from apps.accounts.permissions import IsCustomer, IsPartner
from .models import ServiceAddress, PartnerLocation, PartnerAvailability
from .serializers import (
    ServiceAddressSerializer,
    PartnerLocationSerializer,
    PartnerAvailabilitySerializer,
)


class ServiceAddressListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/locations/addresses/  — list all saved addresses for logged-in customer
    POST /api/v1/locations/addresses/  — add a new address for logged-in customer
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    serializer_class = ServiceAddressSerializer

    def get_queryset(self):
        return ServiceAddress.objects.filter(
            customer=self.request.user.customer_profile
        ).order_by("-is_default", "-created_at")

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user.customer_profile)


class ServiceAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, PATCH, DELETE /api/v1/locations/addresses/<uuid:pk>/
    Manage an individual customer address.
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    serializer_class = ServiceAddressSerializer

    def get_queryset(self):
        return ServiceAddress.objects.filter(customer=self.request.user.customer_profile)


class PartnerLocationUpdateView(APIView):
    """
    PUT /api/v1/locations/partner/location/
    Update the partner's current GPS location.
    Body: {"latitude": 13.0827, "longitude": 80.2707, "accuracy_meters": 10.5}
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request):
        return self.put(request)

    def put(self, request):
        partner = request.user.partner_profile
        serializer = PartnerLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        location_obj, created = PartnerLocation.objects.update_or_create(
            partner=partner,
            defaults={
                "location": serializer.validated_data["location"],
                "accuracy_meters": serializer.validated_data.get("accuracy_meters"),
            },
        )
        return Response(
            {
                "message": "Partner location updated successfully.",
                "data": PartnerLocationSerializer(location_obj).data,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        partner = request.user.partner_profile
        loc = getattr(partner, "current_location", None)
        if not loc:
            return Response({"detail": "No location recorded yet."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PartnerLocationSerializer(loc).data)


class PartnerAvailabilityListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/locations/partner/availability/  — list partner's availability schedule
    POST /api/v1/locations/partner/availability/  — add availability time slot
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = PartnerAvailabilitySerializer

    def get_queryset(self):
        return PartnerAvailability.objects.filter(
            partner=self.request.user.partner_profile
        ).order_by("day_of_week", "start_time")

    def perform_create(self, serializer):
        serializer.save(partner=self.request.user.partner_profile)


class PartnerAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, PATCH, DELETE /api/v1/locations/partner/availability/<uuid:pk>/
    Manage an individual availability time slot.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]
    serializer_class = PartnerAvailabilitySerializer

    def get_queryset(self):
        return PartnerAvailability.objects.filter(partner=self.request.user.partner_profile)


class PartnerAvailabilityBulkUpdateView(APIView):
    """
    POST /api/v1/locations/partner/availability/bulk/
    Replace or bulk update the partner's entire weekly schedule.
    Body:
    [
        {"day_of_week": 0, "start_time": "09:00:00", "end_time": "18:00:00", "is_available": true},
        ...
    ]
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request):
        partner = request.user.partner_profile
        slots_data = request.data
        if not isinstance(slots_data, list):
            return Response(
                {"detail": "Expected a list of availability slots."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.db import transaction
        with transaction.atomic():
            # Delete old slots for clean replacement
            PartnerAvailability.objects.filter(partner=partner).delete()
            created_slots = []
            for item in slots_data:
                day = item.get("day_of_week")
                start = item.get("start_time")
                end = item.get("end_time")
                is_avail = item.get("is_available", True)

                if day is not None and start and end:
                    slot = PartnerAvailability.objects.create(
                        partner=partner,
                        day_of_week=int(day),
                        start_time=start,
                        end_time=end,
                        is_available=is_avail,
                    )
                    created_slots.append(slot)

        return Response(
            {
                "message": f"Successfully updated {len(created_slots)} schedule slots.",
                "data": PartnerAvailabilitySerializer(created_slots, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class NearbyPartnersGeoSearchView(APIView):
    """
    GET /api/v1/locations/geo-search/partners/
    Find verified, active, and online partners nearby based on GPS coordinates.
    Query params:
      - latitude: float (required)
      - longitude: float (required)
      - category_id: uuid (optional)
      - radius_km: float (default 15.0)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat_str = request.query_params.get("latitude")
        lng_str = request.query_params.get("longitude")
        category_id = request.query_params.get("category_id")
        radius_km = float(request.query_params.get("radius_km", 15.0))

        if not lat_str or not lng_str:
            return Response(
                {"detail": "Both 'latitude' and 'longitude' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cust_lat = float(lat_str)
            cust_lng = float(lng_str)
        except ValueError:
            return Response(
                {"detail": "Coordinates must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.accounts.models import PartnerProfile
        from apps.bookings.services import haversine_distance

        partners_qs = PartnerProfile.objects.filter(
            status="APPROVED",
            is_online=True,
        ).select_related("user").prefetch_related("services__category")

        if category_id:
            partners_qs = partners_qs.filter(
                services__category_id=category_id,
                services__is_active=True,
            )

        results = []
        for partner in partners_qs:
            loc = getattr(partner, "current_location", None)
            if loc:
                p_lat = loc.latitude
                p_lng = loc.longitude
            else:
                # Default approximate location if partner is online but GPS ping pending
                p_lat = cust_lat + 0.01
                p_lng = cust_lng + 0.01

            dist = haversine_distance(cust_lat, cust_lng, p_lat, p_lng)
            if dist <= radius_km:
                eta_minutes = max(2, int(round((dist / 25.0) * 60 + 3)))
                services_list = [
                    {
                        "category_id": str(ps.category.id),
                        "category_name": ps.category.name,
                        "effective_price": str(ps.effective_price),
                    }
                    for ps in partner.services.filter(is_active=True)
                ]

                results.append({
                    "id": str(partner.id),
                    "name": partner.user.get_full_name() or "Service Pro",
                    "rating": float(partner.average_rating or 4.8),
                    "total_reviews": partner.total_reviews or 0,
                    "total_jobs_completed": partner.total_jobs_completed or 0,
                    "distance_km": dist,
                    "eta_minutes": eta_minutes,
                    "latitude": p_lat,
                    "longitude": p_lng,
                    "is_online": partner.is_online,
                    "services": services_list,
                })

        # Sort by closest distance
        results.sort(key=lambda x: x["distance_km"])

        return Response({
            "count": len(results),
            "radius_km": radius_km,
            "center": {"latitude": cust_lat, "longitude": cust_lng},
            "partners": results,
        })


class ServiceAreaCheckView(APIView):
    """
    GET /api/v1/locations/service-area-check/
    Check if a given latitude and longitude coordinate is within our active service zones.
    All of Tamil Nadu is fully covered across all 38 districts.
    Query params:
      - latitude: float
      - longitude: float
    """
    permission_classes = [permissions.AllowAny]

    SERVICE_HUBS = [
        # Tamil Nadu Districts & Key Cities
        {"city": "Chennai", "lat": 13.0827, "lng": 80.2707, "radius_km": 50},
        {"city": "Coimbatore", "lat": 11.0168, "lng": 76.9558, "radius_km": 45},
        {"city": "Madurai", "lat": 9.9252, "lng": 78.1198, "radius_km": 40},
        {"city": "Tiruchirappalli", "lat": 10.7905, "lng": 78.7047, "radius_km": 40},
        {"city": "Salem", "lat": 11.6643, "lng": 78.1460, "radius_km": 35},
        {"city": "Tiruppur", "lat": 11.1085, "lng": 77.3411, "radius_km": 35},
        {"city": "Erode", "lat": 11.3410, "lng": 77.7172, "radius_km": 35},
        {"city": "Tirunelveli", "lat": 8.7139, "lng": 77.7567, "radius_km": 35},
        {"city": "Vellore", "lat": 12.9165, "lng": 79.1325, "radius_km": 35},
        {"city": "Thanjavur", "lat": 10.7870, "lng": 79.1378, "radius_km": 35},
        {"city": "Thoothukudi", "lat": 8.7642, "lng": 78.1348, "radius_km": 35},
        {"city": "Dindigul", "lat": 10.3673, "lng": 77.9803, "radius_km": 35},
        {"city": "Kanchipuram", "lat": 12.8342, "lng": 79.7036, "radius_km": 35},
        {"city": "Chengalpattu", "lat": 12.6841, "lng": 79.9836, "radius_km": 35},
        {"city": "Tiruvallur", "lat": 13.1432, "lng": 79.9074, "radius_km": 35},
        {"city": "Cuddalore", "lat": 11.7480, "lng": 79.7714, "radius_km": 35},
        {"city": "Karur", "lat": 10.9601, "lng": 78.0766, "radius_km": 30},
        {"city": "Nagercoil / Kanyakumari", "lat": 8.1833, "lng": 77.4119, "radius_km": 35},
        {"city": "Hosur / Krishnagiri", "lat": 12.7409, "lng": 77.8253, "radius_km": 35},
        {"city": "Dharmapuri", "lat": 12.1211, "lng": 78.1582, "radius_km": 30},
        {"city": "Namakkal", "lat": 11.2189, "lng": 78.1674, "radius_km": 30},
        {"city": "Virudhunagar", "lat": 9.5872, "lng": 77.9578, "radius_km": 30},
        {"city": "Sivakasi", "lat": 9.4533, "lng": 77.7947, "radius_km": 30},
        {"city": "Sivagangai", "lat": 9.8433, "lng": 78.4809, "radius_km": 30},
        {"city": "Ramanathapuram", "lat": 9.3639, "lng": 78.8395, "radius_km": 35},
        {"city": "Pudukkottai", "lat": 10.3833, "lng": 78.8001, "radius_km": 30},
        {"city": "Nagapattinam", "lat": 10.7667, "lng": 79.8417, "radius_km": 30},
        {"city": "Tiruvarur", "lat": 10.7725, "lng": 79.6366, "radius_km": 30},
        {"city": "Mayiladuthurai", "lat": 11.1075, "lng": 79.6524, "radius_km": 30},
        {"city": "Ariyalur", "lat": 11.1401, "lng": 79.0786, "radius_km": 30},
        {"city": "Perambalur", "lat": 11.2342, "lng": 78.8821, "radius_km": 30},
        {"city": "Viluppuram", "lat": 11.9401, "lng": 79.4861, "radius_km": 30},
        {"city": "Kallakurichi", "lat": 11.7383, "lng": 78.9639, "radius_km": 30},
        {"city": "Tiruvannamalai", "lat": 12.2253, "lng": 79.0747, "radius_km": 30},
        {"city": "Ranipet", "lat": 12.9279, "lng": 79.3330, "radius_km": 30},
        {"city": "Tirupathur", "lat": 12.4958, "lng": 78.5678, "radius_km": 30},
        {"city": "Theni", "lat": 10.0104, "lng": 77.4768, "radius_km": 30},
        {"city": "Nilgiris (Ooty)", "lat": 11.4102, "lng": 76.6950, "radius_km": 30},
        {"city": "Tenkasi", "lat": 8.9594, "lng": 77.3150, "radius_km": 30},
        # Major neighboring hubs
        {"city": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "radius_km": 50},
        {"city": "Hyderabad", "lat": 17.3850, "lng": 78.4867, "radius_km": 45},
    ]

    def get(self, request):
        lat_str = request.query_params.get("latitude")
        lng_str = request.query_params.get("longitude")

        if not lat_str or not lng_str:
            return Response(
                {"detail": "latitude and longitude query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            return Response(
                {"detail": "Invalid coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.bookings.services import haversine_distance

        closest_hub = None
        min_dist = float("inf")

        for hub in self.SERVICE_HUBS:
            d = haversine_distance(lat, lng, hub["lat"], hub["lng"])
            if d < min_dist:
                min_dist = d
                closest_hub = hub

        # State bounding box for Tamil Nadu (Lat: 8.0N - 13.6N, Lng: 76.1E - 80.5E)
        is_in_tamil_nadu = (8.0 <= lat <= 13.6) and (76.1 <= lng <= 80.5)

        # Serviceable if within Tamil Nadu state OR within radius of closest hub
        is_serviceable = is_in_tamil_nadu or (min_dist <= closest_hub["radius_km"] if closest_hub else False)

        if is_in_tamil_nadu:
            msg = f"Great news! We service all over Tamil Nadu. Connected to our {closest_hub['city']} district dispatch hub ({round(min_dist, 1)} km away)."
        elif is_serviceable:
            msg = f"Great news! We service your area from our {closest_hub['city']} hub."
        else:
            msg = f"We are not servicing this area yet. Closest active hub is {closest_hub['city']} ({round(min_dist, 1)} km away)."

        return Response({
            "is_serviceable": is_serviceable,
            "city": closest_hub["city"] if closest_hub else "Tamil Nadu Hub",
            "distance_to_hub_km": round(min_dist, 2),
            "service_modes": ["INSTANT", "SCHEDULED"] if is_serviceable else [],
            "message": msg,
        })


class TamilNaduDistrictsView(APIView):
    """
    GET /api/v1/locations/districts/
    Returns list of all supported Tamil Nadu districts and hubs.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        districts = [
            {"id": "chennai", "name": "Chennai", "lat": 13.0827, "lng": 80.2707, "is_active": True},
            {"id": "coimbatore", "name": "Coimbatore", "lat": 11.0168, "lng": 76.9558, "is_active": True},
            {"id": "madurai", "name": "Madurai", "lat": 9.9252, "lng": 78.1198, "is_active": True},
            {"id": "trichy", "name": "Tiruchirappalli (Trichy)", "lat": 10.7905, "lng": 78.7047, "is_active": True},
            {"id": "salem", "name": "Salem", "lat": 11.6643, "lng": 78.1460, "is_active": True},
            {"id": "tiruppur", "name": "Tiruppur", "lat": 11.1085, "lng": 77.3411, "is_active": True},
            {"id": "erode", "name": "Erode", "lat": 11.3410, "lng": 77.7172, "is_active": True},
            {"id": "tirunelveli", "name": "Tirunelveli", "lat": 8.7139, "lng": 77.7567, "is_active": True},
            {"id": "vellore", "name": "Vellore", "lat": 12.9165, "lng": 79.1325, "is_active": True},
            {"id": "thanjavur", "name": "Thanjavur", "lat": 10.7870, "lng": 79.1378, "is_active": True},
            {"id": "thoothukudi", "name": "Thoothukudi (Tuticorin)", "lat": 8.7642, "lng": 78.1348, "is_active": True},
            {"id": "dindigul", "name": "Dindigul", "lat": 10.3673, "lng": 77.9803, "is_active": True},
            {"id": "kanchipuram", "name": "Kanchipuram", "lat": 12.8342, "lng": 79.7036, "is_active": True},
            {"id": "chengalpattu", "name": "Chengalpattu", "lat": 12.6841, "lng": 79.9836, "is_active": True},
            {"id": "tiruvallur", "name": "Tiruvallur", "lat": 13.1432, "lng": 79.9074, "is_active": True},
            {"id": "cuddalore", "name": "Cuddalore", "lat": 11.7480, "lng": 79.7714, "is_active": True},
            {"id": "karur", "name": "Karur", "lat": 10.9601, "lng": 78.0766, "is_active": True},
            {"id": "kanyakumari", "name": "Nagercoil (Kanyakumari)", "lat": 8.1833, "lng": 77.4119, "is_active": True},
            {"id": "krishnagiri", "name": "Hosur / Krishnagiri", "lat": 12.7409, "lng": 77.8253, "is_active": True},
            {"id": "dharmapuri", "name": "Dharmapuri", "lat": 12.1211, "lng": 78.1582, "is_active": True},
            {"id": "namakkal", "name": "Namakkal", "lat": 11.2189, "lng": 78.1674, "is_active": True},
            {"id": "virudhunagar", "name": "Virudhunagar", "lat": 9.5872, "lng": 77.9578, "is_active": True},
            {"id": "sivakasi", "name": "Sivakasi", "lat": 9.4533, "lng": 77.7947, "is_active": True},
            {"id": "sivagangai", "name": "Sivagangai", "lat": 9.8433, "lng": 78.4809, "is_active": True},
            {"id": "ramanathapuram", "name": "Ramanathapuram", "lat": 9.3639, "lng": 78.8395, "is_active": True},
            {"id": "pudukkottai", "name": "Pudukkottai", "lat": 10.3833, "lng": 78.8001, "is_active": True},
            {"id": "nagapattinam", "name": "Nagapattinam", "lat": 10.7667, "lng": 79.8417, "is_active": True},
            {"id": "tiruvarur", "name": "Tiruvarur", "lat": 10.7725, "lng": 79.6366, "is_active": True},
            {"id": "mayiladuthurai", "name": "Mayiladuthurai", "lat": 11.1075, "lng": 79.6524, "is_active": True},
            {"id": "ariyalur", "name": "Ariyalur", "lat": 11.1401, "lng": 79.0786, "is_active": True},
            {"id": "perambalur", "name": "Perambalur", "lat": 11.2342, "lng": 78.8821, "is_active": True},
            {"id": "viluppuram", "name": "Viluppuram", "lat": 11.9401, "lng": 79.4861, "is_active": True},
            {"id": "kallakurichi", "name": "Kallakurichi", "lat": 11.7383, "lng": 78.9639, "is_active": True},
            {"id": "tiruvannamalai", "name": "Tiruvannamalai", "lat": 12.2253, "lng": 79.0747, "is_active": True},
            {"id": "ranipet", "name": "Ranipet", "lat": 12.9279, "lng": 79.3330, "is_active": True},
            {"id": "tirupathur", "name": "Tirupathur", "lat": 12.4958, "lng": 78.5678, "is_active": True},
            {"id": "theni", "name": "Theni", "lat": 10.0104, "lng": 77.4768, "is_active": True},
            {"id": "ooty", "name": "Nilgiris (Ooty)", "lat": 11.4102, "lng": 76.6950, "is_active": True},
            {"id": "tenkasi", "name": "Tenkasi", "lat": 8.9594, "lng": 77.3150, "is_active": True},
        ]
        return Response({
            "state": "Tamil Nadu",
            "coverage": "All 38 Districts",
            "total_districts": len(districts),
            "districts": districts,
        })

