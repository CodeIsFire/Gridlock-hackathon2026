from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime,
    Text, Index, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from core.database import Base
import uuid


class Violation(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location = Column(Text)
    vehicle_number = Column(String, nullable=False, index=True)
    vehicle_type = Column(String, nullable=False)
    violation_types = Column(JSON)          # parsed list from JSON string
    offence_codes = Column(JSON)            # parsed list
    created_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    created_datetime_ist = Column(DateTime(timezone=True))   # IST converted
    modified_datetime = Column(DateTime(timezone=True))
    device_id = Column(String)
    created_by_id = Column(String)
    center_code = Column(Integer)
    police_station = Column(String, index=True)
    data_sent_to_scita = Column(Boolean, default=False)
    junction_name = Column(String, index=True)
    updated_vehicle_number = Column(String)
    updated_vehicle_type = Column(String)
    validation_status = Column(String, index=True)
    validation_timestamp = Column(DateTime(timezone=True))
    h3_index = Column(String, index=True)    # H3 hex at resolution 9
    hour_ist = Column(Integer)               # 0-23 IST
    day_of_week = Column(Integer)            # 0=Mon
    month_year = Column(String)              # "2024-01"

    __table_args__ = (
        Index("ix_violations_lat_lon", "latitude", "longitude"),
        Index("ix_violations_station_date", "police_station", "created_datetime_ist"),
        Index("ix_violations_junction_date", "junction_name", "created_datetime_ist"),
        Index("ix_violations_vehicle_date", "vehicle_number", "created_datetime_ist"),
    )


class JunctionStats(Base):
    """Materialized/pre-computed junction metrics — refreshed by analytics engine."""
    __tablename__ = "junction_stats"

    junction_name = Column(String, primary_key=True)
    latitude = Column(Float)
    longitude = Column(Float)
    total_violations = Column(Integer, default=0)
    top_violation = Column(String)
    peak_hour = Column(Integer)
    risk_score = Column(Float, default=0.0)
    risk_category = Column(String)          # Low / Moderate / High / Critical
    repeat_offender_count = Column(Integer, default=0)
    monthly_growth_rate = Column(Float, default=0.0)
    last_computed = Column(DateTime(timezone=True), server_default=func.now())
    police_station = Column(String)


class StationStats(Base):
    __tablename__ = "station_stats"

    police_station = Column(String, primary_key=True)
    total_violations = Column(Integer, default=0)
    junction_count = Column(Integer, default=0)
    workload_score = Column(Float, default=0.0)
    monthly_growth_rate = Column(Float, default=0.0)
    last_computed = Column(DateTime(timezone=True), server_default=func.now())


class OffenderProfile(Base):
    __tablename__ = "offender_profiles"

    vehicle_number = Column(String, primary_key=True)
    vehicle_type = Column(String)
    violation_count = Column(Integer, default=0)
    unique_junctions = Column(Integer, default=0)
    unique_violation_types = Column(Integer, default=0)
    first_seen = Column(DateTime(timezone=True))
    last_seen = Column(DateTime(timezone=True))
    risk_category = Column(String)          # Low / Medium / High / Habitual
    last_computed = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="analyst")  # admin / analyst / viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
