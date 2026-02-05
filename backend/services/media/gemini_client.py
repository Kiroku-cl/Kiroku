import google.genai as genai

from config import Config


_client = None


def get_gemini_client():
    global _client
    if _client:
        return _client
    api_key = Config.GENAI_API_KEY
    if not api_key:
        return None
    _client = genai.Client(api_key=api_key)
    return _client
