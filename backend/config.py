import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# No soy fan de la indentación así media condicional, pero hay tantas variables
# que hago una excepción acá.
def _build_database_url():
    user =     os.getenv("POSTGRES_USER", "kiroku")
    password = os.getenv("POSTGRES_PASSWORD", "kiroku.pass")
    host =     os.getenv("POSTGRES_HOST", "db")
    port =     os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "kiroku")

    return (
        f"postgresql+psycopg://{user}:{password}@{host}:{port}/{database}"
    )


class Config:
    FLASK_ENV =  os.getenv("FLASK_ENV", "development")
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")

    DATABASE_URL = _build_database_url()

    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

    RQ_PREPARE_QUEUE=     os.getenv("RQ_PREPARE_QUEUE", "kiroku_prepare")
    RQ_TRANSCRIBE_QUEUE = os.getenv("RQ_TRANSCRIBE_QUEUE", "kiroku_transcribe")
    RQ_PHOTO_QUEUE =      os.getenv("RQ_PHOTO_QUEUE", "kiroku_photos")
    RQ_LLM_QUEUE =        os.getenv("RQ_LLM_QUEUE", "kiroku_llm")
    RQ_QUEUE_NAME =       os.getenv("RQ_QUEUE_NAME", RQ_LLM_QUEUE)

    SESSION_LIFETIME_DAYS = int(os.getenv("SESSION_LIFETIME_DAYS", "1"))

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE =   os.getenv("COOKIE_SECURE", "0") == "1"
    SESSION_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")

    DATA_DIR = os.path.abspath(os.getenv("DATA_DIR", "data"))
    RETENTION_DAYS =       int(os.getenv("RETENTION_DAYS", "90"))
    AUDIO_STORAGE_BACKEND =    os.getenv("AUDIO_STORAGE_BACKEND", "disk")
    S3_AUDIO_BUCKET =          os.getenv("S3_AUDIO_BUCKET", "")
    S3_AUDIO_PREFIX =          os.getenv("S3_AUDIO_PREFIX", "audio")
    MAX_IMAGE_SIZE =       int(os.getenv("MAX_IMAGE_SIZE", str(2 * 1024 * 1024)))
    MAX_CHUNK_SIZE =       int(os.getenv("MAX_CHUNK_SIZE", str(5 * 1024 * 1024)))

    AUDIO_WS_PATH =           os.getenv("AUDIO_WS_PATH", "/ws/audio")
    AUDIO_CHUNK_SECONDS = int(os.getenv("AUDIO_CHUNK_SECONDS", "10"))
    TRANSCRIPTION_MODEL = os.getenv(
        "TRANSCRIPTION_MODEL",
        "gpt-4o-mini-transcribe"
    )

    TRANSCRIBE_JOB_TIMEOUT =  int(os.getenv("TRANSCRIBE_JOB_TIMEOUT", "300"))
    PHOTO_JOB_TIMEOUT =       int(os.getenv("PHOTO_JOB_TIMEOUT", "300"))
    LLM_JOB_TIMEOUT =         int(os.getenv("LLM_JOB_TIMEOUT", "600"))
    PREPARE_PROJECT_TIMEOUT = int(os.getenv("PREPARE_PROJECT_TIMEOUT", "300"))

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL =      os.getenv("LLM_MODEL", "gpt-4o-mini")
    IMAGE_STYLE_ENABLED = (
        os.getenv("IMAGE_STYLE_ENABLED", "false").lower() == "true"
    )

    DEBUG_CONCAT_FILES = os.getenv("DEBUG_CONCAT_FILES", "0") == "1"
