from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from sqlalchemy import text
from .database import engine, Base
from .routers import sleep_logs, fhir, insights
Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'sleep_logs' AND column_name = 'activity'"
        ))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE sleep_logs ADD COLUMN activity VARCHAR"))
            conn.commit()
except Exception:
    pass

app = FastAPI(title="SleepSync API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sleep_logs.router)
app.include_router(fhir.router)
app.include_router(insights.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
