"""
ETL Pipeline: CSV → PostgreSQL
Handles all data quality issues identified during profiling:
- Parses violation_type JSON arrays
- Converts UTC → IST
- Drops null-only columns
- Assigns H3 hex zones
- Filters invalid records
"""

import pandas as pd
import numpy as np
import json
import pytz
import logging
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import engine, Base
from models.models import Violation, JunctionStats, StationStats, OffenderProfile

try:
    import h3
    H3_AVAILABLE = True
except ImportError:
    H3_AVAILABLE = False

IST = pytz.timezone("Asia/Kolkata")
logger = logging.getLogger(__name__)

BATCH_SIZE = 5000


def parse_violation_list(raw: str) -> list:
    """Parse JSON array string like '[\"WRONG PARKING\",\"NO PARKING\"]'"""
    if pd.isna(raw) or not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except Exception:
        return [str(raw)]


def assign_h3(lat: float, lon: float, resolution: int = 9) -> str:
    if H3_AVAILABLE and not (np.isnan(lat) or np.isnan(lon)):
        try:
            return h3.geo_to_h3(lat, lon, resolution)
        except Exception:
            pass
    return f"grid_{round(lat, 3)}_{round(lon, 3)}"


async def run_ingestion(csv_path: str, force: bool = False) -> dict:
    """Main ingestion entry point. Returns profiling report."""

    # --- Create tables ---
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # --- Check if already loaded ---
    if not force:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT COUNT(*) FROM violations"))
            count = result.scalar()
            if count and count > 0:
                return {"status": "already_loaded", "rows": count}

    logger.info(f"Loading CSV: {csv_path}")
    try:
        df = pd.read_csv(csv_path, low_memory=False)
    except FileNotFoundError:
        logger.warning(f"CSV file not found at {csv_path}")
        return {"status": "csv_not_found", "rows": 0}

    # --- PROFILING ---
    profile = {
        "raw_rows": len(df),
        "columns": [],
        "date_range": {},
        "issues": [],
    }

    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        null_pct = round(null_count / len(df) * 100, 2)
        profile["columns"].append({
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": int(df[col].nunique()),
        })
        if null_pct == 100:
            profile["issues"].append(f"Column '{col}' is 100% null — will be dropped")

    # --- DROP NULL COLUMNS ---
    null_cols = ["description", "closed_datetime", "action_taken_timestamp"]
    df.drop(columns=[c for c in null_cols if c in df.columns], inplace=True)

    # --- PARSE DATETIMES ---
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], utc=True, errors="coerce")
    df["modified_datetime"] = pd.to_datetime(df["modified_datetime"], utc=True, errors="coerce")
    df["validation_timestamp"] = pd.to_datetime(df["validation_timestamp"], utc=True, errors="coerce")

    # IST conversion
    df["created_datetime_ist"] = df["created_datetime"].dt.tz_convert(IST)
    df["hour_ist"] = df["created_datetime_ist"].dt.hour
    df["day_of_week"] = df["created_datetime_ist"].dt.dayofweek
    df["month_year"] = df["created_datetime_ist"].dt.strftime("%Y-%m")

    profile["date_range"] = {
        "min": str(df["created_datetime"].min()),
        "max": str(df["created_datetime"].max()),
        "months": sorted(df["month_year"].dropna().unique().tolist()),
    }

    # --- PARSE VIOLATION TYPES ---
    df["violation_types"] = df["violation_type"].apply(parse_violation_list)
    df["offence_codes"] = df["offence_code"].apply(parse_violation_list)

    # --- H3 HEXAGONS ---
    logger.info("Assigning H3 zones...")
    df["h3_index"] = df.apply(lambda r: assign_h3(r["latitude"], r["longitude"]), axis=1)

    # --- CLEAN JUNCTION ---
    df["junction_name"] = df["junction_name"].fillna("No Junction")

    # --- FILTER: drop rows with no datetime ---
    df = df[df["created_datetime"].notna()]

    profile["clean_rows"] = len(df)

    # --- BATCH INSERT ---
    logger.info(f"Inserting {len(df)} rows in batches of {BATCH_SIZE}...")

    async with engine.begin() as conn:
        try:
            await conn.execute(text("TRUNCATE TABLE violations CASCADE"))
        except Exception:
            pass  # Table might not exist yet

    for i in range(0, len(df), BATCH_SIZE):
        batch = df.iloc[i : i + BATCH_SIZE]
        records = []
        for _, row in batch.iterrows():
            def dt(val):
                if pd.isna(val):
                    return None
                if hasattr(val, 'to_pydatetime'):
                    return val.to_pydatetime()
                return val

            records.append({
                "id": str(row["id"]),
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "location": row.get("location") if pd.notna(row.get("location", None)) else None,
                "vehicle_number": row["vehicle_number"],
                "vehicle_type": row["vehicle_type"],
                "violation_types": json.dumps(row["violation_types"]) if isinstance(row["violation_types"], list) else json.dumps([]),
                "offence_codes": json.dumps(row["offence_codes"]) if isinstance(row["offence_codes"], list) else json.dumps([]),
                "created_datetime": dt(row["created_datetime"]),
                "created_datetime_ist": dt(row["created_datetime_ist"]),
                "modified_datetime": dt(row.get("modified_datetime", None)),
                "device_id": row.get("device_id"),
                "created_by_id": row.get("created_by_id"),
                "center_code": int(row["center_code"]) if pd.notna(row.get("center_code", None)) else None,
                "police_station": row.get("police_station"),
                "data_sent_to_scita": bool(row.get("data_sent_to_scita", False)),
                "junction_name": row["junction_name"],
                "updated_vehicle_number": row.get("updated_vehicle_number") if pd.notna(row.get("updated_vehicle_number", None)) else None,
                "updated_vehicle_type": row.get("updated_vehicle_type") if pd.notna(row.get("updated_vehicle_type", None)) else None,
                "validation_status": row.get("validation_status") if pd.notna(row.get("validation_status", None)) else None,
                "validation_timestamp": dt(row.get("validation_timestamp", None)),
                "h3_index": row["h3_index"],
                "hour_ist": int(row["hour_ist"]) if pd.notna(row.get("hour_ist", None)) else None,
                "day_of_week": int(row["day_of_week"]) if pd.notna(row.get("day_of_week", None)) else None,
                "month_year": row.get("month_year"),
            })

        async with engine.begin() as conn:
            await conn.execute(
                text("""
                    INSERT INTO violations (
                        id, latitude, longitude, location, vehicle_number, vehicle_type,
                        violation_types, offence_codes, created_datetime, created_datetime_ist,
                        modified_datetime, device_id, created_by_id, center_code,
                        police_station, data_sent_to_scita, junction_name,
                        updated_vehicle_number, updated_vehicle_type,
                        validation_status, validation_timestamp,
                        h3_index, hour_ist, day_of_week, month_year
                    ) VALUES (
                        :id, :latitude, :longitude, :location, :vehicle_number, :vehicle_type,
                        CAST(:violation_types AS jsonb), CAST(:offence_codes AS jsonb),
                        :created_datetime, :created_datetime_ist,
                        :modified_datetime, :device_id, :created_by_id, :center_code,
                        :police_station, :data_sent_to_scita, :junction_name,
                        :updated_vehicle_number, :updated_vehicle_type,
                        :validation_status, :validation_timestamp,
                        :h3_index, :hour_ist, :day_of_week, :month_year
                    ) ON CONFLICT (id) DO NOTHING
                """),
                records,
            )
        logger.info(f"  Inserted batch {i // BATCH_SIZE + 1}/{(len(df) - 1) // BATCH_SIZE + 1}")

    profile["status"] = "success"
    logger.info("Ingestion complete.")
    return profile


async def get_profile_report() -> dict:
    """Return live data profile from DB."""
    async with engine.connect() as conn:
        total = (await conn.execute(text("SELECT COUNT(*) FROM violations"))).scalar()
        stations = (await conn.execute(text("SELECT COUNT(DISTINCT police_station) FROM violations"))).scalar()
        junctions = (await conn.execute(text("SELECT COUNT(DISTINCT junction_name) FROM violations WHERE junction_name != 'No Junction'"))).scalar()
        vehicles = (await conn.execute(text("SELECT COUNT(DISTINCT vehicle_number) FROM violations"))).scalar()
        date_min = (await conn.execute(text("SELECT MIN(created_datetime_ist) FROM violations"))).scalar()
        date_max = (await conn.execute(text("SELECT MAX(created_datetime_ist) FROM violations"))).scalar()
        vtypes = (await conn.execute(text("SELECT vehicle_type, COUNT(*) as cnt FROM violations GROUP BY vehicle_type ORDER BY cnt DESC LIMIT 10"))).fetchall()
        stations_top = (await conn.execute(text("SELECT police_station, COUNT(*) as cnt FROM violations GROUP BY police_station ORDER BY cnt DESC LIMIT 10"))).fetchall()

    return {
        "total_violations": total,
        "police_stations": stations,
        "junctions_named": junctions,
        "unique_vehicles": vehicles,
        "date_range": {"min": str(date_min), "max": str(date_max)},
        "vehicle_type_distribution": [{"type": r[0], "count": r[1]} for r in vtypes],
        "top_stations": [{"station": r[0], "count": r[1]} for r in stations_top],
    }
