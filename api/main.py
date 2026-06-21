import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Pick up .env so `uvicorn api.main:app` sees DEEPGRAM/SUPABASE/TWILIO keys
# and DEEPGRAM_AGENT_THINK_MODEL overrides — no shell `export` needed.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from api.orchestrator.router import router as orchestrator_router  # noqa: E402
from api.voice.router import router as voice_router  # noqa: E402

# Uvicorn only configures its own loggers — make sure our radrelay.* logs
# also show up at INFO, with a useful format.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("radrelay").setLevel(logging.INFO)

app = FastAPI(title="RadRelay API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(voice_router)
app.include_router(orchestrator_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
