"""
Views for Support Tickets, Admin Platform Analytics, and Audit Logs.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsAdmin
from apps.accounts.models import User, PartnerProfile, CustomerProfile
from apps.bookings.models import Booking
from apps.payments.models import Payment, PartnerEarning
from apps.notifications.broadcast import broadcast_user_notification
from .models import SupportTicket, AuditLog
from .audit import log_action
from .serializers import (
    SupportTicketSerializer,
    CreateSupportTicketSerializer,
    UpdateSupportTicketSerializer,
    AuditLogSerializer,
)


class HealthView(APIView):
    """Health check endpoint for support app."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"app": "support", "status": "ok", "timestamp": timezone.now().isoformat()})


class SupportTicketListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/support/tickets/ - List user tickets (or all tickets for admin).
    POST /api/v1/support/tickets/ - Create a new support or dispute ticket.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CreateSupportTicketSerializer
        return SupportTicketSerializer

    def get_queryset(self):
        user = self.request.user
        is_admin = user.is_staff or getattr(user, "role", None) == "ADMIN"

        if is_admin:
            qs = SupportTicket.objects.select_related("raised_by", "assigned_to", "booking").order_by("-created_at")
            status_param = self.request.query_params.get("status")
            category_param = self.request.query_params.get("category")
            if status_param:
                qs = qs.filter(status=status_param)
            if category_param:
                qs = qs.filter(category=category_param)
            return qs

        return SupportTicket.objects.filter(raised_by=user).select_related("raised_by", "booking").order_by("-created_at")

    def perform_create(self, serializer):
        ticket = serializer.save(raised_by=self.request.user)
        log_action(
            actor=self.request.user,
            action="SUPPORT_TICKET_CREATED",
            details={"ticket_id": str(ticket.id), "category": ticket.category, "subject": ticket.subject},
            request=self.request,
        )


class SupportTicketDetailUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/support/tickets/<id>/ - View ticket details.
    PATCH /api/v1/support/tickets/<id>/ - Update ticket status / add resolution notes (Admin).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ["PATCH", "PUT"]:
            return UpdateSupportTicketSerializer
        return SupportTicketSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, "role", None) == "ADMIN":
            return SupportTicket.objects.all()
        return SupportTicket.objects.filter(raised_by=user)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        updated = serializer.save()

        if updated.status == SupportTicket.TicketStatus.RESOLVED and old_status != SupportTicket.TicketStatus.RESOLVED:
            updated.resolved_at = timezone.now()
            updated.save(update_fields=["resolved_at"])

            # Notify ticket creator
            try:
                from apps.notifications.models import Notification
                broadcast_user_notification(
                    user=updated.raised_by,
                    notification_type=Notification.NotificationType.SYSTEM,
                    title="Support Ticket Resolved",
                    body=f"Your ticket '{updated.subject}' has been resolved: {updated.resolution_notes or 'Issue addressed by support staff.'}",
                    data={"ticket_id": str(updated.id), "status": updated.status},
                )
            except Exception:
                pass

        log_action(
            actor=self.request.user,
            action="SUPPORT_TICKET_UPDATED",
            details={"ticket_id": str(updated.id), "status": updated.status, "notes": updated.resolution_notes},
            request=self.request,
        )


class AdminPlatformAnalyticsView(APIView):
    """
    GET /api/v1/support/admin/analytics/
    Admin command center: High-level GMV revenue, active bookings, partner counts, and tickets.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)

        # 1. Bookings Statistics
        booking_agg = Booking.objects.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Booking.Status.COMPLETED)),
            in_progress=Count("id", filter=Q(status=Booking.Status.IN_PROGRESS)),
            matched=Count("id", filter=Q(status__in=[Booking.Status.MATCHED, Booking.Status.CONFIRMED, Booking.Status.PARTNER_EN_ROUTE])),
            matching=Count("id", filter=Q(status=Booking.Status.MATCHING)),
            cancelled=Count("id", filter=Q(status__in=[Booking.Status.CANCELLED_CUSTOMER, Booking.Status.CANCELLED_PARTNER, Booking.Status.CANCELLED_ADMIN])),
            no_partners=Count("id", filter=Q(status=Booking.Status.NO_PARTNERS)),
        )

        # 2. Revenue & Financials
        payment_agg = Payment.objects.filter(status=Payment.PaymentStatus.SUCCESS).aggregate(
            total_gmv=Sum("amount"),
        )
        earnings_agg = PartnerEarning.objects.aggregate(
            total_commission=Sum("platform_commission"),
            total_partner_payouts=Sum("net_amount"),
            pending_payouts=Sum("net_amount", filter=Q(is_paid_out=False)),
        )

        # 3. User Statistics
        total_customers = User.objects.filter(role=User.Role.CUSTOMER).count()
        partner_agg = PartnerProfile.objects.aggregate(
            total_partners=Count("id"),
            approved=Count("id", filter=Q(status=PartnerProfile.Status.APPROVED)),
            pending=Count("id", filter=Q(status=PartnerProfile.Status.PENDING)),
            online=Count("id", filter=Q(is_online=True)),
        )

        # 4. Support Tickets
        ticket_agg = SupportTicket.objects.aggregate(
            open_count=Count("id", filter=Q(status__in=[SupportTicket.TicketStatus.OPEN, SupportTicket.TicketStatus.IN_PROGRESS])),
            resolved_count=Count("id", filter=Q(status=SupportTicket.TicketStatus.RESOLVED)),
        )

        # 5. Recent 10 Bookings Feed
        recent_bookings = []
        for b in Booking.objects.select_related("customer__user", "partner__user", "service_category").order_by("-created_at")[:10]:
            recent_bookings.append({
                "id": str(b.id),
                "category": b.service_category.name if b.service_category else "Service",
                "customer_name": b.customer.user.get_full_name() or b.customer.user.email if b.customer else "Customer",
                "partner_name": b.partner.user.get_full_name() or b.partner.user.email if b.partner else "Unassigned",
                "status": b.status,
                "amount": float(b.total_amount or b.final_price or b.quoted_price or 0.0),
                "created_at": b.created_at.isoformat(),
            })

        return Response({
            "metrics": {
                "gmv": float(payment_agg["total_gmv"] or 0.0),
                "platform_revenue": float(earnings_agg["total_commission"] or 0.0),
                "partner_payouts": float(earnings_agg["total_partner_payouts"] or 0.0),
                "pending_payouts": float(earnings_agg["pending_payouts"] or 0.0),
                "total_bookings": booking_agg["total"],
                "completed_bookings": booking_agg["completed"],
                "active_bookings": booking_agg["in_progress"] + booking_agg["matched"],
                "cancelled_bookings": booking_agg["cancelled"],
                "no_partners_bookings": booking_agg["no_partners"],
                "total_customers": total_customers,
                "total_partners": partner_agg["total_partners"],
                "approved_partners": partner_agg["approved"],
                "pending_partners": partner_agg["pending"],
                "online_partners": partner_agg["online"],
                "open_tickets": ticket_agg["open_count"],
                "resolved_tickets": ticket_agg["resolved_count"],
            },
            "recent_bookings": recent_bookings,
            "timestamp": now.isoformat(),
        }, status=status.HTTP_200_OK)


class AdminAuditLogListView(generics.ListAPIView):
    """
    GET /api/v1/support/admin/audit-logs/
    Admin view of immutable system audit log trail.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        return AuditLog.objects.select_related("actor", "target_user").order_by("-created_at")[:100]
