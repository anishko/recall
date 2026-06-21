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

# Listen models — nova-3 handles en/es; vi falls back to nova-2.
_LISTEN_MODEL_BY_LANG = {"en": "nova-3", "es": "nova-3", "vi": "nova-2"}

# Speak (TTS) voice per language. en wired first; es/vi placeholders kept so
# adding them later is a data-only change.
_SPEAK_MODEL_BY_LANG = {
    "en": "aura-2-thalia-en",
    "es": "aura-2-celeste-es",
    "vi": "aura-2-thalia-en",  # TODO: replace when Deepgram ships a vi voice.
}


def _system_prompt(case: CaseContext) -> str:
    return (
        "You are Recall, calling a patient on behalf of their radiologist. "
        "Decision support only — no diagnosis, no treatment advice, no "
        "speculation beyond the script. Your role is to answer questions about what is discovered but nothing new. If asked about diagnosis you cannot "
        "answer from the script, say the radiologist will follow up.\n\n"
        "STYLE — critical:\n"
        "- Keep every reply SHORT: 1–2 sentences, under 25 words when possible.\n"
        "- One idea per turn. No filler, no repetition, no long intros.\n"
        "- Phone call, not a lecture. Get to the point fast.\n"
        "- After the patient answers, move to the next step immediately.\n\n"
        f"Patient: {case.patient_name}.\n"
        f"Offer only this slot: {case.offered_slot}.\n"
        "If they agree, call book_followup with that exact slot. If they "
        "decline or want another time, say the office will call back and end "
        "politely.\n\n"
        "Radiologist script (hit the key points briefly; do not read verbatim):\n"
        f"{case.patient_script}"
    )


def _greeting(case: CaseContext) -> str:
    return (
        f"Hi {case.patient_name}, this is the Recall Agent calling about your imaging follow-up. "
        "Got a minute?"
    )


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
