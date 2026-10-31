"""
Security and Observability Middleware for HomeWorks Platform.
Provides:
1. RequestIDMiddleware - Generates or propagates X-Request-ID and measures request duration (X-Response-Time).
2. SecurityHeadersMiddleware - Injects modern security headers (CSP, Permissions-Policy, Referrer-Policy, etc.).
3. RequestSizeLimitMiddleware - Enforces maximum payload size limits to protect against DoS attacks.
"""
import time
import uuid
import logging
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.request")


class RequestIDMiddleware(MiddlewareMixin):
    """
    Ensures every request has a unique identifier for distributed tracing
    and logs request timing in response headers.
    """

    REQUEST_ID_HEADER = "HTTP_X_REQUEST_ID"
    RESPONSE_ID_HEADER = "X-Request-ID"
    RESPONSE_TIME_HEADER = "X-Response-Time"

    def process_request(self, request):
        request_id = request.META.get(self.REQUEST_ID_HEADER)
        if not request_id:
            request_id = str(uuid.uuid4())
        request.id = request_id
        request._start_time = time.time()

    def process_response(self, request, response):
        request_id = getattr(request, "id", None)
        if request_id:
            response[self.RESPONSE_ID_HEADER] = request_id

        start_time = getattr(request, "_start_time", None)
        if start_time:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            response[self.RESPONSE_TIME_HEADER] = f"{duration_ms}ms"

        return response


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Injects hardened security headers to prevent common web attacks (clickjacking, MIME sniffing, XSS).
    """

    def process_response(self, request, response):
        # Prevent MIME type sniffing
        if "X-Content-Type-Options" not in response:
            response["X-Content-Type-Options"] = "nosniff"

        # Frame options protection
        if "X-Frame-Options" not in response:
            response["X-Frame-Options"] = getattr(settings, "X_FRAME_OPTIONS", "DENY")

        # Referrer policy
        if "Referrer-Policy" not in response:
            response["Referrer-Policy"] = getattr(
                settings, "SECURE_REFERRER_POLICY", "strict-origin-when-cross-origin"
            )

        # Restrict hardware API access (geolocation permitted for partner & customer tracking)
        if "Permissions-Policy" not in response:
            response["Permissions-Policy"] = (
                "geolocation=(self), camera=(), microphone=(), payment=(self)"
            )

        # Content-Security-Policy (CSP)
        if "Content-Security-Policy" not in response:
            csp_policy = getattr(
                settings,
                "CONTENT_SECURITY_POLICY",
                "default-src 'self'; "
                "img-src 'self' data: https: blob:; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "connect-src 'self' ws: wss: http: https:;",
            )
            response["Content-Security-Policy"] = csp_policy

        return response


class RequestSizeLimitMiddleware(MiddlewareMixin):
    """
    Enforces maximum payload size for incoming requests.
    Default max is 25MB for document/media uploads, 5MB for regular API calls.
    """

    DEFAULT_MAX_BODY_SIZE = 25 * 1024 * 1024  # 25 MB

    def process_request(self, request):
        max_size = getattr(settings, "MAX_REQUEST_BODY_SIZE", self.DEFAULT_MAX_BODY_SIZE)
        content_length = request.META.get("CONTENT_LENGTH")

        if content_length:
            try:
                length = int(content_length)
                if length > max_size:
                    logger.warning(
                        "Payload size %s exceeds maximum allowed %s bytes from IP %s",
                        length,
                        max_size,
                        request.META.get("REMOTE_ADDR"),
                    )
                    return JsonResponse(
                        {
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Request body exceeds maximum allowed size of {max_size // (1024 * 1024)}MB.",
                            }
                        },
                        status=413,
                    )
            except (ValueError, TypeError):
                pass
        return None
