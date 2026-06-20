# api

Single FastAPI service. Two lanes share it:
- `orchestrator/` — Vedant: Claude orchestrator + the 5 tool implementations.
- `voice/` — Anish: Deepgram Voice Agent bridge, Twilio Media Streams, outbound
  call trigger, sign-off SMS + approve/reject webhook, the call-gate check.
- `db/` — shared Supabase client + audit_log helper.

Webhooks (SendGrid inbound, Twilio status, sign-off link) must be reachable at the
public Render URL. Do not test webhooks against localhost on venue wifi.
