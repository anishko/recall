"""Deepgram Voice Agent Settings builder.

The Settings message is what we send right after the agent WS opens. It must:
- use mulaw 8000 both directions (Twilio Media Streams compatibility)
- use Anthropic as the think provider (confirmed supported per Deepgram docs)
- carry the per-case Claude-drafted script as the system prompt
- greet the patient by name in the right language
- expose a book_followup function so the agent can confirm the synthetic slot
"""

from api.voice.agent_config import CaseContext, build_settings


def _case(**overrides) -> CaseContext:
    base = dict(
        case_id="case-001",
        patient_name="Anish",
        patient_language="en",
        patient_script="Tell Anish their CT showed a 6mm nodule and offer the slot.",
        offered_slot="Tue Jul 7 at 10:00 AM",
    )
    base.update(overrides)
    return CaseContext(**base)


def test_audio_is_twilio_compatible_mulaw_8khz():
    s = build_settings(_case())
    assert s["audio"]["input"] == {"encoding": "mulaw", "sample_rate": 8000}
    assert s["audio"]["output"] == {
        "encoding": "mulaw",
        "sample_rate": 8000,
        "container": "none",
    }


def test_think_provider_is_anthropic_claude():
    s = build_settings(_case())
    think = s["agent"]["think"]
    assert think["provider"]["type"] == "anthropic"
    assert think["provider"]["model"].startswith("claude-")


def test_prompt_contains_patient_script():
    case = _case(patient_script="Mention the 6mm lung nodule. Follow Fleischner.")
    s = build_settings(case)
    assert "6mm lung nodule" in s["agent"]["think"]["prompt"]
    # System framing must also remind the agent it cannot give medical advice.
    assert "decision support" in s["agent"]["think"]["prompt"].lower()


def test_greeting_uses_patient_name():
    s = build_settings(_case(patient_name="Anish"))
    assert "Anish" in s["agent"]["greeting"]


def test_offered_slot_present_in_prompt_for_agent_to_propose():
    s = build_settings(_case(offered_slot="Tue Jul 7 at 10:00 AM"))
    assert "Tue Jul 7 at 10:00 AM" in s["agent"]["think"]["prompt"]


def test_language_english_uses_english_voice():
    s = build_settings(_case(patient_language="en"))
    assert s["agent"]["language"] == "en"
    assert s["agent"]["speak"]["provider"]["model"].endswith("-en")


def test_book_followup_function_exposed():
    s = build_settings(_case())
    fns = s["agent"]["think"].get("functions") or []
    names = [f["name"] for f in fns]
    assert "book_followup" in names
    book = next(f for f in fns if f["name"] == "book_followup")
    assert book["parameters"]["properties"]["slot"]["type"] == "string"
    # Marked client-side so Deepgram returns the FunctionCallRequest to us
    # instead of trying to call an HTTP endpoint itself.
    assert book.get("endpoint") in (None, {})


def test_settings_envelope_type():
    s = build_settings(_case())
    assert s["type"] == "Settings"
