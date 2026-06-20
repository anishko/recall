# voice lane

Owner: Anish. Handles the outbound call, the Twilio↔Deepgram bridge, and
persisting the outcome.

## How a call happens

1. Caller (Vedant's orchestrator, or `scripts/hello_world_call.py`) invokes
   `place_patient_call(case_id, phone, script, language)`.
2. `call.py` re-reads `cases.signoff_status` straight from Postgres. If it
   isn't `'approved'`, raises `SignoffNotApprovedError` — no Twilio dial.
   This is the only enforcement point for CLAUDE.md invariant #1.
3. We dial via Twilio REST with inline TwiML:
   ```xml
   <Response><Connect>
     <Stream url="wss://<PUBLIC_API_BASE_URL>/voice/media-stream">
       <Parameter name="caseId" value="<uuid>"/>
     </Stream>
   </Connect></Response>
   ```
4. Twilio answers the patient's PSTN call and opens a bidirectional WS to
   `/voice/media-stream` (`router.py`).
5. The WS handler delegates to `bridge.run_bridge`, which:
   - waits for Twilio's `start` event to read `streamSid` + `caseId`
   - loads the case (`get_case`), builds `CaseContext`, computes the
     synthetic offered slot from `guideline_classification.timeframe_days`
   - opens `wss://agent.deepgram.com/v1/agent/converse` with
     `Authorization: Token <DEEPGRAM_API_KEY>`
   - sends the Settings message (`agent_config.build_settings`):
     mu-law 8 kHz both directions, Anthropic think provider, the
     Claude-drafted script as the `prompt`, a per-patient `greeting`, and a
     `book_followup` client-side function
   - bidirectionally pumps audio (Twilio inbound → Deepgram, Deepgram audio
     → Twilio outbound media frames)
   - on `ConversationText` events, appends to an in-memory transcript
   - on `FunctionCallRequest` for `book_followup`, records the slot in
     `BridgeState`, replies with `FunctionCallResponse`
6. When Twilio sends `stop` or either socket closes, the handler calls
   `_persist_outcome`, which writes `call_outcome`, `call_transcript`, and
   `followup_booked_slot` to `cases` and audits.

## LLM choice

Deepgram Voice Agent supports Anthropic as a managed think provider — the
`/v1/agent/settings/think/models` endpoint lists Claude models. We
configure `think.provider = {type: "anthropic", model: ...}`. Default model
is `claude-3-5-haiku-latest` for voice latency; override with
`DEEPGRAM_AGENT_THINK_MODEL` if needed.

## Ship the English hello-world

1. Deploy `api/` somewhere with a public HTTPS URL (Render is the
   prod target). For laptop testing, `ngrok http 8000` and use the
   forwarding URL.
2. Set `PUBLIC_API_BASE_URL` to that public https URL in your `.env`.
3. Make sure the Twilio number has voice enabled and the Deepgram /
   Anthropic / Supabase keys are in `.env`.
4. Apply `supabase/schema.sql` if you haven't.
5. From repo root:
   ```bash
   .venv/bin/python -m scripts.hello_world_call +1XXXXXXXXXX Anish
   ```
6. Your phone rings; the agent greets you by name in English, offers a
   single follow-up slot, and books it when you say yes. Check
   `cases` for `call_outcome='booked'` and the slot string.

## Adding es / vi

Data-only change in `agent_config.py`:
- `_LISTEN_MODEL_BY_LANG` / `_SPEAK_MODEL_BY_LANG` per-language entries
- `language` passes straight through to Deepgram

System prompt and greeting are language-agnostic in code; populate
`cases.patient_script` in the target language and `cases.patient_language`
with `'es'` or `'vi'`. Vietnamese TTS does not yet have a Deepgram aura-2
voice; currently falls back to English voice — replace once Deepgram ships
one.

## Files

- `call.py`           — gate + Twilio dial. Hard invariant lives here.
- `twilio_client.py`  — Twilio client factory, TwiML builder.
- `agent_config.py`   — Voice Agent Settings JSON per case.
- `bridge.py`         — pure handlers + async `run_bridge` runner.
- `router.py`         — POST `/voice/outbound-call`, WS `/voice/media-stream`.
