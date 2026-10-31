"""Custom DRF exception handler — returns consistent JSON error shapes."""
from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Wrap errors in a standard shape: {"error": ..., "details": ...}
        if isinstance(response.data, dict) and "detail" in response.data:
            response.data = {
                "error": str(response.data["detail"]),
                "code": getattr(response.data.get("detail"), "code", "error"),
            }
        else:
            response.data = {
                "error": "Validation failed.",
                "details": response.data,
            }

    return response
