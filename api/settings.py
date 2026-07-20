import functools

import pydantic
import pydantic_settings


class Settings(pydantic_settings.BaseSettings):
    model_config = pydantic_settings.SettingsConfigDict(env_file=".env")

    app_name: str = "Annotation"
    app_version: str = "0.1.0"
    environment: str = pydantic.Field(default="production")
    root_path: str = ""

    redis_url: str = "redis://localhost:6379/0"

    google_client_id: str = pydantic.Field()
    jwt_secret: str = pydantic.Field(min_length=16)
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 1
    jwt_header_field: str = "x-jwt-token"

    allowed_google_emails: str = pydantic.Field()

    def is_environment_production(self) -> bool:
        return self.environment == "production"

    @property
    def allowed_google_emails_list(self) -> list[str]:
        return [e.strip() for e in self.allowed_google_emails.split(",") if e.strip()]


@functools.lru_cache()
def get() -> Settings:
    return Settings()
