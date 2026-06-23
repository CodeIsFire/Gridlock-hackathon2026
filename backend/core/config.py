from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key"
    GEMINI_API_KEY: str = ""
    MAPMYINDIA_API_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    TIMEZONE: str = "Asia/Kolkata"
    CSV_PATH: str = "/data/violations.csv"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma4"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
