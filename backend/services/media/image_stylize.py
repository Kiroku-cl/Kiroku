import os
import base64
import urllib.request
from config import Config
from helpers import load_prompt
from logger import get_logger
from services.lm.openai_client import get_openai_client

log = get_logger("image")


def stylize_image(input_path, output_path):
    if not Config.IMAGE_STYLE_ENABLED:
        log.info("Abortando stylize_image. IMAGE_STYLE_ENABLED=false")
        return False

    if not os.path.exists(input_path):
        log.warning("Imagen no encontrada: %s", input_path)
        return False

    client = get_openai_client()
    if not client:
        log.warning("Cliente OpenAI no disponible para estilización")
        return False

    try:
        with open(input_path, "rb") as image_file:
            log.info("Estilizando foto ID=%s", input_path)
            response = client.images.edit(
                model="gpt-image-1",
                image=image_file,
                prompt=load_prompt("image_stylize"),
                size="1024x1024"
            )
            log.info("Fin de estilizado de foto ID=%s", input_path)

        if hasattr(response.data[0], 'b64_json') and response.data[0].b64_json:
            result_b64 = response.data[0].b64_json
            result_data = base64.b64decode(result_b64)
        elif hasattr(response.data[0], 'url') and response.data[0].url:
            with urllib.request.urlopen(response.data[0].url) as resp:
                result_data = resp.read()
        else:
            log.error("Sin datos de imagen en respuesta")
            return False

        with open(output_path, "wb") as f:
            f.write(result_data)

        log.info("Imagen estilizada: %s", output_path)
        return True

    except Exception as e:
        log.error("Error estilizando imagen: %s", e)

        if hasattr(e, 'status_code'):
            log.error("Status code: %s", e.status_code)
        if hasattr(e, 'body'):
            log.error("Body: %s", e.body)

        return False
