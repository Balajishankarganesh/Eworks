"""
SMS & WhatsApp Gateway Service for Eworks.
Supports multiple providers:
- Console (default in development — logs formatted OTP to terminal)
- Fast2SMS (Indian SMS Gateway — fast & inexpensive OTP delivery)
- Twilio (Global SMS & WhatsApp API)
- MSG91 (Indian Enterprise SMS & OTP Gateway)
"""
import os
import re
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def clean_phone_number(phone: str) -> str:
    """Normalize phone number to standard 10-digit Indian mobile format or E.164."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits


def get_e164_phone(phone: str) -> str:
    """Format phone as international E.164 (+91XXXXXXXXXX)."""
    cleaned = clean_phone_number(phone)
    return f"+91{cleaned}"


class BaseSMSProvider:
    def send_sms(self, phone: str, message: str) -> dict:
        raise NotImplementedError

    def send_whatsapp(self, phone: str, message: str) -> dict:
        raise NotImplementedError


class ConsoleProvider(BaseSMSProvider):
    """Logs OTP and SMS to application logs and terminal."""

    def send_sms(self, phone: str, message: str) -> dict:
        banner = (
            "\n" + "=" * 60 + "\n"
            f"📱 [EWORKS SMS DISPATCH - CONSOLE MOCK]\n"
            f"To: {phone}\n"
            f"Message: {message}\n"
            + "=" * 60
        )
        print(banner, flush=True)
        logger.warning(banner)
        return {"success": True, "provider": "console", "phone": phone, "channel": "sms"}

    def send_whatsapp(self, phone: str, message: str) -> dict:
        banner = (
            "\n" + "=" * 60 + "\n"
            f"💬 [EWORKS WHATSAPP DISPATCH - CONSOLE MOCK]\n"
            f"To: {phone}\n"
            f"Message: {message}\n"
            + "=" * 60
        )
        print(banner, flush=True)
        logger.warning(banner)
        return {"success": True, "provider": "console", "phone": phone, "channel": "whatsapp"}


class Fast2SMSProvider(BaseSMSProvider):
    """
    Fast2SMS Quick SMS Gateway (https://www.fast2sms.com)
    Widely used in India for fast transactional & OTP messaging.
    """

    API_URL = "https://www.fast2sms.com/dev/bulkV2"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def send_sms(self, phone: str, message: str) -> dict:
        cleaned_phone = clean_phone_number(phone)
        if not self.api_key:
            logger.warning("FAST2SMS_API_KEY is not configured; falling back to Console log.")
            return ConsoleProvider().send_sms(phone, message)

        payload = {
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": cleaned_phone,
        }
        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(self.API_URL, json=payload, headers=headers, timeout=10)
            data = response.json()
            is_success = data.get("return", False) or response.status_code == 200
            return {
                "success": is_success,
                "provider": "fast2sms",
                "phone": cleaned_phone,
                "response": data,
            }
        except Exception as exc:
            logger.error(f"Fast2SMS request failed for {phone}: {exc}")
            return {"success": False, "provider": "fast2sms", "error": str(exc)}

    def send_whatsapp(self, phone: str, message: str) -> dict:
        # Fast2SMS is SMS only; route WhatsApp to console fallback
        logger.info(f"Fast2SMS does not support WhatsApp. Falling back to console for {phone}.")
        return ConsoleProvider().send_whatsapp(phone, message)


class TwilioProvider(BaseSMSProvider):
    """Twilio SMS & WhatsApp Cloud API."""

    def __init__(self, account_sid: str, auth_token: str, from_number: str = "", whatsapp_from: str = ""):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.whatsapp_from = whatsapp_from or "whatsapp:+14155238886"

    def send_sms(self, phone: str, message: str) -> dict:
        if not self.account_sid or not self.auth_token:
            return ConsoleProvider().send_sms(phone, message)

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        to_phone = get_e164_phone(phone)
        data = {
            "To": to_phone,
            "From": self.from_number,
            "Body": message,
        }

        try:
            resp = requests.post(url, data=data, auth=(self.account_sid, self.auth_token), timeout=10)
            res_data = resp.json()
            return {"success": resp.status_code in [200, 201], "provider": "twilio", "response": res_data}
        except Exception as exc:
            logger.error(f"Twilio SMS failed for {phone}: {exc}")
            return {"success": False, "provider": "twilio", "error": str(exc)}

    def send_whatsapp(self, phone: str, message: str) -> dict:
        if not self.account_sid or not self.auth_token:
            return ConsoleProvider().send_whatsapp(phone, message)

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        to_whatsapp = f"whatsapp:{get_e164_phone(phone)}"
        data = {
            "To": to_whatsapp,
            "From": self.whatsapp_from,
            "Body": message,
        }

        try:
            resp = requests.post(url, data=data, auth=(self.account_sid, self.auth_token), timeout=10)
            res_data = resp.json()
            return {"success": resp.status_code in [200, 201], "provider": "twilio_whatsapp", "response": res_data}
        except Exception as exc:
            logger.error(f"Twilio WhatsApp failed for {phone}: {exc}")
            return {"success": False, "provider": "twilio_whatsapp", "error": str(exc)}


def get_sms_provider() -> BaseSMSProvider:
    """Instantiate the active SMS provider based on settings or env."""
    provider_name = getattr(settings, "SMS_PROVIDER", os.getenv("SMS_PROVIDER", "console")).lower()

    if provider_name == "fast2sms":
        api_key = getattr(settings, "FAST2SMS_API_KEY", os.getenv("FAST2SMS_API_KEY", ""))
        return Fast2SMSProvider(api_key=api_key)

    elif provider_name == "twilio":
        sid = getattr(settings, "TWILIO_ACCOUNT_SID", os.getenv("TWILIO_ACCOUNT_SID", ""))
        token = getattr(settings, "TWILIO_AUTH_TOKEN", os.getenv("TWILIO_AUTH_TOKEN", ""))
        from_num = getattr(settings, "TWILIO_FROM_NUMBER", os.getenv("TWILIO_FROM_NUMBER", ""))
        wa_from = getattr(settings, "TWILIO_WHATSAPP_FROM", os.getenv("TWILIO_WHATSAPP_FROM", ""))
        return TwilioProvider(account_sid=sid, auth_token=token, from_number=from_num, whatsapp_from=wa_from)

    return ConsoleProvider()


# ── High-Level Utility Functions ──────────────────────────────────────────────

def send_sms_notification(phone: str, message: str) -> dict:
    """Send standard text SMS."""
    if not phone:
        return {"success": False, "error": "Phone number missing"}
    provider = get_sms_provider()
    return provider.send_sms(phone, message)


def send_whatsapp_notification(phone: str, message: str) -> dict:
    """Send WhatsApp message."""
    if not phone:
        return {"success": False, "error": "Phone number missing"}
    provider = get_sms_provider()
    return provider.send_whatsapp(phone, message)


def send_job_start_otp_sms(booking) -> dict:
    """
    Sends the 4-digit Job Start OTP to the customer via SMS & WhatsApp
    when technician arrives or is dispatched.
    """
    customer_user = booking.customer.user
    phone = customer_user.phone
    if not phone:
        logger.warning(f"Booking {booking.id}: Customer has no phone number attached.")
        return {"success": False, "error": "Customer phone missing"}

    partner_name = booking.partner.user.get_full_name() if booking.partner else "Technician"
    service_name = booking.service_category.name if booking.service_category else "Home Service"
    otp = booking.job_start_otp or "----"
    price = booking.final_price or booking.quoted_price or "0"

    msg = (
        f"Eworks Update: {partner_name} has arrived for your {service_name} service.\n"
        f"Your Start OTP is: {otp}\n"
        f"Share this OTP with {partner_name} to begin. Settle ₹{price} directly to pro upon completion (100% Free - ₹0 platform fee)."
    )

    sms_res = send_sms_notification(phone, msg)
    # Also attempt WhatsApp notification
    wa_res = send_whatsapp_notification(phone, msg)

    return {"sms": sms_res, "whatsapp": wa_res, "otp": otp, "phone": phone}


def send_phone_verification_otp(phone: str, otp: str) -> dict:
    """Send 6-digit login / registration OTP."""
    msg = (
        f"Your Eworks verification code is: {otp}\n"
        f"Valid for 5 minutes. Do not share this OTP with anyone.\n"
        f"— Eworks Hyperlocal Home Services"
    )
    sms_res = send_sms_notification(phone, msg)
    wa_res = send_whatsapp_notification(phone, msg)
    return {"sms": sms_res, "whatsapp": wa_res, "otp": otp}

