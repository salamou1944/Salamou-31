import json
import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Lead Qualification API", version="0.1.0")

OPENAI_API_URL = "https://api.openai.com/v1/responses"
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class Lead(BaseModel):
    name: str | None = None
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    message: str = Field(min_length=1)
    source: str | None = None


class Qualification(BaseModel):
    score: int = Field(ge=0, le=100)
    priority: str
    intent: str
    summary: str
    reasons: list[str]
    next_action: str


class QualificationResponse(BaseModel):
    lead: Lead
    qualification: Qualification


def require_api_key(x_api_key: str | None) -> None:
    if SERVICE_API_KEY and x_api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "lead-qualification-api"}


@app.post("/v1/leads/qualify", response_model=QualificationResponse)
async def qualify_lead(lead: Lead, x_api_key: str | None = Header(default=None)) -> Any:
    require_api_key(x_api_key)

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")

    system = (
        "You qualify inbound business leads. Return ONLY valid JSON with exactly these keys: "
        "score (integer 0-100), priority (low|medium|high), intent (string), summary (string), "
        "reasons (array of short strings), next_action (string). "
        "Do not invent facts. Base the score only on the supplied lead."
    )
    user = json.dumps(lead.model_dump(exclude_none=True), ensure_ascii=False)

    payload = {
        "model": MODEL,
        "input": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(OPENAI_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:1000]
        raise HTTPException(status_code=502, detail=f"Model provider error: {detail}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Model provider unavailable") from exc

    output_text = data.get("output_text")
    if not output_text:
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    output_text = content.get("text")
                    break
            if output_text:
                break

    if not output_text:
        raise HTTPException(status_code=502, detail="Model returned no text output")

    try:
        qualification = Qualification.model_validate(json.loads(output_text))
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Model returned invalid qualification JSON") from exc

    return {"lead": lead, "qualification": qualification}
