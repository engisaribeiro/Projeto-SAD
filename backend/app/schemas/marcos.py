from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

CriterionType = Literal["cost", "benefit"]
CriterionCategory = Literal["economic", "social", "environmental"]


class Criterion(BaseModel):
    id: str
    name: str
    category: CriterionCategory
    type: CriterionType
    weight: float = Field(gt=0)
    description: Optional[str] = None


class SupplierInput(BaseModel):
    id: str
    name: str
    values: Dict[str, float]
    notes: Optional[str] = None


class DecisionRequest(BaseModel):
    run_name: str
    criteria: List[Criterion]
    suppliers: List[SupplierInput]

    @field_validator("criteria")
    @classmethod
    def validate_criteria_not_empty(cls, value: List[Criterion]) -> List[Criterion]:
        if not value:
            raise ValueError("É necessário informar ao menos um critério.")
        return value

    @field_validator("suppliers")
    @classmethod
    def validate_suppliers_not_empty(cls, value: List[SupplierInput]) -> List[SupplierInput]:
        if len(value) < 2:
            raise ValueError("Informe pelo menos dois fornecedores para gerar ranking.")
        return value

    @model_validator(mode="after")
    def validate_weights_and_supplier_values(self) -> "DecisionRequest":
        total_weight = sum(c.weight for c in self.criteria)
        if abs(total_weight - 1.0) > 1e-6:
            raise ValueError("A soma dos pesos deve ser igual a 1.0.")

        criterion_ids = {c.id for c in self.criteria}
        for supplier in self.suppliers:
            missing = criterion_ids - supplier.values.keys()
            extra = supplier.values.keys() - criterion_ids
            if missing:
                raise ValueError(
                    f"Fornecedor {supplier.name} está sem valores para: {', '.join(sorted(missing))}"
                )
            if extra:
                raise ValueError(
                    f"Fornecedor {supplier.name} possui critérios inválidos: {', '.join(sorted(extra))}"
                )
        return self


class CriterionImpact(BaseModel):
    criterion_id: str
    criterion_name: str
    criterion_type: CriterionType
    weight: float
    winner_contribution: float
    runner_up_contribution: float
    impact: float
    explanation: str


class SupplierScore(BaseModel):
    supplier_id: str
    supplier_name: str
    s_i: float
    k_i_minus: float
    k_i_plus: float
    f_k_i: float
    rank: int
    criterion_contributions: Dict[str, float] = Field(default_factory=dict)


class DecisionInsights(BaseModel):
    winner_supplier_id: str
    winner_supplier_name: str
    decisive_criteria: List[CriterionImpact] = Field(default_factory=list)
    summary: str


class DecisionResponse(BaseModel):
    run_name: str
    aai: Dict[str, float]
    ai: Dict[str, float]
    normalized_matrix: List[Dict[str, float]]
    weighted_matrix: List[Dict[str, float]]
    scores: List[SupplierScore]
    insights: DecisionInsights
