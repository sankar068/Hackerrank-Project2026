import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "EvidenceLens AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:///./evidencelens.db"
    
    # Authentication
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_0123456789" # In production, use a secure randomly generated key
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Provider
    AI_PROVIDER: str | None = None
    AI_MODEL: str | None = None
    AI_API_KEY: str | None = None
    AI_BASE_URL: str | None = None
    
    # Storage
    UPLOAD_DIRECTORY: str = "./storage/uploads"

    class Config:
        env_file = ".env"

settings = Settings()
