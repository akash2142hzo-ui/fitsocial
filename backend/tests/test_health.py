from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from pytest import MonkeyPatch

from app.core.config import Settings
from app.main import app, create_app


def test_health_endpoint() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "environment" not in response.json()


def test_create_app_uses_supplied_settings() -> None:
    application = create_app(Settings(app_env="test"))

    assert application.title == "FitSocial API"
    assert application.version == "0.1.0"
    assert application.openapi_url == "/openapi.json"


def test_development_settings_defaults_are_safe() -> None:
    settings = Settings()

    assert settings.app_env == "development"
    assert settings.database_url.get_secret_value() == ""
    assert settings.supabase_jwt_secret.get_secret_value() == ""


def test_settings_load_environment_variables(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test-user:test-password@localhost/test")
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", "https://test-project.supabase.co/auth/v1")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-only-secret")

    settings = Settings()

    assert settings.app_env == "test"
    assert settings.database_url.get_secret_value().startswith("postgresql://")
    assert settings.supabase_jwt_secret.get_secret_value() == "test-only-secret"
    assert "test-only-secret" not in repr(settings)


def test_production_settings_require_service_configuration() -> None:
    with pytest.raises(ValueError, match="Production configuration"):
        Settings(app_env="production")


def test_production_settings_disable_api_documentation() -> None:
    settings = Settings(
        app_env="production",
        database_url=SecretStr("postgresql://production-user:placeholder@localhost/production"),
        supabase_url="https://production-project.supabase.co",
        supabase_jwt_issuer="https://production-project.supabase.co/auth/v1",
        supabase_jwt_secret=SecretStr("production-placeholder"),
    )
    application = create_app(settings)

    assert application.openapi_url is None
    assert TestClient(application).get("/docs").status_code == 404


def test_unknown_environment_variable_is_rejected(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("UNEXPECTED_SETTING=value\n", encoding="utf-8")

    with pytest.raises(ValueError, match="extra_forbidden"):
        Settings(_env_file=env_file)  # type: ignore[call-arg]
