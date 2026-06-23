from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from services.gemini import (
    chat_with_copilot, generate_situation_report,
    generate_insights_feed, generate_whatif_narrative
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str   # "user" | "model"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("/chat")
async def copilot_chat(
    request: ChatRequest
):
    msgs = [{"role": m.role, "content": m.content} for m in request.messages]
    response = await chat_with_copilot(msgs)
    return {"response": response}


@router.get("/report/{report_type}")
async def situation_report(
    report_type: str
):
    if report_type not in ["daily", "weekly", "monthly", "executive"]:
        return {"error": "Invalid report type"}
    return await generate_situation_report(report_type)


@router.get("/insights")
async def insights_feed():
    return await generate_insights_feed()


@router.post("/whatif/narrative")
async def whatif_narrative(
    simulation_result: dict
):
    narrative = await generate_whatif_narrative(simulation_result)
    return {"narrative": narrative}
