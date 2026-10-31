"""
Django management command to seed initial development and demo data.
Run inside backend container: python manage.py seed_data
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.accounts.models import User, CustomerProfile, PartnerProfile
from apps.services.models import ServiceCategory, PartnerService
from apps.locations.models import ServiceAddress, PartnerLocation
from apps.bookings.models import Booking


class Command(BaseCommand):
    help = "Seeds initial categories, admin, customer, partner, addresses, and sample bookings."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("==> Seeding HomeWorks platform data..."))

        # 1. Admin Superuser
        admin_user, created = User.objects.get_or_create(
            email="admin@eworks.com",
            defaults={
                "first_name": "Admin",
                "last_name": "System",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
            },
        )
        if created:
            admin_user.set_password("Admin@123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("  [+] Created Superuser: admin@eworks.com (pass: Admin@123)"))
        else:
            self.stdout.write("  [*] Superuser admin@eworks.com already exists.")

        # 2. Service Categories
        categories_data = [
            {
                "name": "Electrician",
                "slug": "electrician",
                "description": "Wiring, switchboards, short circuit repairs, ceiling fan installations, fuse repairs.",
                "icon": "zap",
                "base_price": Decimal("199.00"),
                "estimated_duration_minutes": 45,
                "display_order": 1,
            },
            {
                "name": "Plumber",
                "slug": "plumber",
                "description": "Pipe leakages, tap repair, bathroom fittings, water motor setup, drainage unclogging.",
                "icon": "droplet",
                "base_price": Decimal("249.00"),
                "estimated_duration_minutes": 60,
                "display_order": 2,
            },
            {
                "name": "AC Repair & Service",
                "slug": "ac-repair",
                "description": "Deep jet cleaning, gas charging, cooling issue diagnosis, compressor service.",
                "icon": "wind",
                "base_price": Decimal("499.00"),
                "estimated_duration_minutes": 90,
                "display_order": 3,
            },
            {
                "name": "Carpenter",
                "slug": "carpenter",
                "description": "Furniture assembly, door hinges, lock installations, custom wooden repair.",
                "icon": "hammer",
                "base_price": Decimal("299.00"),
                "estimated_duration_minutes": 60,
                "display_order": 4,
            },
            {
                "name": "Appliance Repair",
                "slug": "appliance-repair",
                "description": "Washing machine, refrigerator, microwave oven, and water purifier diagnostics.",
                "icon": "cpu",
                "base_price": Decimal("349.00"),
                "estimated_duration_minutes": 75,
                "display_order": 5,
            },
            {
                "name": "Home Deep Cleaning",
                "slug": "cleaning",
                "description": "Full bathroom sanitation, kitchen degreasing, sofa shampooing, full home sparkle.",
                "icon": "sparkles",
                "base_price": Decimal("599.00"),
                "estimated_duration_minutes": 120,
                "display_order": 6,
            },
        ]

        category_objs = {}
        for cat in categories_data:
            obj, _ = ServiceCategory.objects.update_or_create(
                slug=cat["slug"],
                defaults=cat,
            )
            category_objs[cat["slug"]] = obj
        self.stdout.write(self.style.SUCCESS(f"  [+] Seeded {len(category_objs)} service categories."))

        # 3. Demo Customer
        customer_user, cust_created = User.objects.get_or_create(
            email="customer@eworks.com",
            defaults={
                "first_name": "Priya",
                "last_name": "Sharma",
                "phone": "+919876543210",
                "role": User.Role.CUSTOMER,
                "is_verified": True,
                "is_phone_verified": True,
            },
        )
        if cust_created:
            customer_user.set_password("Customer@123")
            customer_user.save()
            self.stdout.write(self.style.SUCCESS("  [+] Created Demo Customer: customer@eworks.com (pass: Customer@123)"))

        cust_profile = customer_user.customer_profile
        cust_profile.default_address = "Flat 4B, Emerald Heights, Anna Nagar, Chennai"
        cust_profile.default_latitude = Decimal("13.0850")
        cust_profile.default_longitude = Decimal("80.2173")
        cust_profile.save()

        # Customer Addresses
        home_addr, _ = ServiceAddress.objects.update_or_create(
            customer=cust_profile,
            label="Home",
            defaults={
                "address_line_1": "Flat 4B, Emerald Heights, Anna Nagar",
                "address_line_2": "Near Roundtana",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600040",
                "country": "India",
                "location": Point(80.2173, 13.0850),
                "is_default": True,
            },
        )

        office_addr, _ = ServiceAddress.objects.update_or_create(
            customer=cust_profile,
            label="Office",
            defaults={
                "address_line_1": "Level 4, Zenith Tech Tower, T. Nagar",
                "address_line_2": "Opposite Pondy Bazaar",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600017",
                "country": "India",
                "location": Point(80.2337, 13.0418),
                "is_default": False,
            },
        )
        self.stdout.write(self.style.SUCCESS("  [+] Seeded Customer addresses (Home & Office)"))

        # 4. Demo Partners
        partners_data = [
            {
                "email": "partner@eworks.com",
                "password": "Partner@123",
                "first_name": "Ramesh",
                "last_name": "Kumar",
                "phone": "+919876543220",
                "bio": "Certified electrician with 8+ years experience in domestic and commercial rewiring.",
                "years_of_experience": 8,
                "avg_rating": Decimal("4.92"),
                "total_jobs": 45,
                "total_reviews": 38,
                "categories": ["electrician", "appliance-repair"],
                "lat": 13.0845,
                "lng": 80.2185,
            },
            {
                "email": "plumber.partner@eworks.com",
                "password": "Partner@123",
                "first_name": "Suresh",
                "last_name": "Raina",
                "phone": "+919876543221",
                "bio": "Expert plumber specializing in high-pressure plumbing, bathroom fixtures and line repairs.",
                "years_of_experience": 6,
                "avg_rating": Decimal("4.85"),
                "total_jobs": 31,
                "total_reviews": 24,
                "categories": ["plumber"],
                "lat": 13.0870,
                "lng": 80.2200,
            },
            {
                "email": "ac.partner@eworks.com",
                "password": "Partner@123",
                "first_name": "Anand",
                "last_name": "Raj",
                "phone": "+919876543222",
                "bio": "HVAC certified master technician. Split AC, Inverter AC installation and maintenance.",
                "years_of_experience": 10,
                "avg_rating": Decimal("4.96"),
                "total_jobs": 62,
                "total_reviews": 54,
                "categories": ["ac-repair"],
                "lat": 13.0820,
                "lng": 80.2150,
            },
        ]

        for pdata in partners_data:
            p_user, p_created = User.objects.get_or_create(
                email=pdata["email"],
                defaults={
                    "first_name": pdata["first_name"],
                    "last_name": pdata["last_name"],
                    "phone": pdata["phone"],
                    "role": User.Role.PARTNER,
                    "is_verified": True,
                    "is_phone_verified": True,
                },
            )
            if p_created:
                p_user.set_password(pdata["password"])
                p_user.save()
                self.stdout.write(self.style.SUCCESS(f"  [+] Created Partner: {pdata['email']} (pass: {pdata['password']})"))

            p_profile = p_user.partner_profile
            p_profile.status = PartnerProfile.Status.APPROVED
            p_profile.is_online = True
            p_profile.bio = pdata["bio"]
            p_profile.years_of_experience = pdata["years_of_experience"]
            p_profile.average_rating = pdata["avg_rating"]
            p_profile.total_jobs_completed = pdata["total_jobs"]
            p_profile.total_reviews = pdata["total_reviews"]
            p_profile.service_radius_km = 15.0
            p_profile.approved_at = timezone.now()
            p_profile.save()

            # Partner Location
            PartnerLocation.objects.update_or_create(
                partner=p_profile,
                defaults={
                    "location": Point(pdata["lng"], pdata["lat"]),
                    "accuracy_meters": 5.0,
                },
            )

            # Partner Services
            for cat_slug in pdata["categories"]:
                if cat_slug in category_objs:
                    PartnerService.objects.get_or_create(
                        partner=p_profile,
                        category=category_objs[cat_slug],
                        defaults={"is_active": True, "experience_years": pdata["years_of_experience"]},
                    )

        self.stdout.write(self.style.SUCCESS("  [+] Seeded 3 verified active partners with GPS coordinates & skills."))

        # 5. Sample Active Booking
        ramesh_profile = User.objects.get(email="partner@eworks.com").partner_profile
        elec_cat = category_objs["electrician"]

        booking, b_created = Booking.objects.get_or_create(
            customer=cust_profile,
            service_category=elec_cat,
            status=Booking.Status.MATCHED,
            defaults={
                "booking_type": Booking.BookingType.INSTANT,
                "partner": ramesh_profile,
                "service_address": home_addr,
                "service_latitude": Decimal("13.0850"),
                "service_longitude": Decimal("80.2173"),
                "service_address_text": "Flat 4B, Emerald Heights, Anna Nagar, Chennai",
                "problem_description": "Ceiling fan sparking and switchboard loose connection in master bedroom.",
                "quoted_price": Decimal("199.00"),
                "job_start_otp": "4821",
                "confirmed_at": timezone.now(),
            },
        )
        if b_created:
            self.stdout.write(self.style.SUCCESS(f"  [+] Created Sample Live Booking: {booking.id} (OTP: 4821)"))

        self.stdout.write(self.style.SUCCESS("==> All seed data successfully populated!"))
