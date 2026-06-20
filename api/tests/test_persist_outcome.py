"""When the bridge tears down, we must write call_outcome, call_transcript,
and followup_booked_slot to the case row, and audit the event.
"""

import pytest

from api.db import cases as case_repo


class _Stub:
    def __init__(self):
        self.updates: list[tuple[str, dict]] = []

    def update_case(self, case_id, **fields):
        self.updates.append((case_id, fields))


def test_update_case_call_outcome_writes_expected_fields(monkeypatch):
    recorded: list[tuple[str, dict]] = []

    class FakeQuery:
        def __init__(self, table):
            self.table = table
            self._payload = None
            self._case_id = None

        def update(self, payload):
            self._payload = payload
            return self

        def eq(self, col, val):
            assert col == "id"
            self._case_id = val
            return self

        def execute(self):
            recorded.append((self._case_id, self._payload))
            return type("R", (), {"data": []})()

    class FakeClient:
        def table(self, t):
            return FakeQuery(t)

    monkeypatch.setattr(case_repo, "get_supabase", lambda: FakeClient())

    case_repo.update_call_outcome(
        case_id="c1",
        outcome="booked",
        transcript=[
            {"role": "assistant", "content": "Hi"},
            {"role": "user", "content": "Yes"},
        ],
        booked_slot="Tue Jul 7 at 10:00 AM",
    )

    assert len(recorded) == 1
    case_id, fields = recorded[0]
    assert case_id == "c1"
    assert fields["call_outcome"] == "booked"
    assert "Hi" in fields["call_transcript"]
    assert "Yes" in fields["call_transcript"]
    assert fields["followup_booked_slot"] == "Tue Jul 7 at 10:00 AM"


def test_update_case_call_outcome_omits_slot_when_not_booked(monkeypatch):
    recorded: list[tuple[str, dict]] = []

    class FakeQuery:
        def __init__(self, table):
            self.table = table

        def update(self, payload):
            self._payload = payload
            return self

        def eq(self, col, val):
            self._case_id = val
            return self

        def execute(self):
            recorded.append((self._case_id, self._payload))
            return type("R", (), {"data": []})()

    class FakeClient:
        def table(self, t):
            return FakeQuery(t)

    monkeypatch.setattr(case_repo, "get_supabase", lambda: FakeClient())

    case_repo.update_call_outcome(
        case_id="c1", outcome="declined", transcript=[], booked_slot=None
    )
    _, fields = recorded[0]
    assert fields["call_outcome"] == "declined"
    assert "followup_booked_slot" not in fields
