from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 86400
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
