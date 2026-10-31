"""
Audit logging utility.
Call `log_action(actor, action, ...)` from any view or task.
"""
from __future__ import annotations
from typing import Any, Optional


def log_action(
    actor,
    action: str,
    *,
    target=None,
    details: Optional[dict] = None,
    request=None,
) -> None:
    """
    Write an immutable AuditLog entry.

    Args:
        actor: The User performing the action.
        action: A short action string, e.g. "PARTNER_APPROVED".
        target: Optional User object that the action was performed on.
        details: Optional dict of additional metadata.
        request: Optional Django request (used to extract IP/user-agent).
    """
    from .models import AuditLog

    ip = None
    ua = ""
    if request:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        ua = request.META.get("HTTP_USER_AGENT", "")

    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_user=target if hasattr(target, "pk") else None,
        details=details or {},
        ip_address=ip,
        user_agent=ua,
    )
