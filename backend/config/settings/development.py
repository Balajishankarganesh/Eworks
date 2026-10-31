"""Development settings — debug-friendly overrides on top of base."""
from .base import *  # noqa: F401, F403

DEBUG = True

# Show full tracebacks in DRF responses during development
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # type: ignore[name-defined]  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True

# Disable HTTPS-only settings
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Django Debug Toolbar (optional — install separately if needed)
# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
# INTERNAL_IPS = ["127.0.0.1"]

# Log SQL queries in development
LOGGING["loggers"]["django.db.backends"] = {  # type: ignore[name-defined]  # noqa: F405
    "handlers": ["console"],
    "level": "DEBUG",
    "propagate": False,
}
