from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DecisionRun, Supplier
from app.schemas.decision_run import DecisionRunCreate, DecisionRunResponse
from app.schemas.marcos import Criterion, DecisionRequest, DecisionResponse
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services.exporters import build_ranking_csv, build_ranking_pdf
from app.services.marcos import SALADORAMA_CRITERIA, calculate_marcos

router = APIRouter()


def _serialize_supplier(model: Supplier) -> SupplierResponse:
    return SupplierResponse.model_validate(model)


def _serialize_run(model: DecisionRun) -> DecisionRunResponse:
    return DecisionRunResponse(
        id=model.id,
        run_name=model.run_name,
        created_at=model.created_at,
        result=DecisionResponse.model_validate(model.result),
    )


@router.get("/health")
def healthcheck() -> dict:
    return {"status": "ok", "version": "0.2.0"}


@router.get("/criteria/preset", response_model=list[Criterion])
def get_saladorama_criteria() -> list[Criterion]:
    return SALADORAMA_CRITERIA


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)) -> list[SupplierResponse]:
    suppliers = db.query(Supplier).order_by(Supplier.name.asc()).all()
    return [_serialize_supplier(item) for item in suppliers]


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)) -> SupplierResponse:
    existing = db.query(Supplier).filter(Supplier.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Já existe um fornecedor com esse nome.")

    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return _serialize_supplier(supplier)


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)) -> SupplierResponse:
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")

    duplicate = db.query(Supplier).filter(Supplier.name == payload.name, Supplier.id != supplier_id).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Já existe outro fornecedor com esse nome.")

    for field, value in payload.model_dump().items():
        setattr(supplier, field, value)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return _serialize_supplier(supplier)


@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)) -> dict:
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")

    db.delete(supplier)
    db.commit()
    return {"status": "deleted"}


@router.post("/marcos/calculate", response_model=DecisionResponse)
def run_marcos(payload: DecisionRequest) -> DecisionResponse:
    return calculate_marcos(payload)


@router.post("/decision-runs", response_model=DecisionRunResponse, status_code=201)
def create_decision_run(payload: DecisionRunCreate, db: Session = Depends(get_db)) -> DecisionRunResponse:
    result = calculate_marcos(payload)
    run = DecisionRun(
        run_name=payload.run_name,
        criteria=[criterion.model_dump() for criterion in payload.criteria],
        suppliers=[supplier.model_dump() for supplier in payload.suppliers],
        result=result.model_dump(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _serialize_run(run)


@router.get("/decision-runs", response_model=list[DecisionRunResponse])
def list_decision_runs(limit: int = Query(default=20, le=100), db: Session = Depends(get_db)) -> list[DecisionRunResponse]:
    runs = db.query(DecisionRun).order_by(DecisionRun.created_at.desc()).limit(limit).all()
    return [_serialize_run(item) for item in runs]


@router.get("/decision-runs/{run_id}", response_model=DecisionRunResponse)
def get_decision_run(run_id: int, db: Session = Depends(get_db)) -> DecisionRunResponse:
    run = db.get(DecisionRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Rodada de decisão não encontrada.")
    return _serialize_run(run)


@router.get("/decision-runs/{run_id}/export/csv")
def export_decision_run_csv(run_id: int, db: Session = Depends(get_db)) -> Response:
    run = db.get(DecisionRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Rodada de decisão não encontrada.")

    result = DecisionResponse.model_validate(run.result)
    content = build_ranking_csv(result)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="ranking-{run_id}.csv"'},
    )


@router.get("/decision-runs/{run_id}/export/pdf")
def export_decision_run_pdf(run_id: int, db: Session = Depends(get_db)) -> Response:
    run = db.get(DecisionRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Rodada de decisão não encontrada.")

    result = DecisionResponse.model_validate(run.result)
    content = build_ranking_pdf(run.run_name, result)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ranking-{run_id}.pdf"'},
    )
