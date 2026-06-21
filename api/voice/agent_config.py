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
    offered_slot: str     # synthetic; e.g. "Tue Jul 7 at 10:00 AM"


# Deepgram Voice Agent's managed Anthropic provider. Confirmed working
# end-to-end on our account: claude-haiku-4-5 (no -latest alias). Deepgram's
# formal OpenAPI enum also lists claude-sonnet-4-20250514; their prose docs
# additionally mention claude-sonnet-4-5 / claude-sonnet-4-6 but the -latest
# aliases (e.g. claude-3-5-haiku-latest) are rejected with INVALID_SETTINGS
# even when documented. Override via DEEPGRAM_AGENT_THINK_MODEL.
DEFAULT_THINK_MODEL = "claude-haiku-4-5"

# Listen (STT) model per language. nova-3 is English-only today; nova-2 is the
# multilingual model that handles fr/vi (and es works under either).
_LISTEN_MODEL_BY_LANG = {
    "en": "nova-3",
    "es": "nova-3",
    "fr": "nova-2",
    "vi": "nova-2",
}

# Speak (TTS) voice per language. Aura-2 has native en/es/fr voices; vi has no
# Deepgram voice yet — falls back to English (replace when Deepgram ships one).
_SPEAK_MODEL_BY_LANG = {
    "en": "aura-2-thalia-en",
    "es": "aura-2-celeste-es",
    "fr": "aura-2-agathe-fr",
    "vi": "aura-2-thalia-en",  # TODO: replace when Deepgram ships a vi voice.
}

# Human-readable language name for the system prompt's "respond in X" hint.
_LANG_NAME_BY_CODE = {
    "en": "English",
    "es": "Spanish",
    "fr": "French (Français)",
    "vi": "Vietnamese",
}

# Per-language opening line. Must be in the target language because the TTS
# voice is language-specific — feeding English text to a French voice produces
# French-accented gibberish. New languages: add a translation here.
_GREETING_TEMPLATE_BY_LANG = {
    "en": (
        "Hi {name}, this is Recall calling on behalf of your radiologist "
        "about a follow-up from your recent imaging. Do you have a couple of "
        "minutes?"
    ),
    "fr": (
        "Bonjour {name}, c'est Recall qui vous appelle de la part de votre "
        "radiologue au sujet d'un suivi de votre récente imagerie. Avez-vous "
        "quelques minutes ?"
    ),
}


def _system_prompt(case: CaseContext) -> str:
    lang_name = _LANG_NAME_BY_CODE.get(case.patient_language, "English")
    return (
        "You are Recall, a friendly assistant calling a patient on behalf of "
        f"their radiologist. This is decision support only — never give a "
        "diagnosis, never speculate beyond the script, never discuss treatment. "
        "If the patient asks medical questions you cannot answer from the "
        "script, tell them their radiologist will follow up.\n\n"
        f"IMPORTANT: Speak to the patient ONLY in {lang_name}. Every response "
        f"you generate must be in {lang_name}. Do not switch languages even if "
        "the patient does.\n\n"
        f"Patient name: {case.patient_name}.\n"
        f"Offer this specific follow-up slot and only this slot: "
        f"{case.offered_slot}.\n"
        "When the patient agrees, call the book_followup function with that "
        "exact slot string. If they decline or ask to reschedule, tell them "
        "the office will call back, and end the call politely.\n\n"
        "Script from the radiologist (paraphrase warmly, stay faithful):\n"
        f"{case.patient_script}"
    )


def _greeting(case: CaseContext) -> str:
    template = _GREETING_TEMPLATE_BY_LANG.get(
        case.patient_language, _GREETING_TEMPLATE_BY_LANG["en"]
    )
    return template.format(name=case.patient_name)


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
            "listen": {
                "provider": {
                    "type": "deepgram",
                    "model": _LISTEN_MODEL_BY_LANG.get(lang, "nova-3"),
                    # Pin the STT language explicitly. nova-2 (used for fr/vi)
                    # defaults to English without this — transcribing French
                    # audio as word-salad English. Deepgram's docs are clear:
                    # agent.language does NOT propagate to listen.provider.
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
                            "offered follow-up slot. Call this only when the "
                            "patient explicitly confirms."
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
                        # No endpoint => client-side; Deepgram sends
                        # FunctionCallRequest to us and we reply with
                        # FunctionCallResponse.
                    }
                ],
            },
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": _SPEAK_MODEL_BY_LANG.get(lang, "aura-2-thalia-en"),
                }
            },
            "greeting": _greeting(case),
        },
    }
