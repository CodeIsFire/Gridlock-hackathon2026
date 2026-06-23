"""
Traffic Command Center AI — FastAPI Backend
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn

from core.config import settings
from core.database import engine, Base
from models.models import *  # register all models
from routers.analytics import router as analytics_router
from routers.ai import router as ai_router
from routers.auth import router as auth_router
from services.ingestion import run_ingestion

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Traffic Command Center AI...")

    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-ingest CSV if available
    csv_path = settings.CSV_PATH
    if os.path.exists(csv_path):
        logger.info(f"Found CSV at {csv_path}, running ingestion...")
        try:
            result = await run_ingestion(csv_path)
            logger.info(f"Ingestion result: {result.get('status')}")
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
    else:
        logger.warning(f"CSV not found at {csv_path}. Upload via /api/admin/ingest")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Traffic Command Center AI",
    description="AI-Powered Traffic Intelligence & Decision Support Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(ai_router)


@app.get("/api/health")
async def health():
    return {"status": "operational", "service": "Traffic Command Center AI"}


@app.get("/")
async def root():
    return {"message": "Traffic Command Center AI v1.0", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
