from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/raksha"
    SECRET_KEY: str = "raksha-shared-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    FRAMES_DIR: str = "/app/frames"
    RECORDINGS_DIR: str = "/app/recordings"
    MODELS_CACHE_DIR: str = "/app/models_cache"
    ANPR_DETECT_CONF: float = 0.60
    ANPR_OCR_CONF: float = 0.70
    FRAME_RATE: int = 1
    REGISTRY_API_URL: str = "http://registry-svc:8000/api/v1"
    STREAMING_API_URL: str = "http://streaming-svc:8000/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
