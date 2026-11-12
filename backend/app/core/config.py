from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "test", "staging", "production"] = "development"
    database_url: SecretStr = SecretStr("")
    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwt_audience: str = "authenticated"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
    )

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.supabase_url:
            project_url = self.supabase_url.rstrip("/")
            try:
                parsed = urlsplit(project_url)
                valid_url = (
                    parsed.scheme == "https"
                    and bool(parsed.hostname)
                    and parsed.port in (None, 443)
                    and not parsed.username
                    and not parsed.password
                    and not parsed.path
                    and not parsed.query
                    and not parsed.fragment
                    and not any(character.isspace() for character in project_url)
                )
            except ValueError:
                valid_url = False
            if not valid_url:
                raise ValueError("SUPABASE_URL must be an HTTPS project origin")
            expected_issuer = f"{project_url}/auth/v1"
            expected_jwks = f"{expected_issuer}/.well-known/jwks.json"
            if self.supabase_jwt_issuer and self.supabase_jwt_issuer != expected_issuer:
                raise ValueError("SUPABASE_JWT_ISSUER must match the configured project")
            if self.supabase_jwks_url and self.supabase_jwks_url != expected_jwks:
                raise ValueError("SUPABASE_JWKS_URL must match the configured project")
            self.supabase_url = project_url
            self.supabase_jwks_url = expected_jwks
        elif self.supabase_jwks_url or self.supabase_jwt_issuer:
            raise ValueError(
                "SUPABASE_URL is required when authentication endpoints are configured"
            )

        if self.app_env == "production":
            required = {
                "DATABASE_URL": self.database_url.get_secret_value(),
                "SUPABASE_URL": self.supabase_url,
                "SUPABASE_JWT_ISSUER": self.supabase_jwt_issuer,
                "SUPABASE_JWT_AUDIENCE": self.supabase_jwt_audience,
            }
            missing = [name for name, value in required.items() if not value.strip()]
            if missing:
                raise ValueError(
                    "Production configuration is missing required values: "
                    + ", ".join(missing)
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
