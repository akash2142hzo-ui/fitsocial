from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "test", "staging", "production"] = "development"
    database_url: SecretStr = SecretStr("")
    supabase_url: str = ""
    supabase_jwt_issuer: str = ""
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_secret: SecretStr = SecretStr("")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
    )

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.app_env == "production":
            required = {
                "DATABASE_URL": self.database_url.get_secret_value(),
                "SUPABASE_URL": self.supabase_url,
                "SUPABASE_JWT_ISSUER": self.supabase_jwt_issuer,
                "SUPABASE_JWT_SECRET": self.supabase_jwt_secret.get_secret_value(),
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(
                    "Production configuration is missing required values: "
                    + ", ".join(missing)
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
