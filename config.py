import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
    WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "es")
    CHUNK_DURATION = int(os.getenv("CHUNK_DURATION", "5"))
    DATA_DIR = os.getenv("DATA_DIR", "data")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    IMAGE_STYLE_ENABLED = os.getenv("IMAGE_STYLE_ENABLED", "false").lower() == "true"
    MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", str(2 * 1024 * 1024)))
