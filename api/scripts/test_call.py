#!/usr/bin/env python3
"""Place a test outbound Twilio call."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from voice.calls import place_test_call

DEFAULT_MESSAGE = (
    "Hello from RadRelay. Your Twilio integration is working. "
    "This is a test call from your hackathon build."
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Place a RadRelay test call via Twilio")
    parser.add_argument(
        "--to",
        required=True,
        help="E.164 phone number to dial, e.g. +14045551234",
    )
    parser.add_argument(
        "--message",
        default=DEFAULT_MESSAGE,
        help="Spoken message (TwiML Say)",
    )
    args = parser.parse_args()

    sid = place_test_call(args.to, args.message)
    print(f"Call placed. SID: {sid}")


if __name__ == "__main__":
    main()
