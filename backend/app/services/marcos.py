from __future__ import annotations

from typing import Dict, List

from app.schemas.marcos import (
    Criterion,
    CriterionImpact,
    DecisionInsights,
    DecisionRequest,
    DecisionResponse,
    SupplierScore,
)


SALADORAMA_CRITERIA: List[Criterion] = [
    Criterion(id="preco", name="Preço", category="economic", type="cost", weight=0.12),
    Criterion(id="qualidade_visual", name="Qualidade Visual", category="economic", type="benefit", weight=0.09),
    Criterion(id="pontualidade", name="Pontualidade", category="economic", type="benefit", weight=0.08),
    Criterion(id="variedade_skus", name="Variedade/SKUs", category="economic", type="benefit", weight=0.07),
    Criterion(id="prazo_pagamento", name="Prazo de Pagamento", category="economic", type="benefit", weight=0.07),
    Criterion(id="origem_comunidade", name="Origem em Comunidade/Favela", category="social", type="benefit", weight=0.11),
    Criterion(id="distancia_cozinha", name="Distância da Cozinha", category="social", type="cost", weight=0.10),
    Criterion(id="menor_faturamento", name="Favorecimento a Pequenos Produtores/Menor Faturamento", category="social", type="benefit", weight=0.11),
    Criterion(id="sem_agrotoxicos", name="Ausência de Agrotóxicos", category="environmental", type="benefit", weight=0.10),
    Criterion(id="embalagem_bio", name="Embalagens Biodegradáveis", category="environmental", type="benefit", weight=0.08),
    Criterion(id="baixa_pegada", name="Entrega via Bicicleta/Baixa Pegada de Carbono", category="environmental", type="benefit", weight=0.07),
]


def _build_reference_points(criteria: List[Criterion], suppliers: List[Dict[str, float]]) -> tuple[Dict[str, float], Dict[str, float]]:
    aai: Dict[str, float] = {}
    ai: Dict[str, float] = {}
    for criterion in criteria:
        values = [supplier[criterion.id] for supplier in suppliers]
        if criterion.type == "benefit":
            aai[criterion.id] = min(values)
            ai[criterion.id] = max(values)
        else:
            aai[criterion.id] = max(values)
            ai[criterion.id] = min(values)
    return aai, ai


def _build_decision_insights(criteria: List[Criterion], ordered_scores: List[SupplierScore]) -> DecisionInsights:
    winner = ordered_scores[0]
    runner_up = ordered_scores[1] if len(ordered_scores) > 1 else ordered_scores[0]
    criteria_by_id = {criterion.id: criterion for criterion in criteria}

    decisive_criteria: List[CriterionImpact] = []
    for criterion_id, winner_contribution in winner.criterion_contributions.items():
        criterion = criteria_by_id[criterion_id]
        runner_up_contribution = runner_up.criterion_contributions.get(criterion_id, 0.0)
        impact = round(winner_contribution - runner_up_contribution, 6)
        if criterion.type == "benefit":
            explanation = (
                f"{criterion.name} favoreceu {winner.supplier_name} por entregar maior contribuição ponderada"
                f" do que {runner_up.supplier_name}."
            )
        else:
            explanation = (
                f"{criterion.name} penalizou menos {winner.supplier_name}, melhorando a distância"
                f" em relação ao cenário anti-ideal."
            )
        decisive_criteria.append(
            CriterionImpact(
                criterion_id=criterion.id,
                criterion_name=criterion.name,
                criterion_type=criterion.type,
                weight=criterion.weight,
                winner_contribution=round(winner_contribution, 6),
                runner_up_contribution=round(runner_up_contribution, 6),
                impact=impact,
                explanation=explanation,
            )
        )

    decisive_criteria = sorted(decisive_criteria, key=lambda item: item.impact, reverse=True)[:3]
    names = ", ".join(item.criterion_name for item in decisive_criteria) or "equilíbrio geral dos critérios"
    summary = (
        f"{winner.supplier_name} ficou em 1º lugar. Os critérios mais decisivos para a escolha foram: {names}."
    )
    return DecisionInsights(
        winner_supplier_id=winner.supplier_id,
        winner_supplier_name=winner.supplier_name,
        decisive_criteria=decisive_criteria,
        summary=summary,
    )


def calculate_marcos(payload: DecisionRequest) -> DecisionResponse:
    criteria = payload.criteria
    supplier_rows = [supplier.values for supplier in payload.suppliers]
    aai, ai = _build_reference_points(criteria, supplier_rows)

    extended_rows = [aai] + supplier_rows + [ai]

    normalized_matrix: List[Dict[str, float]] = []
    for row in extended_rows:
        normalized_row: Dict[str, float] = {}
        for criterion in criteria:
            cid = criterion.id
            if criterion.type == "benefit":
                normalized_row[cid] = row[cid] / ai[cid]
            else:
                normalized_row[cid] = ai[cid] / row[cid]
        normalized_matrix.append(normalized_row)

    weighted_matrix: List[Dict[str, float]] = []
    for row in normalized_matrix:
        weighted_row: Dict[str, float] = {}
        for criterion in criteria:
            weighted_row[criterion.id] = row[criterion.id] * criterion.weight
        weighted_matrix.append(weighted_row)

    sums = [sum(row.values()) for row in weighted_matrix]
    s_aai = sums[0]
    s_ai = sums[-1]

    scores: List[SupplierScore] = []
    for idx, supplier in enumerate(payload.suppliers, start=1):
        s_i = sums[idx]
        k_i_minus = s_i / s_aai
        k_i_plus = s_i / s_ai
        f_k_minus = k_i_plus / (k_i_plus + k_i_minus)
        f_k_plus = k_i_minus / (k_i_plus + k_i_minus)
        f_k_i = (k_i_plus + k_i_minus) / (
            1 + ((1 - f_k_plus) / f_k_plus) + ((1 - f_k_minus) / f_k_minus)
        )
        criterion_contributions = {
            criterion.id: round(weighted_matrix[idx][criterion.id], 6) for criterion in criteria
        }
        scores.append(
            SupplierScore(
                supplier_id=supplier.id,
                supplier_name=supplier.name,
                s_i=round(s_i, 6),
                k_i_minus=round(k_i_minus, 6),
                k_i_plus=round(k_i_plus, 6),
                f_k_i=round(f_k_i, 6),
                rank=0,
                criterion_contributions=criterion_contributions,
            )
        )

    ordered_scores = sorted(scores, key=lambda item: item.f_k_i, reverse=True)
    for rank, score in enumerate(ordered_scores, start=1):
        score.rank = rank

    insights = _build_decision_insights(criteria, ordered_scores)
    return DecisionResponse(
        run_name=payload.run_name,
        aai={k: round(v, 6) for k, v in aai.items()},
        ai={k: round(v, 6) for k, v in ai.items()},
        normalized_matrix=[{k: round(v, 6) for k, v in row.items()} for row in normalized_matrix],
        weighted_matrix=[{k: round(v, 6) for k, v in row.items()} for row in weighted_matrix],
        scores=ordered_scores,
        insights=insights,
    )
