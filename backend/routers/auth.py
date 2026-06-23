from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.ingestion import run_ingestion, get_profile_report
from sqlalchemy import text
from core.database import engine
import uuid

router = APIRouter(tags=["auth"])



# ─── ADMIN ─────────────────────────────────────────────────────────────────────

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/api/admin/ingest")
async def trigger_ingestion(
    csv_path: str = "/data/violations.csv",
    force: bool = False
):
    result = await run_ingestion(csv_path, force=force)
    return result


@router.get("/api/admin/profile")
async def data_profile():
    return await get_profile_report()


@router.get("/api/admin/filters/options")
async def filter_options():
    """Return all unique filter values for dropdowns."""
    async with engine.connect() as conn:
        stations = (await conn.execute(text(
            "SELECT DISTINCT police_station FROM violations WHERE police_station IS NOT NULL ORDER BY police_station"
        ))).fetchall()

        vtypes = (await conn.execute(text(
            "SELECT DISTINCT vehicle_type FROM violations ORDER BY vehicle_type"
        ))).fetchall()

        months = (await conn.execute(text(
            "SELECT DISTINCT month_year FROM violations WHERE month_year IS NOT NULL ORDER BY month_year"
        ))).fetchall()

        junctions = (await conn.execute(text(
            "SELECT DISTINCT junction_name FROM violations WHERE junction_name != 'No Junction' ORDER BY junction_name LIMIT 200"
        ))).fetchall()

    return {
        "police_stations": [r[0] for r in stations],
        "vehicle_types": [r[0] for r in vtypes],
        "months": [r[0] for r in months],
        "junctions": [r[0] for r in junctions],
        "validation_statuses": ["approved", "rejected", "created1", "processing", "duplicate"],
    }
