from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .database import engine, Base
from .routers import sleep_logs, fhir
Base.metadata.create_all(bind=engine)

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


@app.get("/health")
def health_check():
    return {"status": "ok"}
