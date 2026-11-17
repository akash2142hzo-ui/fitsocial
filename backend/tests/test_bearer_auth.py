"""HTTP boundary tests use only in-process ASGI apps and injected validators."""

import logging
import traceback
from pathlib import Path
from typing import Annotated
from uuid import UUID

import httpx2
import pytest
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.bearer_auth import BearerAuthentication, TokenValidator, bearer_authentication
from app.core.config import Settings
from app.core.token_validation import (
    MAX_TOKEN_BYTES,
    InvalidTokenError,
    OnlineTokenValidator,
    ProviderValidatedIdentity,
    TokenValidationUnavailableError,
)

TOKEN = "Synthetic_Header.Payload_123.Signature-456"
IDENTITY = ProviderValidatedIdentity(UUID(int=1), UUID(int=2), 1.0, 2.0)
SENSITIVE = "synthetic-key upstream.invalid /synthetic/private/config"


def assert_no_sensitive_data(exposed: str) -> None:
    for value in (TOKEN, *SENSITIVE.split()):
        assert value not in exposed


@pytest.fixture(autouse=True)
def isolate_configuration(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    for name in Settings.model_fields:
        monkeypatch.delenv(name.upper(), raising=False)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)


class FakeValidator:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls: list[str] = []
        self.error = error

    async def validate(self, token: str) -> ProviderValidatedIdentity:
        self.calls.append(token)
        if self.error is not None:
            raise self.error
        return IDENTITY


def make_client(validator: TokenValidator | None = None) -> TestClient:
    app = FastAPI()
    adapter = BearerAuthentication(validator)

    # Test-only route; the actual application gains no endpoint/dependency.
    @app.get("/identity")
    async def identity(
        result: Annotated[ProviderValidatedIdentity, Depends(adapter)],
    ) -> dict[str, str]:
        assert result is IDENTITY
        return {"subject": str(result.subject)}

    return TestClient(app)


@pytest.mark.parametrize("scheme", ["Bearer", "bearer", "BEARER", "bEaReR"])
@pytest.mark.parametrize("spaces", [" ", "   "])
def test_accepts_scheme_and_forwards_token_unchanged(
    scheme: str, spaces: str, caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    validator = FakeValidator()
    response = make_client(validator).get(
        "/identity?subject=forged&actor_id=forged&access_token=ignored",
        headers={
            "Authorization": f"{scheme}{spaces}{TOKEN}",
            "X-User-Id": "forged",
            "X-Actor-Id": "forged",
            "X-Session-Id": "forged",
        },
    )
    assert response.status_code == 200
    assert response.json() == {"subject": str(IDENTITY.subject)}
    assert validator.calls == [TOKEN]
    assert_no_sensitive_data(response.text + str(response.headers) + caplog.text)


BAD_VALUES = [
    b"", b" ", b"Bearer", b"Bearer ", b"Bearer    ",
    b"Basic a.b.c", b"Digest a.b.c", b" Bearer a.b.c", b"Bearer a.b.c ",
    b"Bearer a.b.c, Bearer d.e.f", b"Bearer a.b.c,d.e.f", b"Bearer a.b.c d.e.f",
    b'Bearer "a.b.c"', b"Bearer not-a-jwt", b"Bearer a.b", b"Bearer a..c",
    b"Bearer a.b.c.d", b"Bearer a.b.c=", b"Bearer a.b.c/", b"Bearer a.b.\xff",
    b"Bearer " + b"a" * (MAX_TOKEN_BYTES - 3) + b".b.c",
]
BAD_VALUES += [b"Bearer" + bytes([control]) + b"a.b.c" for control in (*range(32), 127)]
BAD_VALUES += [b"Bearer a.b." + bytes([control]) + b"c" for control in (*range(32), 127)]


@pytest.mark.parametrize(
    "value", BAD_VALUES, ids=[f"invalid-{index}" for index in range(len(BAD_VALUES))],
)
async def test_invalid_raw_asgi_header_never_invokes_validator(
    value: bytes,
) -> None:
    validator = FakeValidator()
    client = make_client(validator)
    # ASGITransport permits control bytes that a real HTTP transport may reject
    # earlier; these exercise the dependency, rather than a client's validation.
    async with httpx2.AsyncClient(transport=httpx2.ASGITransport(app=client.app)) as asgi:
        response = await asgi.get("http://test/identity", headers=[(b"authorization", value)])
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication"}
    assert response.headers["www-authenticate"] == "Bearer"
    assert validator.calls == []


@pytest.mark.parametrize(
    "headers",
    [
        [],
        [("Authorization", f"Bearer {TOKEN}"), ("authorization", f"Bearer {TOKEN}")],
        [("Authorization", ""), ("Authorization", f"Bearer {TOKEN}")],
        [("Authorization", f"Bearer {TOKEN}"), ("Authorization", "Basic a.b.c")],
    ],
    ids=["missing", "duplicate-identical", "duplicate-empty", "duplicate-conflicting"],
)
def test_missing_and_duplicate_headers_never_invoke_validator(
    headers: list[tuple[str, str]],
) -> None:
    validator = FakeValidator()
    response = make_client(validator).get(
        f"/identity?access_token={TOKEN}&subject=forged",
        headers=[*headers, ("X-User-Id", "forged"), ("Cookie", f"access_token={TOKEN}")],
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication"}
    assert response.headers["www-authenticate"] == "Bearer"
    assert validator.calls == []


def test_exact_token_size_limit_is_forwarded() -> None:
    submitted = "a" * (MAX_TOKEN_BYTES - 4) + ".b.c"
    validator = FakeValidator()
    assert make_client(validator).get(
        "/identity", headers={"Authorization": f"Bearer {submitted}"},
    ).status_code == 200
    assert validator.calls == [submitted]


def test_rejected_sensitive_header_is_not_logged(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    validator = FakeValidator()
    response = make_client(validator).get(
        "/identity", headers={"Authorization": f"Bearer {TOKEN}, {SENSITIVE}"},
    )
    assert response.status_code == 401
    assert validator.calls == []
    assert_no_sensitive_data(response.text + str(response.headers) + caplog.text)


@pytest.mark.parametrize(
    ("error", "status", "detail"),
    [
        (InvalidTokenError(), 401, "Invalid authentication"),
        (TokenValidationUnavailableError(), 503, "Authentication unavailable"),
    ],
)
def test_error_mapping_is_generic_and_does_not_log_sensitive_details(
    error: Exception, status: int, detail: str, caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    # Even contaminated contract exceptions must never be echoed by the adapter.
    error.args = (f"{TOKEN} {SENSITIVE}",)
    validator = FakeValidator(error)
    response = make_client(validator).get(
        "/identity", headers={"Authorization": f"Bearer {TOKEN}"},
    )
    assert response.status_code == status
    assert response.json() == {"detail": detail}
    assert response.headers.get("www-authenticate") == ("Bearer" if status == 401 else None)
    assert validator.calls == [TOKEN]
    exposed = response.text + str(response.headers) + caplog.text
    assert_no_sensitive_data(exposed)


@pytest.mark.parametrize("error", [OSError(SENSITIVE), UnicodeError(SENSITIVE)])
def test_configuration_io_errors_map_to_503(
    error: Exception, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    def broken_settings() -> Settings:
        raise error

    monkeypatch.setattr("app.core.bearer_auth.get_settings", broken_settings)
    client = make_client()
    response = client.get("/identity", headers={"Authorization": f"Bearer {TOKEN}"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication unavailable"}
    assert_no_sensitive_data(response.text + str(response.headers) + caplog.text)
    # Rejected credentials must not even attempt configuration loading.
    assert client.get("/identity").status_code == 401


def test_invalid_settings_map_to_503(monkeypatch: pytest.MonkeyPatch) -> None:
    def broken_settings() -> Settings:
        return Settings(_env_file=None, app_env=SENSITIVE)  # type: ignore[call-arg, arg-type]

    monkeypatch.setattr("app.core.bearer_auth.get_settings", broken_settings)
    response = make_client().get("/identity", headers={"Authorization": f"Bearer {TOKEN}"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication unavailable"}


def test_unconfigured_real_validator_never_contacts_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(_env_file=None, app_env="test")  # type: ignore[call-arg]
    monkeypatch.setattr("app.core.bearer_auth.get_settings", lambda: settings)

    def no_network(_: httpx2.Request) -> httpx2.Response:
        pytest.fail("Unconfigured authentication must not contact the provider")

    validator = OnlineTokenValidator(settings, transport=httpx2.MockTransport(no_network))
    # Both injected and default construction must report configuration failure.
    for client in (make_client(validator), make_client()):
        response = client.get("/identity", headers={"Authorization": f"Bearer {TOKEN}"})
        assert response.status_code == 503
        assert response.json() == {"detail": "Authentication unavailable"}


def test_real_validator_upstream_failure_is_sanitized(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    settings = Settings(
        _env_file=None,  # type: ignore[call-arg]
        app_env="test", supabase_url="https://synthetic.invalid",
        supabase_jwt_issuer="https://synthetic.invalid/auth/v1",
        supabase_publishable_key=SecretStr("synthetic-key"),
    )

    def upstream(request: httpx2.Request) -> httpx2.Response:
        assert request.headers["authorization"] == f"Bearer {TOKEN}"
        raise httpx2.ConnectError(SENSITIVE)

    validator = OnlineTokenValidator(settings, transport=httpx2.MockTransport(upstream))
    response = make_client(validator).get("/identity", headers={"Authorization": f"Bearer {TOKEN}"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication unavailable"}
    assert_no_sensitive_data(response.text + str(response.headers) + caplog.text)


def test_unexpected_errors_are_not_misclassified_as_credentials() -> None:
    client = make_client(FakeValidator(RuntimeError("synthetic programming error")))
    with pytest.raises(RuntimeError, match="synthetic programming error"):
        client.get("/identity", headers={"Authorization": f"Bearer {TOKEN}"})


@pytest.mark.parametrize("error", [InvalidTokenError(), TokenValidationUnavailableError()])
async def test_mapped_exception_messages_and_tracebacks_are_sanitized(error: Exception) -> None:
    validator = FakeValidator(error)
    assert validator.error is not None
    validator.error.args = (SENSITIVE,)
    request = Request({"type": "http", "headers": [(b"authorization", f"Bearer {TOKEN}".encode())]})
    with pytest.raises(HTTPException) as captured:
        await BearerAuthentication(validator)(request)
    formatted = "".join(traceback.format_exception(captured.value))
    assert_no_sensitive_data(formatted + str(captured.value))
    assert captured.value.__suppress_context__


def test_health_and_application_routes_remain_unchanged(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(_env_file=None, app_env="test")  # type: ignore[call-arg]
    monkeypatch.setattr("app.core.config.get_settings", lambda: settings)
    from app.main import create_app

    app = create_app(settings)
    client = TestClient(app)
    assert client.get("/api/v1/health").json() == {"status": "ok"}
    assert client.get("/api/v1/health", headers={"Authorization": "invalid"}).status_code == 200
    assert set(app.openapi()["paths"]) == {"/api/v1/health"}
    assert client.get("/identity").status_code == 404
    assert isinstance(bearer_authentication, BearerAuthentication)
