"""
Views for Payments, Invoicing, and Partner Earnings.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.accounts.permissions import IsCustomer, IsPartner
from apps.bookings.models import Booking
from .models import Payment, PartnerEarning
from .serializers import (
    CreateOrderSerializer,
    VerifyPaymentSerializer,
    PaymentSerializer,
    PartnerEarningSerializer,
    RequestPayoutSerializer,
)
from .services import (
    calculate_pricing_breakdown,
    create_payment_order,
    verify_and_complete_payment,
    generate_invoice_data,
)


class HealthView(APIView):
    """Health check endpoint for the payments app."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"app": "payments", "status": "ok", "timestamp": timezone.now().isoformat()})


class CreateOrderView(APIView):
    """
    POST /api/v1/payments/create-order/
    Initializes a payment order for a booking.
    Body: {"booking_id": "<uuid>", "method": "UPI" | "CARD" | "NETBANKING" | "CASH"}
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking_id = serializer.validated_data["booking_id"]
        method = serializer.validated_data["method"]

        customer = request.user.customer_profile
        booking = get_object_or_404(Booking, id=booking_id, customer=customer)

        if booking.status not in [Booking.Status.COMPLETED, Booking.Status.IN_PROGRESS, Booking.Status.MATCHED, Booking.Status.CONFIRMED]:
            return Response(
                {"detail": f"Cannot initiate payment for booking with status '{booking.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order_data = create_payment_order(booking=booking, customer=customer, method=method)
            return Response(order_data, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyPaymentView(APIView):
    """
    POST /api/v1/payments/verify/
    Verifies gateway payment signature and records success.
    Body: {"payment_id": "<uuid>", "gateway_payment_id": "...", "gateway_signature": "...", "method": "..."}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_id = serializer.validated_data["payment_id"]
        gateway_payment_id = serializer.validated_data.get("gateway_payment_id", "")
        gateway_signature = serializer.validated_data.get("gateway_signature", "")
        method = serializer.validated_data.get("method")

        payment = get_object_or_404(Payment, id=payment_id)

        # Check permission: customer of payment or admin
        is_owner = hasattr(request.user, "customer_profile") and payment.customer == request.user.customer_profile
        is_admin = request.user.is_staff or getattr(request.user, "role", None) == "ADMIN"

        if not (is_owner or is_admin):
            return Response({"detail": "Not authorized to verify this payment."}, status=status.HTTP_403_FORBIDDEN)

        try:
            completed_payment = verify_and_complete_payment(
                payment=payment,
                gateway_payment_id=gateway_payment_id,
                gateway_signature=gateway_signature,
                method=method,
            )
            return Response(
                {
                    "message": "Payment verified and recorded successfully!",
                    "payment": PaymentSerializer(completed_payment).data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            return Response({"detail": f"Payment verification failed: {exc}"}, status=status.HTTP_400_BAD_REQUEST)


class BookingPaymentDetailView(APIView):
    """
    GET /api/v1/payments/booking/<uuid:booking_id>/
    Retrieves current payment status and pricing breakdown for a booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)

        # Access check
        is_customer = hasattr(request.user, "customer_profile") and booking.customer == request.user.customer_profile
        is_partner = hasattr(request.user, "partner_profile") and booking.partner == request.user.partner_profile
        is_admin = request.user.is_staff or getattr(request.user, "role", None) == "ADMIN"

        if not (is_customer or is_partner or is_admin):
            return Response({"detail": "Not authorized to view payment details."}, status=status.HTTP_403_FORBIDDEN)

        payment = getattr(booking, "payment", None)
        pricing = calculate_pricing_breakdown(booking.final_price or booking.quoted_price)

        return Response({
            "booking_id": str(booking.id),
            "booking_status": booking.status,
            "pricing": pricing,
            "payment": PaymentSerializer(payment).data if payment else None,
            "is_paid": payment.status == Payment.PaymentStatus.SUCCESS if payment else False,
        })


class BookingInvoiceView(APIView):
    """
    GET /api/v1/payments/booking/<uuid:booking_id>/invoice/
    Returns formal tax invoice data for a completed booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)

        # Access check
        is_customer = hasattr(request.user, "customer_profile") and booking.customer == request.user.customer_profile
        is_partner = hasattr(request.user, "partner_profile") and booking.partner == request.user.partner_profile
        is_admin = request.user.is_staff or getattr(request.user, "role", None) == "ADMIN"

        if not (is_customer or is_partner or is_admin):
            return Response({"detail": "Not authorized to view invoice."}, status=status.HTTP_403_FORBIDDEN)

        invoice_data = generate_invoice_data(booking)
        return Response(invoice_data, status=status.HTTP_200_OK)


class PartnerEarningsSummaryView(APIView):
    """
    GET /api/v1/payments/partner/earnings/
    Returns earnings balance, breakdown, and historical payouts for the authenticated partner.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def get(self, request):
        partner = request.user.partner_profile
        earnings_qs = PartnerEarning.objects.filter(partner=partner).order_by("-created_at")

        agg = earnings_qs.aggregate(
            total_gross=Sum("gross_amount"),
            total_net=Sum("net_amount"),
            total_commission=Sum("platform_commission"),
        )

        pending_agg = earnings_qs.filter(is_paid_out=False).aggregate(
            pending_net=Sum("net_amount"),
            pending_count=Count("id"),
        )

        completed_agg = earnings_qs.filter(is_paid_out=True).aggregate(
            paid_net=Sum("net_amount"),
        )

        total_net = float(agg["total_net"] or 0)
        pending_net = float(pending_agg["pending_net"] or 0)
        paid_net = float(completed_agg["paid_net"] or 0)
        total_gross = float(agg["total_gross"] or 0)
        total_commission = float(agg["total_commission"] or 0)

        recent_earnings = earnings_qs[:30]

        return Response({
            "summary": {
                "total_gross": total_gross,
                "total_net": total_net,
                "platform_commission": total_commission,
                "pending_payout": pending_net,
                "completed_payout": paid_net,
                "pending_jobs_count": pending_agg["pending_count"] or 0,
                "total_jobs_completed": partner.total_jobs_completed or earnings_qs.count(),
            },
            "recent_earnings": PartnerEarningSerializer(recent_earnings, many=True).data,
        })


class PartnerRequestPayoutView(APIView):
    """
    POST /api/v1/payments/partner/request-payout/
    Partner requests withdrawal/payout of their pending balance.
    """
    permission_classes = [permissions.IsAuthenticated, IsPartner]

    def post(self, request):
        serializer = RequestPayoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        partner = request.user.partner_profile
        pending_qs = PartnerEarning.objects.filter(partner=partner, is_paid_out=False)

        pending_total = pending_qs.aggregate(total=Sum("net_amount"))["total"] or Decimal("0.00")

        if pending_total <= 0:
            return Response(
                {"detail": "No pending earnings available for payout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        updated_count = pending_qs.update(is_paid_out=True, paid_out_at=now)

        return Response(
            {
                "message": f"Payout of ₹{pending_total:.2f} requested successfully! Funds will be transferred to your registered bank account.",
                "amount": float(pending_total),
                "jobs_settled": updated_count,
                "requested_at": now.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class PaymentWebhookView(APIView):
    """
    POST /api/v1/payments/webhook/
    Asynchronous webhook handler for payment gateway notifications.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.data
        event_type = payload.get("event") or payload.get("type", "payment.captured")

        # In production, verify gateway signature header here
        return Response({"status": "received", "event": event_type}, status=status.HTTP_200_OK)
