import os
import os

from config import Config
from helpers import load_prompt
from logger import get_logger
from services.media.stylizer import stylize_image

log = get_logger("image")
def stylize_image_file(input_path, output_path):
    if not os.path.exists(input_path):
        log.warning("Imagen no encontrada: %s", input_path)
        return False

    prompt = load_prompt("image_stylize")
    result = stylize_image(input_path, prompt, output_path)
    if result:
        log.info("Imagen estilizada: %s", output_path)
        return True

    log.warning("Estilizado falló, se mantiene original")
    return False
