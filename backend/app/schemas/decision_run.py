from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.marcos import DecisionRequest, DecisionResponse


class DecisionRunCreate(DecisionRequest):
    pass


class DecisionRunResponse(BaseModel):
    id: int
    run_name: str
    created_at: datetime
    result: DecisionResponse

    class Config:
        from_attributes = True
