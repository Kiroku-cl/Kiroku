import subprocess
import shutil


class FFmpegNotFoundError(Exception):
    pass


class ConversionError(Exception):
    pass


def check_ffmpeg():
    if shutil.which("ffmpeg") is None:
        raise FFmpegNotFoundError("ffmpeg no instalado")


def webm_to_wav(input_path, output_path):
    check_ffmpeg()

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        output_path
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            raise ConversionError(f"ffmpeg error: {result.stderr}")

        return output_path

    except subprocess.TimeoutExpired:
        raise ConversionError("ffmpeg timeout (>30s)")
    except FileNotFoundError:
        raise FFmpegNotFoundError("ffmpeg no encontrado en PATH")
