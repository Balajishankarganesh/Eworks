from django.urls import path
from .views import (
    HealthView,
    CreateOrderView,
    VerifyPaymentView,
    BookingPaymentDetailView,
    BookingInvoiceView,
    PartnerEarningsSummaryView,
    PartnerRequestPayoutView,
    PaymentWebhookView,
)

app_name = "payments"

urlpatterns = [
    path("health/", HealthView.as_view(), name="payments-health"),
    path("create-order/", CreateOrderView.as_view(), name="payment-create-order"),
    path("verify/", VerifyPaymentView.as_view(), name="payment-verify"),
    path("booking/<uuid:booking_id>/", BookingPaymentDetailView.as_view(), name="payment-booking-detail"),
    path("booking/<uuid:booking_id>/invoice/", BookingInvoiceView.as_view(), name="payment-booking-invoice"),
    path("partner/earnings/", PartnerEarningsSummaryView.as_view(), name="payment-partner-earnings"),
    path("partner/request-payout/", PartnerRequestPayoutView.as_view(), name="payment-partner-request-payout"),
    path("webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
]
