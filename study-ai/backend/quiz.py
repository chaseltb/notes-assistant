import json
import re


def _strip_fences(text: str) -> str:
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def parse_quiz_response(text: str) -> dict:
    cleaned = _strip_fences(text)
    data = json.loads(cleaned)
    # Ensure all keys exist
    return {
        "mcq": data.get("mcq", []),
        "short": data.get("short", []),
        "long": data.get("long", []),
    }


def parse_flashcard_response(text: str) -> list:
    cleaned = _strip_fences(text)
    return json.loads(cleaned)
