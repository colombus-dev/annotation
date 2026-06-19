import functools

import pydantic_settings


class Settings(pydantic_settings.BaseSettings):
    app_name: str = "Annotation"
    app_version: str = "0.1.0"


@functools.lru_cache()
def get() -> Settings:
    return Settings()
