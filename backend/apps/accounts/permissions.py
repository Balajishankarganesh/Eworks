"""Custom DRF permissions for role-based access control."""
from rest_framework.permissions import BasePermission
from .models import User


class IsCustomer(BasePermission):
    """Allow access only to CUSTOMER role users."""
    message = "This action requires a customer account."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.CUSTOMER)


class IsPartner(BasePermission):
    """Allow access only to PARTNER role users."""
    message = "This action requires a partner account."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.PARTNER)


class IsAdmin(BasePermission):
    """Allow access only to ADMIN role users."""
    message = "This action requires an administrator account."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == User.Role.ADMIN or request.user.is_staff)
        )


class IsApprovedPartner(BasePermission):
    """Allow access only to APPROVED partners who are online."""
    message = "Your partner account must be approved to access this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == User.Role.PARTNER):
            return False
        try:
            return request.user.partner_profile.is_approved
        except Exception:
            return False


class IsOwnerOrAdmin(BasePermission):
    """Allow access only to the object owner or an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN or request.user.is_staff:
            return True
        # obj must have a `user` attribute
        owner = getattr(obj, "user", getattr(obj, "customer", getattr(obj, "partner", None)))
        return owner == request.user
