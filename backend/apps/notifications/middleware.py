"""
JWT Authentication Middleware for Django Channels WebSockets.
Extracts JWT token from query string (?token=...) or Authorization header.
"""
from urllib.parse import parse_qs
import logging
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """
    Decodes SimpleJWT access token and loads user with relevant profile IDs.
    Returns (user, partner_id, customer_id).
    """
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get("user_id")
        if not user_id:
            return AnonymousUser(), None, None

        user = User.objects.get(id=user_id)
        if not user.is_active:
            return AnonymousUser(), None, None

        partner_id = None
        customer_id = None

        if hasattr(user, "partner_profile"):
            try:
                partner_id = str(user.partner_profile.id)
            except Exception:
                pass

        if hasattr(user, "customer_profile"):
            try:
                customer_id = str(user.customer_profile.id)
            except Exception:
                pass

        return user, partner_id, customer_id
    except Exception as exc:
        logger.debug(f"JWT WebSocket auth failed: {exc}")
        return AnonymousUser(), None, None


class JWTAuthMiddleware:
    """
    Custom Channels middleware that authenticates users from a JWT token passed
    in the query string (e.g. ?token=...) or in the Authorization header.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = None

        if "token" in query_params and query_params["token"]:
            token = query_params["token"][0]
        else:
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization", b"").decode("utf-8")
            if auth_header.startswith("Bearer "):
                token = auth_header.split("Bearer ", 1)[1].strip()

        if token:
            user, partner_id, customer_id = await get_user_from_token(token)
            scope["user"] = user
            scope["partner_id"] = partner_id
            scope["customer_id"] = customer_id
        else:
            scope["user"] = AnonymousUser()
            scope["partner_id"] = None
            scope["customer_id"] = None

        return await self.inner(scope, receive, send)
