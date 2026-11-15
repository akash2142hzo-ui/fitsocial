"""All provider calls are mocked; token signatures are intentionally synthetic."""

import asyncio
import base64
import json
from time import time
from uuid import UUID

import httpx2
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.token_validation import (
    InvalidTokenError,
    OnlineTokenValidator,
    TokenValidationUnavailableError,
)

PROJECT = "https://test-project.supabase.co"
SUBJECT = "123e4567-e89b-42d3-a456-426614174000"
SESSION = "123e4567-e89b-42d3-a456-426614174001"
API_KEY = "sb_publishable_synthetic_test_only"


def settings() -> Settings:
    return Settings(
        _env_file=None,  # type: ignore[call-arg]
        app_env="test",
        supabase_url=PROJECT,
        supabase_jwks_url="",
        supabase_jwt_issuer=f"{PROJECT}/auth/v1",
        supabase_jwt_audience="authenticated",
        database_url=SecretStr(""),
        supabase_publishable_key=SecretStr(API_KEY),
    )


def token(omit: str | None = None, /, **overrides: object) -> str:
    claims: dict[str, object] = {
        "iss": f"{PROJECT}/auth/v1",
        "aud": "authenticated",
        "sub": SUBJECT,
        "session_id": SESSION,
        "role": "authenticated",
        "is_anonymous": False,
        "iat": int(time()) - 30,
        "exp": int(time()) + 300,
    }
    claims.update(overrides)
    if omit is not None:
        claims.pop(omit, None)

    def segment(value: object) -> str:
        return base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b"=").decode()

    return f"{segment({'typ': 'JWT', 'alg': 'ES256'})}.{segment(claims)}.synthetic"


def accepted_response() -> httpx2.Response:
    return httpx2.Response(200, json={"id": SUBJECT, "aud": "authenticated"})


async def test_validation_calls_provider_for_every_attempt() -> None:
    calls = 0
    submitted = token()

    def handler(request: httpx2.Request) -> httpx2.Response:
        nonlocal calls
        calls += 1
        assert request.method == "GET"
        assert str(request.url) == f"{PROJECT}/auth/v1/user"
        assert request.headers["authorization"] == f"Bearer {submitted}"
        assert request.headers["apikey"] == API_KEY
        assert "cookie" not in request.headers
        return accepted_response()

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    for _ in range(2):
        identity = await validator.validate(submitted)
        assert identity.subject == UUID(SUBJECT)
        assert identity.session_id == UUID(SESSION)
        assert submitted not in repr(identity)
    assert calls == 2


@pytest.mark.parametrize("status", [401, 403])
async def test_provider_rejection_never_trusts_locally_valid_claims(status: int) -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: httpx2.Response(status))
    )
    with pytest.raises(InvalidTokenError, match="^Invalid authentication$"):
        await validator.validate(token())


@pytest.mark.parametrize("status", [201, 204, 302, 400, 404, 429, 500, 503])
async def test_unusable_provider_status_fails_closed_without_redirect_or_retry(status: int) -> None:
    calls = 0

    def handler(_: httpx2.Request) -> httpx2.Response:
        nonlocal calls
        calls += 1
        return httpx2.Response(status, headers={"Location": "https://other.invalid"})

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    with pytest.raises(TokenValidationUnavailableError):
        await validator.validate(token())
    assert calls == 1


@pytest.mark.parametrize("failure", [httpx2.ConnectError, httpx2.ReadTimeout])
async def test_network_failures_are_sanitized(failure: type[httpx2.HTTPError]) -> None:
    def handler(_: httpx2.Request) -> httpx2.Response:
        raise failure("synthetic-upstream-error-containing-private-data")

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    with pytest.raises(TokenValidationUnavailableError) as captured:
        await validator.validate(token())
    assert str(captured.value) == "Authentication unavailable"
    assert captured.value.__suppress_context__


async def test_total_deadline_is_enforced(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.token_validation.TOTAL_TIMEOUT_SECONDS", 0.01)

    async def handler(_: httpx2.Request) -> httpx2.Response:
        await asyncio.sleep(1)
        return accepted_response()

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    with pytest.raises(TokenValidationUnavailableError):
        await validator.validate(token())


@pytest.mark.parametrize(
    "body",
    [b"not-json", b"[]", b"{}", b'{"id":"invalid","aud":"authenticated"}', b"x" * 65537],
    ids=["non-json", "array", "empty-object", "invalid-user", "oversized"],
)
async def test_malformed_provider_responses_fail_closed(body: bytes) -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: httpx2.Response(200, content=body))
    )
    with pytest.raises(TokenValidationUnavailableError):
        await validator.validate(token())


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("iss", "https://other.invalid/auth/v1"),
        ("aud", "anon"),
        ("aud", ["authenticated", 123]),
        ("exp", 1),
        ("exp", True),
        ("exp", None),
        ("iat", 9999999999),
        ("iat", "123"),
        ("nbf", 9999999999),
        ("sub", "not-a-uuid"),
        ("sub", "123e4567-e89b-42d3-a456-426614174002"),
        ("session_id", None),
        ("role", "service_role"),
        ("is_anonymous", True),
        ("is_anonymous", "false"),
        ("is_anonymous", None),
    ],
)
async def test_claim_failures_after_provider_acceptance(name: str, value: object) -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: accepted_response())
    )
    with pytest.raises(InvalidTokenError):
        await validator.validate(token(**{name: value}))


async def test_audience_array_is_supported() -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: accepted_response())
    )
    assert (await validator.validate(token(aud=["authenticated"]))).subject == UUID(SUBJECT)


async def test_provider_rejection_after_success_is_not_cached() -> None:
    calls = 0

    def handler(_: httpx2.Request) -> httpx2.Response:
        nonlocal calls
        calls += 1
        return accepted_response() if calls == 1 else httpx2.Response(401)

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    submitted = token()
    await validator.validate(submitted)
    with pytest.raises(InvalidTokenError):
        await validator.validate(submitted)
    assert calls == 2


@pytest.mark.parametrize(
    "name", ["iss", "aud", "sub", "session_id", "exp", "iat", "role", "is_anonymous"]
)
async def test_missing_required_claims_fail_closed(name: str) -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: accepted_response())
    )
    with pytest.raises(InvalidTokenError):
        await validator.validate(token(name))


@pytest.mark.parametrize(
    "user",
    [
        {"id": SUBJECT, "aud": "anon"},
        {"id": SUBJECT, "aud": "authenticated", "is_anonymous": True},
    ],
)
async def test_provider_user_does_not_override_required_policy(user: dict[str, object]) -> None:
    validator = OnlineTokenValidator(
        settings(), transport=httpx2.MockTransport(lambda _: httpx2.Response(200, json=user))
    )
    with pytest.raises(InvalidTokenError):
        await validator.validate(token())


@pytest.mark.parametrize(
    "submitted",
    ["", "not-a-jwt", "a.b.c\r\nheader", "a" * 8193],
    ids=["empty", "not-jwt", "header-injection", "oversized"],
)
async def test_bad_token_shape_does_not_contact_provider(submitted: str) -> None:
    def handler(_: httpx2.Request) -> httpx2.Response:
        pytest.fail("Malformed input must not contact provider")

    validator = OnlineTokenValidator(settings(), transport=httpx2.MockTransport(handler))
    with pytest.raises(InvalidTokenError):
        await validator.validate(submitted)


async def test_missing_provider_key_fails_closed() -> None:
    configuration = settings()
    configuration.supabase_publishable_key = configuration.database_url
    validator = OnlineTokenValidator(configuration)
    with pytest.raises(TokenValidationUnavailableError):
        await validator.validate(token())


async def test_unexpected_content_encoding_is_rejected() -> None:
    validator = OnlineTokenValidator(
        settings(),
        transport=httpx2.MockTransport(
            lambda _: httpx2.Response(200, headers={"Content-Encoding": "gzip"})
        ),
    )
    with pytest.raises(TokenValidationUnavailableError):
        await validator.validate(token())
