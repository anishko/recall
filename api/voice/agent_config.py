"""Build the Settings message sent to Deepgram Voice Agent after WS open.

CLAUDE.md hard invariant #3: booking is mocked in v1. We expose a single
book_followup tool so the agent can confirm the synthetic slot we pre-computed
server-side, then we record it on the case.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CaseContext:
    case_id: str
    patient_name: str
    patient_language: str  # 'en' | 'es' | 'vi'
    patient_script: str   # Claude-drafted, plain text
    offered_slot: str     # TTS-friendly; see voice/slots.py


DEFAULT_THINK_MODEL = "claude-haiku-4-5"

_LISTEN_MODEL_BY_LANG = {
    "en": "nova-3",
    "es": "nova-3",
    "fr": "nova-2",
    "vi": "nova-2",
}

_SPEAK_MODEL_BY_LANG = {
    "en": "aura-2-thalia-en",
    "es": "aura-2-celeste-es",
    "fr": "aura-2-agathe-fr",
    "vi": "aura-2-thalia-en",
}

_LANG_NAME_BY_CODE = {
    "en": "English",
    "es": "Spanish",
    "fr": "French (Français)",
    "vi": "Vietnamese",
}

# Auto-greeting — Recall speaks first as soon as the call connects. No patient name.
_GREETING_BY_LANG = {
    "en": (
        "Hi, this is Recall calling about a follow-up from your recent imaging. "
        "Do you have a minute?"
    ),
    "es": (
        "Hola, le llamamos de Recall sobre un seguimiento de su estudio reciente. "
        "¿Tiene un minuto?"
    ),
    "fr": (
        "Bonjour, ici Recall au sujet d'un suivi de votre imagerie récente. "
        "Avez-vous une minute ?"
    ),
    "vi": (
        "Hello, this is Recall calling about a follow-up from your recent imaging. "
        "Do you have a minute?"
    ),
}


def _sanitize_script(text: str) -> str:
    """Older drafts said RadRelay; voice brand is Recall."""
    return (
        text.replace("Rad Relay", "Recall")
        .replace("RadRelay", "Recall")
        .replace("radrelay", "Recall")
    )


def _system_prompt(case: CaseContext) -> str:
    lang_name = _LANG_NAME_BY_CODE.get(case.patient_language, "English")
    return (
        "You are Recall, a friendly assistant calling a patient on behalf of "
        "their radiologist. Your name is Recall — never say RadRelay or Rad Relay. "
        "This is decision support only — never give a "
        "diagnosis, never speculate beyond the script, never discuss treatment. "
        "If the patient asks medical questions you cannot answer from the "
        "script, tell them their radiologist will follow up.\n\n"
        f"IMPORTANT: Speak to the patient ONLY in {lang_name}. Every response "
        f"must be in {lang_name}. Do not switch languages.\n\n"
        "IMPORTANT: Keep every reply to one or two short sentences. Plain speech "
        "only — never use asterisks, markdown, or abbreviations like ET or AM.\n\n"
        f"Offer this follow-up slot and only this slot (read it exactly as written): "
        f"{case.offered_slot}.\n"
        "When the patient agrees, call the book_followup function with that "
        "exact slot string. If they decline, say the office will call back and "
        "end politely.\n\n"
        "Script from the radiologist (paraphrase warmly, stay faithful, stay brief):\n"
        f"{_sanitize_script(case.patient_script)}"
    )


def _greeting(case: CaseContext) -> str:
    return _GREETING_BY_LANG.get(case.patient_language, _GREETING_BY_LANG["en"])


def build_settings(case: CaseContext) -> dict:
    lang = case.patient_language
    return {
        "type": "Settings",
        "audio": {
            "input": {"encoding": "mulaw", "sample_rate": 8000},
            "output": {
                "encoding": "mulaw",
                "sample_rate": 8000,
                "container": "none",
            },
        },
        "agent": {
            "language": lang,
            "greeting": _greeting(case),
            "listen": {
                "provider": {
                    "type": "deepgram",
                    "model": _LISTEN_MODEL_BY_LANG.get(lang, "nova-3"),
                    "language": lang,
                }
            },
            "think": {
                "provider": {
                    "type": "anthropic",
                    "model": os.environ.get(
                        "DEEPGRAM_AGENT_THINK_MODEL", DEFAULT_THINK_MODEL
                    ),
                    "temperature": 0.3,
                },
                "prompt": _system_prompt(case),
                "functions": [
                    {
                        "name": "book_followup",
                        "description": (
                            "Record the patient's agreement to attend the "
                            "offered follow-up slot. Call only when they confirm."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "slot": {
                                    "type": "string",
                                    "description": (
                                        "The slot string the patient agreed to, "
                                        "verbatim from the offer."
                                    ),
                                }
                            },
                            "required": ["slot"],
                        },
                    }
                ],
            },
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": _SPEAK_MODEL_BY_LANG.get(lang, "aura-2-thalia-en"),
                }
            },
        },
    }
