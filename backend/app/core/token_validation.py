"""Online provider validation only; not FitSocial account/session authorization."""

import asyncio
import base64
import json
import math
import re
from dataclasses import dataclass
from time import time
from uuid import UUID

import httpx2

from app.core.config import Settings

MAX_TOKEN_BYTES = 8192
MAX_RESPONSE_BYTES = 65536
CONNECT_TIMEOUT_SECONDS = 2.0
TOTAL_TIMEOUT_SECONDS = 5.0


class InvalidTokenError(Exception):
    """Map to generic 401 in a future API adapter; never include token details."""

    def __init__(self) -> None:
        super().__init__("Invalid authentication")


class TokenValidationUnavailableError(Exception):
    """Map to generic 503; never expose upstream errors or request objects."""

    def __init__(self) -> None:
        super().__init__("Authentication unavailable")


@dataclass(frozen=True)
class ProviderValidatedIdentity:
    """Provider-accepted identity; does not authorize a protected FitSocial request."""

    subject: UUID
    session_id: UUID
    issued_at: float
    expires_at: float


def _object_without_duplicates(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for name, value in pairs:
        if name in result:
            raise ValueError("Duplicate JSON field")
        result[name] = value
    return result


def _json_object(raw: bytes) -> dict[str, object]:
    value: object = json.loads(raw, object_pairs_hook=_object_without_duplicates)
    if not isinstance(value, dict):
        raise ValueError("Expected JSON object")
    return value


def _uuid(value: object) -> UUID:
    if not isinstance(value, str):
        raise ValueError("Expected UUID string")
    return UUID(value)


def _timestamp(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Expected numeric timestamp")
    timestamp = float(value)
    if not math.isfinite(timestamp):
        raise ValueError("Expected finite timestamp")
    return timestamp


def _identity_after_provider_acceptance(
    token: str, user: dict[str, object], issuer: str, audience: str
) -> ProviderValidatedIdentity:
    # Parsing is not cryptographic verification. This function is reached only after
    # the provider validates this exact token, and binds sub to its returned user ID.
    encoded_header, encoded_claims, _ = token.split(".")
    header = _json_object(
        base64.b64decode(
            encoded_header + "=" * (-len(encoded_header) % 4), altchars=b"-_", validate=True
        )
    )
    if header.get("typ") != "JWT":
        raise ValueError("Not an access JWT")
    raw = base64.b64decode(
        encoded_claims + "=" * (-len(encoded_claims) % 4), altchars=b"-_", validate=True
    )
    claims = _json_object(raw)
    if claims.get("iss") != issuer:
        raise ValueError("Issuer mismatch")
    audiences = claims.get("aud")
    if isinstance(audiences, str):
        audience_matches = audiences == audience
    elif isinstance(audiences, list):
        audience_matches = (
            all(isinstance(item, str) for item in audiences) and audience in audiences
        )
    else:
        audience_matches = False
    if not audience_matches or user.get("aud") != audience:
        raise ValueError("Audience mismatch")
    if claims.get("role") != "authenticated" or claims.get("is_anonymous") is not False:
        raise ValueError("Not an authenticated non-anonymous user")
    if "is_anonymous" in user and user["is_anonymous"] is not False:
        raise ValueError("Anonymous provider user")
    subject = _uuid(claims.get("sub"))
    if subject != _uuid(user.get("id")):
        raise ValueError("Subject mismatch")
    session_id = _uuid(claims.get("session_id"))
    expires_at = _timestamp(claims.get("exp"))
    issued_at = _timestamp(claims.get("iat"))
    now = time()
    if expires_at <= now or issued_at > now or issued_at >= expires_at:
        raise ValueError("Invalid token lifetime")
    if "nbf" in claims and _timestamp(claims["nbf"]) > now:
        raise ValueError("Token not yet valid")
    return ProviderValidatedIdentity(subject, session_id, issued_at, expires_at)


class OnlineTokenValidator:
    """Fixed-project HTTPS validation, without caching, redirects, or retries."""

    def __init__(
        self, settings: Settings, *, transport: httpx2.AsyncBaseTransport | None = None
    ) -> None:
        self._url = f"{settings.supabase_url}/auth/v1/user"
        self._issuer = settings.supabase_jwt_issuer
        self._audience = settings.supabase_jwt_audience
        self._api_key = settings.supabase_publishable_key.get_secret_value()
        self._configured = bool(
            settings.supabase_url and self._issuer and self._audience.strip() and self._api_key
        )
        # Transport injection is for local mocks; callers never supply a target URL.
        self._transport = transport

    async def validate(self, token: str) -> ProviderValidatedIdentity:
        if (
            not isinstance(token, str)
            or len(token) > MAX_TOKEN_BYTES
            or not re.fullmatch(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", token)
        ):
            raise InvalidTokenError()
        if not self._configured:
            raise TokenValidationUnavailableError()
        try:
            async with asyncio.timeout(TOTAL_TIMEOUT_SECONDS):
                # A separate client prevents cookies or previous user auth leaking
                # between attempts. TLS verification remains enabled by default.
                async with httpx2.AsyncClient(
                    timeout=httpx2.Timeout(TOTAL_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS),
                    follow_redirects=False,
                    trust_env=False,
                    transport=self._transport,
                ) as client:
                    async with client.stream(
                        "GET",
                        self._url,
                        headers={
                            "Authorization": f"Bearer {token}",
                            "apikey": self._api_key,
                            "Accept": "application/json",
                            "Accept-Encoding": "identity",
                            "Cache-Control": "no-store",
                        },
                    ) as response:
                        if response.status_code in (401, 403):
                            raise InvalidTokenError()
                        if response.status_code != 200:
                            raise TokenValidationUnavailableError()
                        if response.headers.get("content-encoding", "identity") != "identity":
                            raise TokenValidationUnavailableError()
                        body = bytearray()
                        async for chunk in response.aiter_bytes(chunk_size=4096):
                            body.extend(chunk)
                            if len(body) > MAX_RESPONSE_BYTES:
                                raise TokenValidationUnavailableError()
            user = _json_object(bytes(body))
            # Required provider response fields, not a caller-controlled user ID.
            _uuid(user.get("id"))
            if not isinstance(user.get("aud"), str):
                raise ValueError("Malformed provider audience")
        except (httpx2.HTTPError, TimeoutError, ValueError, RecursionError):
            raise TokenValidationUnavailableError() from None
        try:
            return _identity_after_provider_acceptance(token, user, self._issuer, self._audience)
        except (ValueError, TypeError, OverflowError, RecursionError):
            raise InvalidTokenError() from None
