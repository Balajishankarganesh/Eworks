"""Signal handlers for the accounts app."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, CustomerProfile, PartnerProfile


@receiver(post_save, sender=User)
def create_role_profile(sender, instance: User, created: bool, **kwargs):
    """Automatically create the role-specific profile when a User is created."""
    if not created:
        return

    if instance.role == User.Role.CUSTOMER:
        CustomerProfile.objects.get_or_create(user=instance)
    elif instance.role == User.Role.PARTNER:
        PartnerProfile.objects.get_or_create(user=instance)
