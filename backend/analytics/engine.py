"""
Analytics Engine
Computes all metrics from the violations table.
All queries use server-side aggregation.
Results are cached in Redis.
"""

import json
import math
from sqlalchemy import text
from core.cache import cache_get, cache_set
from core.database import engine

CACHE_TTL = 600  # 10 minutes


# ─── OVERVIEW KPIs ─────────────────────────────────────────────────────────────

async def get_kpis(filters: dict = None) -> dict:
    cache_key = f"kpis:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        total = (await conn.execute(text(f"SELECT COUNT(*) FROM violations {where}"), params)).scalar()

        stations = (await conn.execute(text(
            f"SELECT COUNT(DISTINCT police_station) FROM violations {where}"), params)).scalar()

        junctions = (await conn.execute(text(
            f"SELECT COUNT(DISTINCT junction_name) FROM violations {where} AND junction_name != 'No Junction'"), params)).scalar()

        repeat = (await conn.execute(text(f"""
            SELECT COUNT(*) FROM (
                SELECT vehicle_number FROM violations {where}
                GROUP BY vehicle_number HAVING COUNT(*) >= 3
            ) sub
        """), params)).scalar()

        # Growth rate: compare last full month vs previous
        growth_data = (await conn.execute(text("""
            SELECT month_year, COUNT(*) as cnt
            FROM violations
            WHERE month_year IS NOT NULL
            GROUP BY month_year ORDER BY month_year DESC LIMIT 2
        """))).fetchall()

    growth_rate = 0.0
    if len(growth_data) >= 2:
        curr, prev = growth_data[0][1], growth_data[1][1]
        if prev > 0:
            growth_rate = round((curr - prev) / prev * 100, 1)

    result = {
        "total_violations": total,
        "police_stations": stations,
        "named_junctions": junctions,
        "repeat_offenders": repeat,
        "high_risk_zones": 0,  # filled after junction risk compute
        "violation_growth_rate": growth_rate,
    }

    await cache_set(cache_key, result, CACHE_TTL)
    return result


# ─── JUNCTION INTELLIGENCE ──────────────────────────────────────────────────────

async def compute_junction_risk(filters: dict = None) -> list:
    cache_key = f"junction_risk:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            WITH base AS (
                SELECT junction_name,
                       AVG(latitude) as lat, AVG(longitude) as lon,
                       COUNT(*) as total,
                       MODE() WITHIN GROUP (ORDER BY hour_ist) as peak_hour,
                       police_station
                FROM violations
                {where} AND junction_name != 'No Junction'
                GROUP BY junction_name, police_station
            ),
            offender_rates AS (
                SELECT junction_name,
                       COUNT(*) FILTER (WHERE veh_cnt >= 3) as repeat_count
                FROM (
                    SELECT junction_name, vehicle_number, COUNT(*) as veh_cnt
                    FROM violations
                    {where} AND junction_name != 'No Junction'
                    GROUP BY junction_name, vehicle_number
                ) sub
                GROUP BY junction_name
            ),
            monthly AS (
                SELECT junction_name, month_year, COUNT(*) as mcnt
                FROM violations
                {where} AND junction_name != 'No Junction'
                GROUP BY junction_name, month_year
            ),
            growth AS (
                SELECT junction_name,
                       MAX(CASE WHEN rn=1 THEN mcnt END) as last_month,
                       MAX(CASE WHEN rn=2 THEN mcnt END) as prev_month
                FROM (
                    SELECT junction_name, mcnt,
                           ROW_NUMBER() OVER (PARTITION BY junction_name ORDER BY month_year DESC) as rn
                    FROM monthly
                ) ranked
                WHERE rn <= 2
                GROUP BY junction_name
            )
            SELECT b.junction_name, b.lat, b.lon, b.total, b.peak_hour,
                   b.police_station,
                   COALESCE(o.repeat_count, 0) as repeat_count,
                   COALESCE(g.last_month, 0) as last_month,
                   COALESCE(g.prev_month, 1) as prev_month
            FROM base b
            LEFT JOIN offender_rates o USING (junction_name)
            LEFT JOIN growth g USING (junction_name)
            ORDER BY b.total DESC
            LIMIT 100
        """), params)).fetchall()

    junctions = []
    max_total = max((r[3] for r in rows), default=1)

    for r in rows:
        name, lat, lon, total, peak_hr, station, repeat_ct, last_m, prev_m = r
        density_score = min(total / max_total, 1.0) * 100
        peak_score = min((peak_hr or 0) / 23 * 100, 100)
        repeat_rate = min(repeat_ct / max(total, 1) * 100 * 5, 100)
        prev_safe = max(prev_m, 1)
        growth_rate = min(max((last_m - prev_safe) / prev_safe * 100, 0), 100)

        risk = (
            density_score * 0.40 +
            peak_score * 0.20 +
            repeat_rate * 0.20 +
            growth_rate * 0.20
        )
        risk = round(min(max(risk, 0), 100), 1)

        if risk <= 30:
            category = "Low"
        elif risk <= 60:
            category = "Moderate"
        elif risk <= 80:
            category = "High"
        else:
            category = "Critical"

        junctions.append({
            "junction_name": name,
            "latitude": lat,
            "longitude": lon,
            "total_violations": total,
            "peak_hour": peak_hr,
            "police_station": station,
            "repeat_offender_count": repeat_ct,
            "growth_rate": round(growth_rate, 1),
            "risk_score": risk,
            "risk_category": category,
            "deployment": _deployment_recommendation(risk),
        })

    junctions.sort(key=lambda x: x["risk_score"], reverse=True)
    await cache_set(cache_key, junctions, CACHE_TTL)
    return junctions


def _deployment_recommendation(risk: float) -> dict:
    if risk > 90:
        return {"officers": 3, "tow_vehicles": 1, "priority": "Immediate"}
    elif risk > 80:
        return {"officers": 2, "tow_vehicles": 0, "priority": "High"}
    elif risk > 70:
        return {"officers": 1, "tow_vehicles": 0, "priority": "Medium"}
    else:
        return {"officers": 0, "tow_vehicles": 0, "priority": "Routine"}


# ─── TEMPORAL ANALYTICS ────────────────────────────────────────────────────────

async def get_temporal_analytics(filters: dict = None) -> dict:
    cache_key = f"temporal:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        hourly = (await conn.execute(text(f"""
            SELECT hour_ist, COUNT(*) as cnt
            FROM violations {where} AND hour_ist IS NOT NULL
            GROUP BY hour_ist ORDER BY hour_ist
        """), params)).fetchall()

        daily = (await conn.execute(text(f"""
            SELECT day_of_week, COUNT(*) as cnt
            FROM violations {where} AND day_of_week IS NOT NULL
            GROUP BY day_of_week ORDER BY day_of_week
        """), params)).fetchall()

        monthly = (await conn.execute(text(f"""
            SELECT month_year, COUNT(*) as cnt
            FROM violations {where} AND month_year IS NOT NULL
            GROUP BY month_year ORDER BY month_year
        """), params)).fetchall()

    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

    result = {
        "hourly": [{"hour": r[0], "count": r[1]} for r in hourly],
        "daily": [{"day": days[r[0]], "day_num": r[0], "count": r[1]} for r in daily],
        "monthly": [{"month": r[0], "count": r[1]} for r in monthly],
        "peak_hour": max(hourly, key=lambda x: x[1])[0] if hourly else None,
        "peak_day": days[max(daily, key=lambda x: x[1])[0]] if daily else None,
    }

    await cache_set(cache_key, result, CACHE_TTL)
    return result


# ─── POLICE STATION ANALYTICS ──────────────────────────────────────────────────

async def get_station_analytics(filters: dict = None) -> list:
    cache_key = f"stations:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT police_station,
                   COUNT(*) as total,
                   COUNT(DISTINCT junction_name) as junctions,
                   COUNT(DISTINCT vehicle_number) as unique_vehicles
            FROM violations
            {where} AND police_station IS NOT NULL
            GROUP BY police_station
            ORDER BY total DESC
        """), params)).fetchall()

        monthly = (await conn.execute(text(f"""
            SELECT police_station, month_year, COUNT(*) as cnt
            FROM violations
            {where} AND police_station IS NOT NULL AND month_year IS NOT NULL
            GROUP BY police_station, month_year
            ORDER BY police_station, month_year
        """), params)).fetchall()

    # Build monthly by station
    monthly_map: dict = {}
    for r in monthly:
        monthly_map.setdefault(r[0], []).append({"month": r[1], "count": r[2]})

    max_total = max((r[1] for r in rows), default=1)
    stations = []
    for r in rows:
        station, total, junctions, vehicles = r
        workload = round(total / max_total * 100, 1)
        m_data = monthly_map.get(station, [])
        growth = 0.0
        if len(m_data) >= 2:
            prev_safe = max(m_data[-2]["count"], 1)
            growth = round((m_data[-1]["count"] - prev_safe) / prev_safe * 100, 1)

        stations.append({
            "police_station": station,
            "total_violations": total,
            "junction_count": junctions,
            "unique_vehicles": vehicles,
            "workload_score": workload,
            "monthly_growth_rate": growth,
            "monthly_trend": m_data,
        })

    await cache_set(cache_key, stations, CACHE_TTL)
    return stations


# ─── REPEAT OFFENDERS ──────────────────────────────────────────────────────────

async def get_repeat_offenders(limit: int = 50, filters: dict = None) -> list:
    cache_key = f"offenders:{limit}:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT vehicle_number, vehicle_type,
                   COUNT(*) as violation_count,
                   COUNT(DISTINCT junction_name) as unique_junctions,
                   MIN(created_datetime_ist) as first_seen,
                   MAX(created_datetime_ist) as last_seen
            FROM violations
            {where}
            GROUP BY vehicle_number, vehicle_type
            HAVING COUNT(*) >= 2
            ORDER BY violation_count DESC
            LIMIT :limit
        """), {**params, "limit": limit})).fetchall()

    offenders = []
    for r in rows:
        num, vtype, cnt, junctions, first, last = r
        if cnt >= 15:
            category = "Habitual"
        elif cnt >= 8:
            category = "High"
        elif cnt >= 4:
            category = "Medium"
        else:
            category = "Low"

        offenders.append({
            "vehicle_number": num,
            "vehicle_type": vtype,
            "violation_count": cnt,
            "unique_junctions": junctions,
            "first_seen": str(first),
            "last_seen": str(last),
            "risk_category": category,
        })

    await cache_set(cache_key, offenders, CACHE_TTL)
    return offenders


# ─── HEATMAP DATA ──────────────────────────────────────────────────────────────

async def get_heatmap_data(filters: dict = None, precision: int = 3) -> list:
    cache_key = f"heatmap:{precision}:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT
                ROUND(latitude::numeric, {precision}) as lat,
                ROUND(longitude::numeric, {precision}) as lon,
                COUNT(*) as weight
            FROM violations
            {where}
            GROUP BY ROUND(latitude::numeric, {precision}), ROUND(longitude::numeric, {precision})
            HAVING COUNT(*) >= 2
            ORDER BY weight DESC
            LIMIT 5000
        """), params)).fetchall()

    result = [{"lat": float(r[0]), "lon": float(r[1]), "weight": r[2]} for r in rows]
    await cache_set(cache_key, result, CACHE_TTL)
    return result


# ─── HOTSPOT DETECTION ─────────────────────────────────────────────────────────

async def get_hotspots(filters: dict = None) -> list:
    cache_key = f"hotspots:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT h3_index,
                   AVG(latitude) as lat, AVG(longitude) as lon,
                   COUNT(*) as total,
                   COUNT(DISTINCT police_station) as stations
            FROM violations
            {where} AND h3_index IS NOT NULL
            GROUP BY h3_index
            HAVING COUNT(*) >= 10
            ORDER BY total DESC
            LIMIT 200
        """), params)).fetchall()

    # Monthly breakdown for growth detection
    async with engine.connect() as conn:
        monthly_h3 = (await conn.execute(text(f"""
            SELECT h3_index, month_year, COUNT(*) as cnt
            FROM violations
            {where} AND h3_index IS NOT NULL
            GROUP BY h3_index, month_year
        """), params)).fetchall()

    m_map: dict = {}
    for r in monthly_h3:
        m_map.setdefault(r[0], {})[r[1]] = r[2]

    hotspots = []
    for r in rows:
        h3i, lat, lon, total, stations = r
        months = sorted(m_map.get(h3i, {}).items())
        growth = 0.0
        if len(months) >= 2:
            prev = max(months[-2][1], 1)
            growth = round((months[-1][1] - prev) / prev * 100, 1)

        if growth > 30:
            hs_type = "Emerging"
        elif growth > 10:
            hs_type = "Growing"
        elif total > 200:
            hs_type = "Stable"
        else:
            hs_type = "Moderate"

        hotspots.append({
            "h3_index": h3i,
            "latitude": lat,
            "longitude": lon,
            "total_violations": total,
            "growth_rate": growth,
            "hotspot_type": hs_type,
            "monthly_trend": [{"month": m[0], "count": m[1]} for m in months],
        })

    hotspots.sort(key=lambda x: x["total_violations"], reverse=True)
    await cache_set(cache_key, hotspots, CACHE_TTL)
    return hotspots


# ─── VEHICLE TYPE BREAKDOWN ────────────────────────────────────────────────────

async def get_vehicle_breakdown(filters: dict = None) -> list:
    cache_key = f"vehicles:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT vehicle_type, COUNT(*) as cnt
            FROM violations {where}
            GROUP BY vehicle_type ORDER BY cnt DESC
        """), params)).fetchall()

    result = [{"vehicle_type": r[0], "count": r[1]} for r in rows]
    await cache_set(cache_key, result, CACHE_TTL)
    return result


# ─── VIOLATION TYPE BREAKDOWN ──────────────────────────────────────────────────

async def get_violation_breakdown(filters: dict = None) -> list:
    cache_key = f"violations_type:{json.dumps(filters or {}, sort_keys=True)}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where, params = _build_where(filters)

    # Use jsonb_array_elements for proper JSON array expansion (cast json -> jsonb)
    async with engine.connect() as conn:
        rows = (await conn.execute(text(f"""
            SELECT elem.value #>> '{{}}' as violation_type, COUNT(*) as cnt
            FROM violations v,
                 jsonb_array_elements(v.violation_types::jsonb) elem
            {where.replace('WHERE', 'WHERE v.id IS NOT NULL AND')}
            GROUP BY violation_type
            ORDER BY cnt DESC
            LIMIT 20
        """), params)).fetchall()

    result = [{"violation_type": r[0], "count": r[1]} for r in rows]
    await cache_set(cache_key, result, CACHE_TTL)
    return result


# ─── JUNCTION DETAIL ───────────────────────────────────────────────────────────

async def get_junction_detail(junction_name: str) -> dict:
    cache_key = f"junction_detail:{junction_name}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    async with engine.connect() as conn:
        stats = (await conn.execute(text("""
            SELECT COUNT(*) as total,
                   AVG(latitude) as lat, AVG(longitude) as lon,
                   MODE() WITHIN GROUP (ORDER BY hour_ist) as peak_hour,
                   police_station
            FROM violations
            WHERE junction_name = :jn
            GROUP BY police_station
            ORDER BY total DESC LIMIT 1
        """), {"jn": junction_name})).fetchone()

        monthly = (await conn.execute(text("""
            SELECT month_year, COUNT(*) as cnt
            FROM violations WHERE junction_name = :jn
            AND month_year IS NOT NULL
            GROUP BY month_year ORDER BY month_year
        """), {"jn": junction_name})).fetchall()

        top_violation = (await conn.execute(text("""
            SELECT elem.value #>> '{}' as vt, COUNT(*) as cnt
            FROM violations v,
                 jsonb_array_elements(v.violation_types::jsonb) elem
            WHERE v.junction_name = :jn
            GROUP BY vt ORDER BY cnt DESC LIMIT 1
        """), {"jn": junction_name})).fetchone()

        vehicle_breakdown = (await conn.execute(text("""
            SELECT vehicle_type, COUNT(*) as cnt
            FROM violations WHERE junction_name = :jn
            GROUP BY vehicle_type ORDER BY cnt DESC LIMIT 5
        """), {"jn": junction_name})).fetchall()

    if not stats:
        return {}

    result = {
        "junction_name": junction_name,
        "total_violations": stats[0],
        "latitude": stats[1],
        "longitude": stats[2],
        "peak_hour": stats[3],
        "police_station": stats[4],
        "top_violation": top_violation[0] if top_violation else "Unknown",
        "monthly_trend": [{"month": r[0], "count": r[1]} for r in monthly],
        "vehicle_breakdown": [{"type": r[0], "count": r[1]} for r in vehicle_breakdown],
    }

    await cache_set(cache_key, result, 900)
    return result


# ─── WHAT-IF SIMULATOR ─────────────────────────────────────────────────────────

async def run_whatif_simulation(scenario: dict) -> dict:
    """Simple linear simulation model."""
    junctions = await compute_junction_risk()
    kpis = await get_kpis()
    base_violations = kpis["total_violations"]
    base_high_risk = sum(1 for j in junctions if j["risk_score"] > 70)

    reduction_factors = {
        "increase_officers": 0.12,
        "increase_tow_vehicles": 0.08,
        "reduce_illegal_parking": 0.18,
        "increase_enforcement": 0.22,
        "modify_risk_thresholds": 0.05,
    }

    total_reduction = 0.0
    applied = []
    for action, magnitude in scenario.items():
        if action in reduction_factors:
            r = reduction_factors[action] * (magnitude / 100)
            total_reduction += r
            applied.append({"action": action, "magnitude": magnitude, "reduction": round(r * 100, 1)})

    total_reduction = min(total_reduction, 0.60)
    est_violations = round(base_violations * (1 - total_reduction))
    est_high_risk = round(base_high_risk * (1 - total_reduction * 0.7))

    return {
        "baseline": {
            "total_violations": base_violations,
            "high_risk_junctions": base_high_risk,
        },
        "projected": {
            "total_violations": est_violations,
            "high_risk_junctions": est_high_risk,
            "violation_reduction_pct": round(total_reduction * 100, 1),
        },
        "applied_interventions": applied,
    }


# ─── HELPERS ───────────────────────────────────────────────────────────────────

def _build_where(filters: dict = None) -> tuple[str, dict]:
    if not filters:
        return "WHERE 1=1", {}

    clauses = ["1=1"]
    params = {}

    if filters.get("start_date"):
        clauses.append("created_datetime_ist >= :start_date")
        params["start_date"] = filters["start_date"]
    if filters.get("end_date"):
        clauses.append("created_datetime_ist <= :end_date")
        params["end_date"] = filters["end_date"]
    if filters.get("police_station"):
        clauses.append("police_station = :police_station")
        params["police_station"] = filters["police_station"]
    if filters.get("vehicle_type"):
        clauses.append("vehicle_type = :vehicle_type")
        params["vehicle_type"] = filters["vehicle_type"]
    if filters.get("validation_status"):
        clauses.append("validation_status = :validation_status")
        params["validation_status"] = filters["validation_status"]
    if filters.get("junction_name"):
        clauses.append("junction_name = :junction_name")
        params["junction_name"] = filters["junction_name"]

    return "WHERE " + " AND ".join(clauses), params
