"""Production settings — hardened overrides on top of base."""
from .base import *  # noqa: F401, F403

DEBUG = False

# Security hardening
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

# Production password hashing (Argon2)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# Production file storage (e.g. S3 — configure AWS_* env vars)
# DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
# STATICFILES_STORAGE = "storages.backends.s3boto3.S3StaticStorage"

# Sentry error tracking
import os  # noqa: E402
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk  # noqa: E402
    from sentry_sdk.integrations.django import DjangoIntegration  # noqa: E402
    from sentry_sdk.integrations.celery import CeleryIntegration  # noqa: E402
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
