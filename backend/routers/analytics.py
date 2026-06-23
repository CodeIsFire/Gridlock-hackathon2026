from fastapi import APIRouter, Depends, Query
from typing import Optional

from analytics.engine import (
    get_kpis, compute_junction_risk, get_station_analytics,
    get_repeat_offenders, get_temporal_analytics, get_heatmap_data,
    get_hotspots, get_vehicle_breakdown, get_violation_breakdown,
    get_junction_detail, run_whatif_simulation
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def parse_filters(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    police_station: Optional[str] = Query(None),
    vehicle_type: Optional[str] = Query(None),
    validation_status: Optional[str] = Query(None),
    junction_name: Optional[str] = Query(None),
) -> dict:
    f = {}
    if start_date: f["start_date"] = start_date
    if end_date: f["end_date"] = end_date
    if police_station: f["police_station"] = police_station
    if vehicle_type: f["vehicle_type"] = vehicle_type
    if validation_status: f["validation_status"] = validation_status
    if junction_name: f["junction_name"] = junction_name
    return f


@router.get("/kpis")
async def kpis(
    filters: dict = Depends(parse_filters)
):
    return await get_kpis(filters)


@router.get("/junctions/risk")
async def junction_risk(
    filters: dict = Depends(parse_filters)
):
    return await compute_junction_risk(filters)


@router.get("/junctions/{junction_name}/detail")
async def junction_detail(
    junction_name: str
):
    return await get_junction_detail(junction_name)


@router.get("/stations")
async def station_analytics(
    filters: dict = Depends(parse_filters)
):
    return await get_station_analytics(filters)


@router.get("/offenders")
async def repeat_offenders(
    limit: int = Query(50, le=200),
    filters: dict = Depends(parse_filters)
):
    return await get_repeat_offenders(limit, filters)


@router.get("/temporal")
async def temporal_analytics(
    filters: dict = Depends(parse_filters)
):
    return await get_temporal_analytics(filters)


@router.get("/heatmap")
async def heatmap(
    precision: int = Query(3, ge=2, le=4),
    filters: dict = Depends(parse_filters)
):
    return await get_heatmap_data(filters, precision)


@router.get("/hotspots")
async def hotspots(
    filters: dict = Depends(parse_filters)
):
    return await get_hotspots(filters)


@router.get("/vehicles")
async def vehicles(
    filters: dict = Depends(parse_filters)
):
    return await get_vehicle_breakdown(filters)


@router.get("/violations/types")
async def violation_types(
    filters: dict = Depends(parse_filters)
):
    return await get_violation_breakdown(filters)


@router.post("/whatif")
async def whatif(
    scenario: dict
):
    return await run_whatif_simulation(scenario)
