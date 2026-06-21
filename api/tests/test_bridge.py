"""Bridge handlers — pure logic for Twilio↔Deepgram event dispatch.

We keep these pure so the websocket plumbing can be tested by feeding canned
events and asserting outbound effects, without any real sockets.
"""

import base64
import json

import pytest

from api.voice.bridge import (
    BridgeState,
    deepgram_text_event,
    twilio_text_event,
    twilio_media_frame,
)


def test_twilio_start_event_captures_streamsid_and_case_id():
    state = BridgeState()
    event = json.dumps(
        {
            "event": "start",
            "start": {
                "streamSid": "MZxxx",
                "customParameters": {"caseId": "case-abc"},
            },
        }
    )
    out = twilio_text_event(state, event)
    assert state.stream_sid == "MZxxx"
    assert state.case_id == "case-abc"
    # No outbound action expected — handshake only.
    assert out == []


def test_twilio_media_event_yields_audio_bytes_to_forward():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    payload_bytes = b"\xff\xfe\xfd\xfc"
    payload_b64 = base64.b64encode(payload_bytes).decode()
    event = json.dumps(
        {
            "event": "media",
            "media": {"track": "inbound", "payload": payload_b64},
        }
    )
    out = twilio_text_event(state, event)
    assert out == [("dg_audio", payload_bytes)]


def test_twilio_outbound_media_track_is_ignored():
    """Twilio echoes outbound frames too; only forward inbound (patient)."""
    state = BridgeState(stream_sid="MZ", case_id="c1")
    event = json.dumps(
        {
            "event": "media",
            "media": {"track": "outbound", "payload": "AAAA"},
        }
    )
    assert twilio_text_event(state, event) == []


def test_twilio_stop_event_marks_done():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    out = twilio_text_event(state, json.dumps({"event": "stop"}))
    assert state.stopped is True
    assert out == []


def test_twilio_media_frame_wraps_bytes_for_twilio():
    frame = twilio_media_frame("MZxxx", b"\x01\x02\x03")
    parsed = json.loads(frame)
    assert parsed["event"] == "media"
    assert parsed["streamSid"] == "MZxxx"
    assert base64.b64decode(parsed["media"]["payload"]) == b"\x01\x02\x03"


def test_deepgram_conversation_text_appends_to_transcript():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    msg = {"type": "ConversationText", "role": "user", "content": "Hi"}
    out = deepgram_text_event(state, json.dumps(msg))
    assert state.transcript[-1] == {"role": "user", "content": "Hi"}
    assert out == []


def test_deepgram_function_call_book_followup_records_slot_and_responds():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    msg = {
        "type": "FunctionCallRequest",
        "functions": [
            {
                "id": "fn-1",
                "name": "book_followup",
                "arguments": '{"slot": "Tue Jul 7 at 10:00 AM"}',
                "client_side": True,
            }
        ],
    }
    out = deepgram_text_event(state, json.dumps(msg))
    assert state.booked_slot == "Tue Jul 7 at 10:00 AM"
    # Must reply with FunctionCallResponse so the agent can continue.
    assert len(out) == 1
    kind, payload = out[0]
    assert kind == "dg_text"
    parsed = json.loads(payload)
    assert parsed["type"] == "FunctionCallResponse"
    assert parsed["id"] == "fn-1"
    assert "ok" in parsed["content"].lower()


def test_deepgram_unknown_function_responds_with_error():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    msg = {
        "type": "FunctionCallRequest",
        "functions": [
            {"id": "fn-x", "name": "wire_payment", "arguments": "{}",
             "client_side": True}
        ],
    }
    out = deepgram_text_event(state, json.dumps(msg))
    kind, payload = out[0]
    assert kind == "dg_text"
    parsed = json.loads(payload)
    assert parsed["type"] == "FunctionCallResponse"
    assert parsed["id"] == "fn-x"


def test_deepgram_unknown_event_is_ignored():
    state = BridgeState(stream_sid="MZ", case_id="c1")
    assert deepgram_text_event(state, json.dumps({"type": "Welcome"})) == []
    assert state.transcript == []


def test_malformed_json_does_not_crash():
    state = BridgeState()
    twilio_text_event(state, "not json")
    deepgram_text_event(state, "not json")
