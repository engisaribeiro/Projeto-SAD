from fastapi import APIRouter

from app.schemas.marcos import Criterion, DecisionRequest, DecisionResponse
from app.services.marcos import SALADORAMA_CRITERIA, calculate_marcos

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict:
    return {"status": "ok"}


@router.get("/criteria/preset", response_model=list[Criterion])
def get_saladorama_criteria() -> list[Criterion]:
    return SALADORAMA_CRITERIA


@router.post("/marcos/calculate", response_model=DecisionResponse)
def run_marcos(payload: DecisionRequest) -> DecisionResponse:
    return calculate_marcos(payload)
