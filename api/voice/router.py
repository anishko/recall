from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from api.voice.call import SignoffNotApprovedError, place_patient_call

router = APIRouter(prefix="/voice", tags=["voice"])


class OutboundCallRequest(BaseModel):
    case_id: str
    phone: str
    script: str
    language: str = Field(pattern="^(en|es|vi)$")


@router.post("/outbound-call")
def outbound_call(req: OutboundCallRequest) -> dict:
    try:
        return place_patient_call(req.case_id, req.phone, req.script, req.language)
    except SignoffNotApprovedError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.websocket("/media-stream")
async def media_stream(ws: WebSocket) -> None:
    """Twilio <Stream> bidirectional websocket endpoint.

    Twilio sends JSON frames: {event: start|media|stop, ...}. Media payloads are
    base64 mu-law 8kHz mono.

    TODO(deepgram-bridge): bridge inbound Twilio frames to Deepgram Voice Agent
    and pipe agent audio back as outbound media frames. Waiting on confirmation
    of whether Voice Agent uses Claude directly before wiring (CLAUDE.md
    "Verify early"). For now this just accepts the socket and drains frames so
    Twilio doesn't error on connect during integration smoke tests.
    """
    await ws.accept()
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        return
