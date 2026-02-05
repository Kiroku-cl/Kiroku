import base64
import os
import base64
import urllib.request

from services.lm.openai_client import get_openai_client


def get_openai_image_client():
    return get_openai_client()


def stylize_image_with_client(client, input_path, prompt, output_path):
    with open(input_path, "rb") as image_file:
        response = client.images.edit(
            model="gpt-image-1",
            image=image_file,
            prompt=prompt,
            size="1024x1024"
        )

    if hasattr(response.data[0], "b64_json") and response.data[0].b64_json:
        result_b64 = response.data[0].b64_json
        result_data = base64.b64decode(result_b64)
    elif hasattr(response.data[0], "url") and response.data[0].url:
        with urllib.request.urlopen(response.data[0].url) as resp:
            result_data = resp.read()
    else:
        raise RuntimeError("Sin datos de imagen en respuesta")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(result_data)
    return output_path
