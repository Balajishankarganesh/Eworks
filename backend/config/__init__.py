"""config package — exposes the Celery app for the `celery -A config` CLI."""
from .celery_app import app as celery_app

__all__ = ["celery_app"]
