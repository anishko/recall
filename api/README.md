# api

Single FastAPI service. Two lanes share it:
- `orchestrator/` — Vedant: Claude orchestrator + the 5 tool implementations.
- `voice/` — Anish: Deepgram Voice Agent bridge, Twilio Media Streams, outbound
  call trigger, sign-off SMS + approve/reject webhook, the call-gate check.
- `db/` — shared Supabase client + audit_log helper.

Webhooks (SendGrid inbound, Twilio status, sign-off link) must be reachable at the
public Render URL. Do not test webhooks against localhost on venue wifi.

## Twilio quick start (voice lane)

Shared team Twilio account. Credentials live in `.env` at repo root (never commit).

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Trial account:** each teammate must [verify their phone](https://console.twilio.com/us1/develop/phone-numbers/manage/verified) before they can receive test calls/SMS.

```bash
# From api/ with venv active:
python scripts/test_call.py --to +1YOURVERIFIEDNUMBER
```

### What's in `voice/` today
- `config.py` — loads Twilio env vars from root `.env`
- `client.py` — Twilio REST client
- `calls.py` — `place_test_call()` (TwiML Say; hello-world only)

### Still to build (Anish)
- Deepgram Voice Agent + Twilio Media Streams WebSocket bridge
- `place_patient_call` with signoff gate (`cases.signoff_status = approved`)
- Sign-off SMS + JWT approve/reject webhook
- Call status webhook → update `cases.call_sid`, `call_outcome`, `call_transcript`

