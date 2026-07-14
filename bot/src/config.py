from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    bot_token: str = Field(min_length=1)
    openai_api_key: str = Field(min_length=1)
    openai_model: str = "gpt-5.4-mini"

    api_base_url: str = "http://host.docker.internal:3000"
    api_username: str = Field(min_length=1)
    api_password: str = Field(min_length=1)

    bot_allowed_chat_ids: str = ""
    bot_dashboard_days: int = Field(default=30, ge=1, le=365)
    bot_patient_limit: int = Field(default=100, ge=1, le=500)
    bot_max_output_tokens: int = Field(default=700, ge=100, le=4000)

    @field_validator("api_base_url")
    @classmethod
    def normalizar_api_base_url(cls, value: str) -> str:
        return value.rstrip("/")

    @property
    def allowed_chat_ids(self) -> set[int]:
        if not self.bot_allowed_chat_ids.strip():
            return set()
        try:
            return {
                int(value.strip())
                for value in self.bot_allowed_chat_ids.split(",")
                if value.strip()
            }
        except ValueError as exc:
            raise ValueError(
                "BOT_ALLOWED_CHAT_IDS debe contener IDs numéricos separados por coma"
            ) from exc


@lru_cache
def get_settings() -> Settings:
    return Settings()
