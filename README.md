# Traffic Command Center AI

> AI-Powered Traffic Intelligence & Decision Support Platform for Bengaluru's ITMS

---

## Overview

Traffic Command Center AI transforms 298,450 historical traffic violation records (Nov 2023 – Apr 2024) from Bengaluru's Intelligent Traffic Management System into a real-time decision support platform for traffic police, station commanders, and city authorities.

**Stack:** Next.js 15 · FastAPI · PostgreSQL · Redis · Google Gemini · Leaflet Maps

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Gemini API key
- MapmyIndia API key
- The dataset CSV file

### Setup

```bash
# 1. Clone / extract the project
cd traffic-command-center

# 2. Place the dataset
mkdir -p data
cp /path/to/jan_to_may_police_violation_anonymized791b166.csv data/violations.csv

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env:
#   GEMINI_API_KEY=your_gemini_key
#   MAPMYINDIA_API_KEY=your_mapmyindia_key

cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local:
#   NEXT_PUBLIC_MAPMYINDIA_KEY=your_mapmyindia_key

# 4. Launch
docker compose up --build

# 5. Open
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs:   http://localhost:8000/docs
```

### Default Credentials

```
Username: admin
Password: admin123
```

---

## Architecture

```
frontend/          Next.js 15 + React 19
  src/
    app/           Page routes (command-center, analytics, ai-copilot, reporting, admin)
    components/    Shared UI (map, charts, cards, layout, ai)
    lib/           API client (axios)
    store/         Zustand global state

backend/
  main.py          FastAPI app entry point
  core/            Config, database, Redis cache
  models/          SQLAlchemy ORM models
  routers/         API endpoints (analytics, ai, auth)
  analytics/       Query engine — all metrics computed server-side
  services/        Ingestion pipeline, Gemini AI, JWT auth

docker-compose.yml PostgreSQL 16 + Redis 7 + backend + frontend
```

---

## Platform Modules

### Command Center
- KPI overview (total violations, stations, repeat offenders, growth rate)
- Live Leaflet map with heatmap and junction risk markers
- Junction Intelligence Panel (click any marker)
- Risk-ranked junction table with deployment recommendations
- AI Intelligence Feed (Gemini-generated insights)

### Analytics
- Monthly violation trends
- Hourly distribution (IST, peak hour highlighted)
- Day-of-week patterns
- Vehicle type breakdown
- Violation type analysis (from parsed JSON arrays)
- Police station workload rankings
- Repeat offender profiles
- Junction risk distribution (pie chart)
- Hotspot classification

### AI Copilot
- Gemini 1.5 Flash with full live analytics context
- Answers enforcement, deployment, and trend questions
- Quick prompt library for common queries
- IST-timestamped conversation history

### Reports & Simulation
- One-click AI situation reports: Daily / Weekly / Monthly / Executive
- Markdown export
- What-If Simulator: model intervention scenarios (officers, tow vehicles, enforcement intensity)
- AI narrative for simulation results

### Administration
- Live data profile dashboard
- Dataset statistics and quality notes
- Re-ingest trigger

---

## Data Pipeline Notes

The ETL pipeline handles all dataset-specific issues automatically:

| Issue | Resolution |
|---|---|
| `violation_type` stored as JSON array string | Parsed with `json.loads()` into proper JSONB arrays |
| Timestamps in UTC | Converted to IST (Asia/Kolkata) at ingestion |
| 49.6% records with `junction_name = "No Junction"` | H3 hex zones assigned at resolution 9 |
| 3 columns 100% null | Dropped at ingestion (`description`, `closed_datetime`, `action_taken_timestamp`) |
| Vehicle numbers anonymized | Preserved as-is; relative frequency correct |
| Actual date range Nov 2023–Apr 2024 (not Jan–May) | Auto-detected from data, displayed correctly |

---

## Junction Risk Score Formula

```
Risk Score =
  Violation Density  × 40%
  Peak Hour Load     × 20%
  Repeat Offender Rate × 20%
  Monthly Growth Rate  × 20%

Normalized 0–100

  0–30  → Low
 31–60  → Moderate
 61–80  → High
 81–100 → Critical
```

---

## Deployment Recommendations

| Risk Score | Officers | Tow Vehicles | Priority |
|---|---|---|---|
| > 90 | 3 | 1 | Immediate |
| > 80 | 2 | 0 | High |
| > 70 | 1 | 0 | Medium |
| ≤ 70 | — | — | Routine |

---

## API Endpoints

```
POST /api/auth/login
GET  /api/auth/me
GET  /api/analytics/kpis
GET  /api/analytics/junctions/risk
GET  /api/analytics/junctions/{name}/detail
GET  /api/analytics/stations
GET  /api/analytics/offenders
GET  /api/analytics/temporal
GET  /api/analytics/heatmap
GET  /api/analytics/hotspots
GET  /api/analytics/vehicles
GET  /api/analytics/violations/types
POST /api/analytics/whatif
POST /api/ai/chat
GET  /api/ai/report/{type}
GET  /api/ai/insights
POST /api/ai/whatif/narrative
GET  /api/admin/profile
GET  /api/admin/filters/options
POST /api/admin/ingest
GET  /api/health
```

All analytics endpoints support query params: `start_date`, `end_date`, `police_station`, `vehicle_type`, `validation_status`

Full interactive docs: `http://localhost:8000/docs`

---

## Performance

- Server-side aggregation — no raw data sent to frontend
- Redis caching (10-minute TTL on all analytics queries)
- Paginated junction table (15 rows/page)
- Heatmap capped at 5,000 points
- Map markers capped at 50 highest-risk junctions

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/traffic_cmd
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-long-random-string
GEMINI_API_KEY=your_gemini_api_key
MAPMYINDIA_API_KEY=your_mapmyindia_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000
CSV_PATH=/data/violations.csv
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPMYINDIA_KEY=your_mapmyindia_key
```
