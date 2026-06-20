from fastapi import FastAPI

from api.voice.router import router as voice_router

app = FastAPI(title="RadRelay API")
app.include_router(voice_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
