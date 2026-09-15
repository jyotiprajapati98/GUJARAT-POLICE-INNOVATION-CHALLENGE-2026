from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/raksha"
    SECRET_KEY: str = "change-this-in-production-minimum-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
