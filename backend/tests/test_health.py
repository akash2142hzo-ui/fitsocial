from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from pytest import MonkeyPatch

from app.core.config import Settings


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    for name in Settings.model_fields:
        monkeypatch.delenv(name.upper(), raising=False)
    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)


def test_health_endpoint() -> None:
    from app.main import app

    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "environment" not in response.json()


def test_create_app_uses_supplied_settings() -> None:
    from app.main import create_app

    application = create_app(Settings(app_env="test"))

    assert application.title == "FitSocial API"
    assert application.version == "0.1.0"
    assert application.openapi_url == "/openapi.json"


def test_development_settings_defaults_are_safe() -> None:
    settings = Settings()

    assert settings.app_env == "development"
    assert settings.database_url.get_secret_value() == ""
    assert settings.supabase_jwks_url == ""


def test_settings_load_environment_variables(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:test-password@localhost/test")
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", "https://test-project.supabase.co/auth/v1")

    settings = Settings()

    assert settings.app_env == "test"
    assert settings.database_url.get_secret_value().startswith("postgresql://")
    assert settings.supabase_jwks_url == (
        "https://test-project.supabase.co/auth/v1/.well-known/jwks.json"
    )
    assert "test-password" not in repr(settings)


def test_production_settings_require_service_configuration() -> None:
    with pytest.raises(ValueError, match="Production configuration"):
        Settings(app_env="production")


def test_production_settings_disable_api_documentation() -> None:
    from app.main import create_app

    settings = Settings(
        app_env="production",
        database_url=SecretStr("postgresql://production-user:placeholder@localhost/production"),
        supabase_url="https://production-project.supabase.co",
        supabase_jwt_issuer="https://production-project.supabase.co/auth/v1",
    )
    application = create_app(settings)

    assert application.openapi_url is None
    assert TestClient(application).get("/docs").status_code == 404


def test_unknown_environment_variable_is_rejected(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("UNEXPECTED_SETTING=value\n", encoding="utf-8")

    with pytest.raises(ValueError, match="extra_forbidden"):
        Settings(_env_file=env_file)  # type: ignore[call-arg]


@pytest.mark.parametrize("environment", ["development", "test"])
def test_local_settings_need_no_service_credentials(
    environment: str, monkeypatch: MonkeyPatch
) -> None:
    monkeypatch.setenv("APP_ENV", environment)

    settings = Settings()

    assert settings.supabase_url == ""
    assert settings.supabase_jwks_url == ""
    assert settings.supabase_jwt_audience == "authenticated"


@pytest.mark.parametrize(
    "missing",
    ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_JWT_ISSUER", "SUPABASE_JWT_AUDIENCE"],
)
def test_each_production_requirement_is_enforced(missing: str, monkeypatch: MonkeyPatch) -> None:
    values = {
        "APP_ENV": "production",
        "DATABASE_URL": "postgresql://test-user:test-password@localhost/test",
        "SUPABASE_URL": "https://test-project.supabase.co",
        "SUPABASE_JWT_ISSUER": "https://test-project.supabase.co/auth/v1",
        "SUPABASE_JWT_AUDIENCE": "authenticated",
    }
    for name, value in values.items():
        monkeypatch.setenv(name, "" if name == missing else value)

    with pytest.raises(ValueError, match=missing):
        Settings()


def test_jwks_url_is_derived_and_matching_explicit_url_is_accepted() -> None:
    project = "https://test-project.supabase.co"
    jwks = f"{project}/auth/v1/.well-known/jwks.json"

    derived = Settings(supabase_url=f"{project}/")
    explicit = Settings(supabase_url=project, supabase_jwks_url=jwks)

    assert derived.supabase_url == project
    assert derived.supabase_jwks_url == explicit.supabase_jwks_url == jwks


@pytest.mark.parametrize(
    "project_url",
    [
        "http://test-project.supabase.co",
        "https://test-project.supabase.co/path",
        "https://test-project.supabase.co?query=value",
        "https://test-project.supabase.co#fragment",
        "https://test-user:test-password@test-project.supabase.co",
        "https://test-project.supabase.co:invalid",
        "https://test project.supabase.co",
    ],
)
def test_invalid_project_origins_are_rejected(project_url: str) -> None:
    with pytest.raises(ValueError, match="HTTPS project origin"):
        Settings(supabase_url=project_url)


def test_authentication_endpoints_cannot_target_another_project() -> None:
    project = "https://test-project.supabase.co"

    with pytest.raises(ValueError, match="SUPABASE_JWT_ISSUER"):
        Settings(supabase_url=project, supabase_jwt_issuer="https://other.supabase.co/auth/v1")
    with pytest.raises(ValueError, match="SUPABASE_JWKS_URL"):
        Settings(supabase_url=project, supabase_jwks_url="https://other.supabase.co/keys")
    with pytest.raises(ValueError, match="SUPABASE_URL"):
        Settings(supabase_jwks_url=f"{project}/auth/v1/.well-known/jwks.json")


def test_legacy_secret_is_not_used(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "unused-test-only-value")

    settings = Settings()

    assert "supabase_jwt_secret" not in Settings.model_fields
    assert "unused-test-only-value" not in repr(settings)

    env_file = tmp_path / ".env"
    env_file.write_text("SUPABASE_JWT_SECRET=unused-test-only-value\n", encoding="utf-8")
    with pytest.raises(ValueError, match="extra_forbidden"):
        Settings(_env_file=env_file)  # type: ignore[call-arg]


def test_committed_environment_example_uses_supported_settings() -> None:
    example = Path(__file__).resolve().parents[1] / ".env.example"

    settings = Settings(_env_file=example)  # type: ignore[call-arg]

    assert settings.app_env == "development"
    assert settings.supabase_jwks_url == (
        f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    )


def test_formatted_field_error_hides_invalid_input(monkeypatch: MonkeyPatch) -> None:
    invalid_environment = "invalid-environment-synthetic-sensitive-payload"
    monkeypatch.setenv("APP_ENV", invalid_environment)

    with pytest.raises(ValidationError) as captured:
        Settings()

    message = str(captured.value)
    assert "app_env" in message
    assert invalid_environment not in message
    assert "input_value=" not in message
    assert "input_type=" not in message


def test_formatted_model_error_hides_credentials_and_payload(monkeypatch: MonkeyPatch) -> None:
    password = "synthetic-test-only-db-password"
    database_url = f"postgresql://test-user:{password}@localhost/test"
    invalid_project = "https://test-project.supabase.co?sensitive=synthetic-private-payload"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("SUPABASE_URL", invalid_project)

    with pytest.raises(ValidationError) as captured:
        Settings()

    message = str(captured.value)
    assert "SUPABASE_URL" in message
    assert "HTTPS project origin" in message
    assert password not in message
    assert database_url not in message
    assert invalid_project not in message
    assert "synthetic-private-payload" not in message
    assert "input_value=" not in message
    assert "input_type=" not in message


def test_formatted_dotenv_error_hides_unknown_setting_value(tmp_path: Path) -> None:
    secret = "synthetic-test-only-unknown-credential"
    env_file = tmp_path / ".env"
    env_file.write_text(f"UNEXPECTED_CREDENTIAL={secret}\n", encoding="utf-8")

    with pytest.raises(ValidationError) as captured:
        Settings(_env_file=env_file)  # type: ignore[call-arg]

    message = str(captured.value)
    assert "unexpected_credential" in message
    assert "extra_forbidden" in message
    assert secret not in message
    assert "input_value=" not in message
    assert "input_type=" not in message
