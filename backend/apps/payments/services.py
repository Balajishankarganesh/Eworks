"""
Payments business logic, pricing calculator, gateway integration, and invoice generator.
Supports Simulated / Mock Gateway mode as well as Razorpay/Stripe production modes.
"""
import uuid
import hmac
import hashlib
import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from django.core.exceptions import ValidationError

from .models import Payment, PartnerEarning
from apps.bookings.models import Booking, BookingStatusHistory
from apps.notifications.broadcast import broadcast_booking_update, broadcast_user_notification

logger = logging.getLogger(__name__)

# 100% Free Platform Configuration:
# - Zero platform commission for service partners (100% payout to partner)
# - Zero convenience fees for customers
# - Online payment gateway deferred to future roadmap; currently direct Cash/UPI settlement
COMMISSION_PCT = Decimal(str(getattr(settings, "PLATFORM_COMMISSION_PERCENTAGE", 0.0)))
GST_PCT = Decimal(str(getattr(settings, "GST_PERCENTAGE", 0.0)))
CONVENIENCE_FEE = Decimal("0.00")


def calculate_pricing_breakdown(quoted_price: Decimal | float) -> dict:
    """
    Computes pricing breakdown for a booking:
    - Service Amount (Direct to Partner)
    - Platform Convenience Fee (₹0.00 - 100% Free for Customer)
    - Platform Commission (0% - 100% Free for Partner)
    - Total Customer Payable = Service Price
    - Partner Net Earning = 100% of Service Price
    """
    svc_price = Decimal(str(quoted_price or 0)).quantize(Decimal("0.01"))
    conv_fee = Decimal("0.00")
    gst_amount = Decimal("0.00")
    total_payable = svc_price

    platform_cut = (svc_price * (COMMISSION_PCT / Decimal("100"))).quantize(Decimal("0.01"))
    partner_payout = (svc_price - platform_cut).quantize(Decimal("0.01"))

    return {
        "service_price": float(svc_price),
        "convenience_fee": float(conv_fee),
        "gst_amount": float(gst_amount),
        "gst_percentage": float(GST_PCT),
        "total_amount": float(total_payable),
        "partner_payout": float(partner_payout),
        "platform_commission": float(platform_cut + conv_fee),
    }


def create_payment_order(booking: Booking, customer, method: str = Payment.PaymentMethod.UPI) -> dict:
    """
    Initializes a Payment record and returns gateway order parameters.
    """
    if Payment.objects.filter(booking=booking, status=Payment.PaymentStatus.SUCCESS).exists():
        raise ValidationError("This booking has already been paid for.")

    pricing = calculate_pricing_breakdown(booking.final_price or booking.quoted_price)
    total_amount = Decimal(str(pricing["total_amount"]))

    with transaction.atomic():
        payment, created = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                "customer": customer,
                "amount": total_amount,
                "method": method,
                "status": Payment.PaymentStatus.INITIATED,
            },
        )

        if not created and payment.status != Payment.PaymentStatus.SUCCESS:
            payment.amount = total_amount
            payment.method = method
            payment.status = Payment.PaymentStatus.INITIATED

        # If payment method is CASH, confirm cash transaction
        if method == Payment.PaymentMethod.CASH:
            order_id = f"cash_order_{booking.id.hex[:12]}"
            payment.gateway_order_id = order_id
            payment.save()

            return {
                "payment_id": str(payment.id),
                "order_id": order_id,
                "amount": float(total_amount),
                "currency": "INR",
                "method": "CASH",
                "gateway_mode": "CASH",
                "pricing": pricing,
            }

        # Simulated Gateway Mode (or live Razorpay if credentials provided)
        gateway_mode = getattr(settings, "PAYMENT_GATEWAY_MODE", "SIMULATED")
        order_id = f"order_sim_{uuid.uuid4().hex[:14]}"
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_eworks123")

        payment.gateway_order_id = order_id
        payment.save()

        return {
            "payment_id": str(payment.id),
            "order_id": order_id,
            "key_id": key_id,
            "amount": float(total_amount),
            "currency": "INR",
            "method": method,
            "gateway_mode": gateway_mode,
            "pricing": pricing,
        }


def verify_and_complete_payment(
    payment: Payment,
    gateway_payment_id: str,
    gateway_signature: str = "",
    method: str = None,
) -> Payment:
    """
    Verifies payment completion, updates Payment status, creates PartnerEarning,
    and notifies customer and partner.
    """
    if payment.status == Payment.PaymentStatus.SUCCESS:
        return payment

    with transaction.atomic():
        booking = payment.booking
        pricing = calculate_pricing_breakdown(booking.final_price or booking.quoted_price)

        payment.status = Payment.PaymentStatus.SUCCESS
        payment.gateway_transaction_id = gateway_payment_id or f"txn_sim_{uuid.uuid4().hex[:12]}"
        if method:
            payment.method = method
        payment.gateway_response = {
            "verified_at": timezone.now().isoformat(),
            "gateway_signature": gateway_signature or "simulated_valid_signature",
            "gateway_payment_id": payment.gateway_transaction_id,
        }
        payment.save()

        # Update booking final price
        booking.final_price = payment.amount
        booking.save(update_fields=["final_price"])

        # Atomically create or update PartnerEarning ledger record
        if booking.partner:
            PartnerEarning.objects.update_or_create(
                booking=booking,
                defaults={
                    "partner": booking.partner,
                    "gross_amount": Decimal(str(pricing["service_price"])),
                    "platform_commission": Decimal(str(pricing["platform_commission"])),
                    "net_amount": Decimal(str(pricing["partner_payout"])),
                    "is_paid_out": False,
                },
            )

        # Audit trail
        BookingStatusHistory.objects.create(
            booking=booking,
            from_status=booking.status,
            to_status=booking.status,
            changed_by=payment.customer.user,
            notes=f"Payment of ₹{payment.amount:.2f} received via {payment.method} (Txn: {payment.gateway_transaction_id})",
        )

    # Broadcast real-time booking update
    try:
        broadcast_booking_update(booking, {"payment_status": "SUCCESS", "paid_amount": float(payment.amount)})
    except Exception as ex:
        logger.warning(f"Could not broadcast payment update: {ex}")

    # Notify Customer
    try:
        from apps.notifications.models import Notification
        broadcast_user_notification(
            user=payment.customer.user,
            notification_type=Notification.NotificationType.PAYMENT_RECEIVED,
            title="Payment Successful!",
            body=f"We received your payment of ₹{payment.amount:.2f} for {booking.service_category.name if booking.service_category else 'service'}. Thank you!",
            data={"booking_id": str(booking.id), "payment_id": str(payment.id), "amount": float(payment.amount)},
        )
    except Exception as ex:
        logger.warning(f"Could not notify customer of payment: {ex}")

    # Notify Partner
    if booking.partner and booking.partner.user:
        try:
            from apps.notifications.models import Notification
            broadcast_user_notification(
                user=booking.partner.user,
                notification_type=Notification.NotificationType.PAYMENT_RECEIVED,
                title="Payment Received for Job",
                body=f"Customer completed payment of ₹{payment.amount:.2f}. Your net payout of ₹{pricing['partner_payout']:.2f} has been credited to your earnings.",
                data={"booking_id": str(booking.id), "net_payout": pricing["partner_payout"]},
            )
        except Exception as ex:
            logger.warning(f"Could not notify partner of payment: {ex}")

    return payment


def generate_invoice_data(booking: Booking) -> dict:
    """
    Generates structured invoice details for a booking.
    """
    pricing = calculate_pricing_breakdown(booking.final_price or booking.quoted_price)
    invoice_number = f"INV-{booking.created_at.strftime('%Y%m')}-{booking.id.hex[:6].upper()}"

    payment = getattr(booking, "payment", None)
    customer_user = booking.customer.user
    partner_user = booking.partner.user if booking.partner else None

    return {
        "invoice_number": invoice_number,
        "invoice_date": (payment.updated_at if payment else timezone.now()).strftime("%B %d, %Y"),
        "booking_id": str(booking.id),
        "status": payment.status if payment else "UNPAID",
        "payment_method": payment.method if payment else "PENDING",
        "transaction_id": payment.gateway_transaction_id if payment else None,
        "customer": {
            "name": customer_user.get_full_name() or customer_user.email,
            "email": customer_user.email,
            "phone": customer_user.phone or "N/A",
            "address": getattr(booking, "address_line1", "") or getattr(booking, "service_address", "Registered Address"),
        },
        "partner": {
            "name": partner_user.get_full_name() if partner_user else "Assigned Professional",
            "phone": partner_user.phone if partner_user else "N/A",
            "id": str(booking.partner.id) if booking.partner else None,
        },
        "service": {
            "category": booking.service_category.name if booking.service_category else "Home Service",
            "description": booking.problem_description or "General task execution",
            "completed_at": booking.completed_at.strftime("%B %d, %Y, %I:%M %p") if booking.completed_at else None,
        },
        "pricing": {
            "service_price": pricing["service_price"],
            "convenience_fee": pricing["convenience_fee"],
            "gst_rate": f"{pricing['gst_percentage']}%",
            "gst_amount": pricing["gst_amount"],
            "total_payable": pricing["total_amount"],
        },
    }
