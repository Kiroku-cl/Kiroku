import re

from config import Config
from helpers import load_prompt
from logger import get_logger
from services.openai_client import get_openai_client

log = get_logger("llm")


TOKEN_PATTERN = re.compile(r"\[\[PH_(\d+)\]\]")


def build_photo_token_map(photos):
    mapping = {}
    for index, photo in enumerate(photos):
        token = f"[[PH_{index}]]"
        mapping[token] = photo["photo_id"]
    return mapping


def inject_photo_tokens(transcript_with_markers, token_map):
    updated = transcript_with_markers
    for token, photo_id in token_map.items():
        marker = f"[[FOTO:{photo_id}]]"
        updated = updated.replace(marker, token)
    return updated


def validate_photo_tokens(text, token_map):
    expected_tokens = set(token_map.keys())
    found_tokens = {f"[[PH_{m}]]" for m in TOKEN_PATTERN.findall(text)}
    missing = expected_tokens - found_tokens
    unknown = found_tokens - expected_tokens
    return {
        "missing": missing,
        "unknown": unknown
    }


def rehydrate_photo_tokens(text, token_map):
    rehydrated = text
    for token, photo_id in token_map.items():
        rehydrated = rehydrated.replace(token, f"[[FOTO:{photo_id}]]")
    return rehydrated


def generate_script(transcript_with_tokens, participant_name="ACTOR"):
    client = get_openai_client()
    if not client:
        log.warning("Cliente OpenAI no disponible, retornando raw")
        return transcript_with_tokens

    try:
        log.info(f"Generando guion para {participant_name}...")

        user_content = (
            f"Nombre del participante: {participant_name}\n\n"
            f"Transcripción:\n{transcript_with_tokens}"
        )

        response = client.chat.completions.create(
            model=Config.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": load_prompt("script_generation")
                },
                {"role": "user", "content": user_content}
            ],
            temperature=0.3,
            max_tokens=4000
        )

        result = ""
        if getattr(response, "choices", None):
            result = (response.choices[0].message.content or "").strip()
        log.info("Guion generado exitosamente")
        return result

    except Exception as e:
        log.error(f"Generación LLM falló: {e}")
        return transcript_with_tokens
