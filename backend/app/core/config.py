from __future__ import annotations

from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    groq_api_key: str = Field(alias="GROQ_API_KEY")
    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    groq_model: str = Field(default="openai/gpt-oss-20b", alias="GROQ_MODEL")
    embedding_model: str = Field(default="embed-multilingual-v3.0", alias="EMBEDDING_MODEL")
    upload_dir: str = Field(default="../uploads", alias="UPLOAD_DIR")
    cors_origins: Annotated[list[str], NoDecode] = Field(default=["http://localhost:3000"], alias="CORS_ORIGINS")
    cohere_api_key: str = Field(alias="COHERE_API_KEY")
    cohere_base_url: str = Field(alias="COHERE_BASE_URL")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir).resolve()


settings = Settings()
