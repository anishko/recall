import logging

from dotenv import load_dotenv
from fastapi import FastAPI

# Pick up .env so `uvicorn api.main:app` sees DEEPGRAM/SUPABASE/TWILIO keys
# and DEEPGRAM_AGENT_THINK_MODEL overrides — no shell `export` needed.
load_dotenv()

from api.voice.router import router as voice_router  # noqa: E402

# Uvicorn only configures its own loggers — make sure our radrelay.* logs
# also show up at INFO, with a useful format.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("radrelay").setLevel(logging.INFO)

app = FastAPI(title="RadRelay API")
app.include_router(voice_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
