from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/raksha"
    SECRET_KEY: str = "raksha-shared-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    HLS_DIR: str = "/app/hls"
    SESSION_TIMEOUT_SECONDS: int = 60
    HEALTH_CHECK_INTERVAL_SECONDS: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
