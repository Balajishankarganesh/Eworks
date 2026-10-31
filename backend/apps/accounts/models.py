"""
Custom User model for Home Services Marketplace.
Extends AbstractBaseUser to support role-based access:
  - CUSTOMER
  - PARTNER (service professional)
  - ADMIN
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_verified", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Central user model — used for all three roles.
    Role-specific data lives in CustomerProfile / PartnerProfile.
    """

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        PARTNER = "PARTNER", "Service Partner"
        ADMIN = "ADMIN", "Administrator"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    phone = PhoneNumberField(unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CUSTOMER)

    # Flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)      # email/phone verified
    is_phone_verified = models.BooleanField(default=False)

    # Profile photo
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Timestamps
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name"]

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["email", "role"]),
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_partner(self):
        return self.role == self.Role.PARTNER

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN


class CustomerProfile(models.Model):
    """Extended data for CUSTOMER role users."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        limit_choices_to={"role": User.Role.CUSTOMER},
    )
    default_address = models.TextField(blank=True)
    default_latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    default_longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    total_bookings = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_customer_profile"
        verbose_name = "Customer Profile"

    def __str__(self):
        return f"CustomerProfile({self.user.email})"


class PartnerProfile(models.Model):
    """Extended data for PARTNER role users."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Verification"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="partner_profile",
        limit_choices_to={"role": User.Role.PARTNER},
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING, db_index=True
    )

    # Professional details
    bio = models.TextField(blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    id_proof_number = models.CharField(max_length=50, blank=True)

    # Operational settings
    is_online = models.BooleanField(default=False, db_index=True)
    service_radius_km = models.FloatField(default=5.0)

    # Ratings (denormalized for performance)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)
    total_jobs_completed = models.PositiveIntegerField(default=0)

    # Admin metadata
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_partners",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_partner_profile"
        verbose_name = "Partner Profile"
        indexes = [
            models.Index(fields=["status", "is_online"]),
        ]

    def __str__(self):
        return f"PartnerProfile({self.user.email}) [{self.status}]"

    @property
    def is_approved(self):
        return self.status == self.Status.APPROVED

    @property
    def total_completed_jobs(self):
        return self.total_jobs_completed



class PartnerVerification(models.Model):
    """Document uploads submitted by partners for admin verification."""

    class DocumentType(models.TextChoices):
        AADHAAR = "AADHAAR", "Aadhaar Card"
        PAN = "PAN", "PAN Card"
        DRIVING_LICENSE = "DRIVING_LICENSE", "Driving License"
        POLICE_CLEARANCE = "POLICE_CLEARANCE", "Police Clearance Certificate"
        SKILL_CERTIFICATE = "SKILL_CERT", "Skill Certificate"
        OTHER = "OTHER", "Other"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    partner = models.ForeignKey(
        PartnerProfile,
        on_delete=models.CASCADE,
        related_name="verifications",
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    document_number = models.CharField(max_length=50, blank=True)
    document_file = models.FileField(upload_to="documents/partner/%Y/%m/")
    status = models.CharField(
        max_length=10,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
    )
    admin_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_verifications",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "accounts_partner_verification"
        verbose_name = "Partner Verification"
        unique_together = [("partner", "document_type")]

    def __str__(self):
        return f"{self.partner} — {self.document_type} [{self.status}]"
