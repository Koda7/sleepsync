# SleepSync: Sleep Health Management Application

SleepSync is a FHIR-connected web application that gives patients and providers a shared picture of sleep health. It pulls clinical context (demographics, conditions, medications) from a FHIR R4 server and pairs it with patient-reported sleep logs to surface trends, generate AI-powered summaries, and predict sleep quality risk using a trained machine learning model.

**CS 6440 — Spring 2026 Practicum Project (Team 105)**

## Live Deployment

| Service | URL |
|---------|-----|
| Frontend | https://frontend-bice-iota-24.vercel.app |
| Backend API Docs | https://sleepsync-yiqn.onrender.com/docs |

**Recommended demo patient:** Search for `Abel832` in the patient selector. Abel832 Kip442 Wolff180 has 30 sleep logs, active conditions (sleep apnea, chronic pain, insomnia), and current medications — the fullest demo experience.

> **Note:** The Render backend runs on a free tier and may take 30–60 seconds to wake from a cold start on the first request.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts, Vite |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL (Render) / SQLite (local dev) |
| FHIR | HAPI FHIR R4 public server, fhir.resources library |
| ML | scikit-learn (RandomForest), joblib |
| AI Summaries | Hugging Face Inference API (Llama 3.2 1B) with rule-based fallback |
| Hosting | Vercel (frontend), Render (backend + PostgreSQL) |

## Architecture

```
┌──────────────┐     REST      ┌──────────────────┐     FHIR R4     ┌────────────────┐
│   React SPA  │ ◄───────────► │  FastAPI Backend  │ ◄─────────────► │  HAPI FHIR R4  │
│   (Vercel)   │               │    (Render)       │                 │  Public Server │
└──────────────┘               └────────┬─────────┘                 └────────────────┘
                                        │
                               ┌────────▼─────────┐
                               │   PostgreSQL      │
                               │  (sleep logs,     │
                               │   session data)   │
                               └──────────────────┘
```

The frontend never talks to the FHIR server directly. All clinical data fetching, ML inference, and AI summary generation happen on the backend. This isolates FHIR complexity and keeps the frontend focused on presentation.

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend defaults to SQLite (`sleepsync_dev.db`) for local development. No database setup required.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173. The frontend automatically proxies API requests to the local backend in development.

### Environment Variables (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./sleepsync_dev.db` | PostgreSQL connection string for production |
| `FHIR_BASE_URL` | `https://hapi.fhir.org/baseR4` | FHIR R4 server base URL |
| `FHIR_TIMEOUT` | `30` | Request timeout for FHIR calls (seconds) |
| `HF_TOKEN` | (empty) | Hugging Face API token for AI summaries |
| `ALLOWED_ORIGINS` | (empty) | Comma-separated list of additional CORS origins |

### Seeding Demo Data

To populate the database with sample sleep logs for demo patients:

```bash
cd /path/to/project/root
DATABASE_URL="your_database_url" python -m backend.seed
```

This creates 30 sleep log entries each for Abel832 and one additional demo patient.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, startup migrations
│   │   ├── config.py            # Environment variable configuration
│   │   ├── database.py          # SQLAlchemy engine and session
│   │   ├── models/              # SQLAlchemy models (SleepLog)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API endpoints (sleep_logs, fhir, insights)
│   │   └── services/            # FHIR client, ML predictor, HF inference
│   ├── train_model.py           # ML model training script
│   ├── seed.py                  # Database seeding script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router and layout
│   │   ├── api.ts               # API base URL configuration
│   │   ├── context/             # PatientContext (global patient state)
│   │   ├── pages/               # Dashboard, SleepLog, Insights
│   │   ├── components/          # Navbar, stat cards, charts, tables
│   │   └── types/               # TypeScript type definitions
│   └── package.json
└── README.md
```

## Features

- **Dashboard**: Sleep trend charts, summary statistics, medication sidebar, active conditions, recent sleep log table with activity tracking
- **Sleep Log**: One-minute entry form with hours, quality, disturbances, stress, activity before bed, and notes
- **Insights — AI Summary**: Plain-language analysis of sleep trends incorporating conditions and medications
- **Insights — ML Prediction**: Sleep quality risk score using 26 features from sleep logs, FHIR conditions, medications, and demographics
- **Insights — Medication Timeline**: Recharts Gantt-style chart showing prescription history with current/earlier status
- **Patient Selector**: FHIR-powered search across 200+ Synthea patients with recent patient tracking

## Data Sources

- **HAPI FHIR R4 Public Server**: Patient, Condition, and MedicationRequest resources for ~200 Synthea-generated patients with sleep-relevant clinical profiles
- **PostgreSQL**: Patient-reported sleep logs stored in the application database
- **Synthea**: Synthetic patient generator used to create patients with conditions (insomnia, sleep apnea, anxiety, chronic pain, depression, hypertension) and medications (diphenhydramine, zolpidem, sertraline, melatonin, ibuprofen, acetaminophen)

## Team

| Name | Role | Focus |
|------|------|-------|
| Ruthvik Kodati | Backend / ML / DevOps | API, ML pipeline, AI summaries, deployment |
| Samuel Adegoke | Frontend | Dashboard, Insights UI, medication timeline |
| Ni Xiong | Frontend | Shared components, UX, timeline clarity |
| Rhea Sridhar | Fullstack | Synthea data, end-to-end testing, CORS/edge cases |
| Rod Joseph | Fullstack | FHIR integration, patient selector, API endpoints |
