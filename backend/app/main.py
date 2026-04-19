from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from sqlalchemy import text, inspect as sa_inspect
from .database import engine, Base
from .routers import sleep_logs, fhir, insights
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    cols = {c["name"] for c in sa_inspect(engine).get_columns("sleep_logs")}
    if "activity" not in cols:
        conn.execute(text("ALTER TABLE sleep_logs ADD COLUMN activity VARCHAR"))
        conn.commit()

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
