import os
from typing import Optional

from PIL import Image

from config import Config
from logger import get_logger
from services.media import openai_image_client as openai_images
from services.media.gemini_client import get_gemini_client


log = get_logger("image_stylizer")


def stylize_image(input_path: str, prompt: str, output_path: str) -> Optional[str]:
    backend = (Config.IMAGE_STYLIZER_BACKEND or "").lower()

    if backend == "gemini":
        return _stylize_with_gemini(input_path, prompt, output_path)

    if backend == "openai":
        return _stylize_with_openai(input_path, prompt, output_path)

    log.warning("Backend de estilizado no configurado o desconocido: %s", backend)
    return None


def _stylize_with_openai(input_path: str, prompt: str, output_path: str) -> Optional[str]:
    try:
        client = openai_images.get_openai_image_client()
        if not client:
            log.warning("Cliente OpenAI no disponible para estilizar")
            return None

        result_path = openai_images.stylize_image_with_client(client, input_path, prompt, output_path)
        return result_path
    except Exception as e:
        log.error("Estilizado OpenAI falló: %s", e)
        return None


def _stylize_with_gemini(input_path: str, prompt: str, output_path: str) -> Optional[str]:
    client = get_gemini_client()
    if not client:
        log.warning("Cliente Gemini no disponible (sin API key)")
        return None

    try:
        with Image.open(input_path) as img:
            response = client.models.generate_content(
                model=Config.GENAI_IMAGE_MODEL or "gemini-2.5-flash-image",
                contents=[prompt, img]
            )
        for part in response.parts:
            if part.inline_data:
                image = part.as_image()
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                image.save(output_path)
                return output_path

        log.error("Respuesta Gemini sin datos de imagen")
        return None
    except Exception as e:
        log.error("Estilizado Gemini falló: %s", e)
        return None
