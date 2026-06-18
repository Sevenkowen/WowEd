from pydantic_settings import BaseSettings, SettingsConfigDict

# Institución por defecto (single-tenant). Sobrescribir con DEFAULT_INSTITUTION_ID en producción.
DEFAULT_INSTITUTION_UUID = "00000000-0000-0000-0000-000000000001"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    default_institution_id: str = DEFAULT_INSTITUTION_UUID

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
