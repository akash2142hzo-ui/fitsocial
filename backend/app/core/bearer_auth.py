"""Unwired HTTP adapter; provider identity is not FitSocial authorization."""

import re
from typing import Protocol

from fastapi import HTTPException, Request
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.token_validation import (
    MAX_TOKEN_BYTES,
    InvalidTokenError,
    OnlineTokenValidator,
    ProviderValidatedIdentity,
    TokenValidationUnavailableError,
)


class TokenValidator(Protocol):
    async def validate(self, token: str) -> ProviderValidatedIdentity: ...


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Invalid authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _unavailable() -> HTTPException:
    return HTTPException(status_code=503, detail="Authentication unavailable")


def _extract_token(request: Request) -> str:
    # Do not use a single-value header accessor: it can conceal duplicates.
    raw_headers: list[tuple[bytes, bytes]] = request.scope["headers"]
    values = [
        value for name, value in raw_headers if name.lower() == b"authorization"
    ]
    if len(values) != 1:
        raise _unauthorized()
    scheme, separator, credential = values[0].partition(b" ")
    if scheme.lower() != b"bearer" or not separator:
        raise _unauthorized()
    # Bearer permits 1*SP. No tabs, trimming of the token, or Unicode whitespace.
    token = credential.lstrip(b" ")
    if len(token) > MAX_TOKEN_BYTES or not re.fullmatch(
        rb"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", token
    ):
        raise _unauthorized()
    return token.decode("ascii")


class BearerAuthentication:
    """Use an instance with Depends; inject a validator for offline testing.

    Returns only the provider's identity. Account status, local revocation and
    resource authorization must be enforced separately before product access.
    """

    def __init__(self, validator: TokenValidator | None = None) -> None:
        self._validator = validator

    async def __call__(self, request: Request) -> ProviderValidatedIdentity:
        token = _extract_token(request)
        validator = self._validator
        if validator is None:
            # Deliberately lazy: invalid headers never load configuration or
            # construct the online validator. Do not chain settings/path errors.
            try:
                validator = OnlineTokenValidator(get_settings())
            except (ValidationError, OSError, UnicodeError):
                raise _unavailable() from None
        try:
            return await validator.validate(token)
        except InvalidTokenError:
            raise _unauthorized() from None
        except TokenValidationUnavailableError:
            raise _unavailable() from None


bearer_authentication = BearerAuthentication()
