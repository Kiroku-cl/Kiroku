"""
Rate limiting para proteger los endpoints.
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "500 per hour"],
    storage_uri="memory://",
)


LIMITS = {
    "audio_chunk": "30 per minute",      # Procesa audio con Whisper
    "photo": "20 per minute",            # Sube fotos
    "project_start": "10 per minute",    # Crea proyectos
    "project_stop": "10 per minute",     # Procesa con LLM
}
