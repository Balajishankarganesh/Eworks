"""
Tests for the payments app — order creation, verification, earnings, invoice, webhook.
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework import status

from apps.payments.models import Payment, PartnerEarning
from apps.payments.services import (
    calculate_pricing_breakdown,
    create_payment_order,
    verify_and_complete_payment,
    generate_invoice_data,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Pricing Breakdown
# ═══════════════════════════════════════════════════════════════════════════════

class TestPricingBreakdown:

    def test_pricing_breakdown_correct(self):
        pricing = calculate_pricing_breakdown(Decimal("299.00"))
        assert pricing["service_price"] == 299.00
        assert pricing["convenience_fee"] == 0.0
        assert pricing["gst_amount"] == 0.0
        assert pricing["total_amount"] == pricing["service_price"]
        assert pricing["partner_payout"] == pricing["service_price"]

    def test_pricing_zero_amount(self):
        pricing = calculate_pricing_breakdown(Decimal("0"))
        assert pricing["service_price"] == 0.0
        assert pricing["total_amount"] == 0.0

    def test_partner_payout_is_100_percent_free(self):
        pricing = calculate_pricing_breakdown(Decimal("1000.00"))
        assert pricing["partner_payout"] == 1000.00
        assert pricing["platform_commission"] == 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# Payment Order Creation
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreatePaymentOrder:

    def test_create_order_upi(self, completed_booking, customer_profile):
        result = create_payment_order(completed_booking, customer_profile, method="UPI")
        assert "payment_id" in result
        assert "order_id" in result
        assert result["currency"] == "INR"
        assert result["amount"] > 0

    def test_create_order_cash(self, completed_booking, customer_profile):
        result = create_payment_order(completed_booking, customer_profile, method="CASH")
        assert result["method"] == "CASH"
        assert "cash_order_" in result["order_id"]

    def test_cannot_create_order_for_paid_booking(self, completed_booking, customer_profile):
        # First payment
        create_payment_order(completed_booking, customer_profile, method="UPI")
        # Mark it as SUCCESS
        payment = Payment.objects.get(booking=completed_booking)
        payment.status = Payment.PaymentStatus.SUCCESS
        payment.save()

        from django.core.exceptions import ValidationError
        with pytest.raises(ValidationError):
            create_payment_order(completed_booking, customer_profile, method="UPI")


# ═══════════════════════════════════════════════════════════════════════════════
# Payment Verification
# ═══════════════════════════════════════════════════════════════════════════════

class TestVerifyPayment:

    def test_verify_payment_success(self, payment, partner_profile):
        completed = verify_and_complete_payment(
            payment=payment,
            gateway_payment_id="test_pay_123",
            gateway_signature="test_sig",
        )
        assert completed.status == Payment.PaymentStatus.SUCCESS
        assert completed.gateway_transaction_id

    def test_verify_creates_partner_earning(self, payment, partner_profile):
        verify_and_complete_payment(payment=payment, gateway_payment_id="test_pay_456")
        earning = PartnerEarning.objects.filter(booking=payment.booking).first()
        assert earning is not None
        assert earning.net_amount > 0
        assert earning.is_paid_out is False

    def test_verify_already_paid(self, payment):
        payment.status = Payment.PaymentStatus.SUCCESS
        payment.save()
        result = verify_and_complete_payment(payment=payment, gateway_payment_id="dup")
        assert result.status == Payment.PaymentStatus.SUCCESS


# ═══════════════════════════════════════════════════════════════════════════════
# Invoice Generation
# ═══════════════════════════════════════════════════════════════════════════════

class TestInvoiceGeneration:

    def test_generate_invoice(self, completed_booking):
        invoice = generate_invoice_data(completed_booking)
        assert "invoice_number" in invoice
        assert invoice["invoice_number"].startswith("INV-")
        assert "pricing" in invoice
        assert "customer" in invoice
        assert "service" in invoice


# ═══════════════════════════════════════════════════════════════════════════════
# Payment API Views
# ═══════════════════════════════════════════════════════════════════════════════

class TestPaymentViews:

    def test_health_endpoint(self, anon_api_client):
        response = anon_api_client.get("/api/v1/payments/health/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_order_endpoint(self, customer_api_client, completed_booking):
        response = customer_api_client.post(
            "/api/v1/payments/create-order/",
            {"booking_id": str(completed_booking.id), "method": "UPI"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_booking_payment_detail(self, customer_api_client, completed_booking):
        response = customer_api_client.get(
            f"/api/v1/payments/booking/{completed_booking.id}/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert "pricing" in response.data

    def test_booking_invoice(self, customer_api_client, completed_booking):
        response = customer_api_client.get(
            f"/api/v1/payments/booking/{completed_booking.id}/invoice/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert "invoice_number" in response.data

    def test_partner_earnings_summary(self, partner_api_client, partner_profile):
        response = partner_api_client.get("/api/v1/payments/partner/earnings/")
        assert response.status_code == status.HTTP_200_OK
        assert "summary" in response.data

    def test_partner_request_payout_no_balance(self, partner_api_client, partner_profile):
        response = partner_api_client.post(
            "/api/v1/payments/partner/request-payout/", format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_webhook_endpoint(self, anon_api_client):
        response = anon_api_client.post(
            "/api/v1/payments/webhook/",
            {"event": "payment.captured", "payload": {}},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_customer_cannot_access_partner_earnings(self, customer_api_client):
        response = customer_api_client.get("/api/v1/payments/partner/earnings/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
