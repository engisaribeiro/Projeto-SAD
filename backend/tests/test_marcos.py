from fastapi.testclient import TestClient

from app.main import app
from app.services.marcos import calculate_marcos
from app.schemas.marcos import DecisionRequest

client = TestClient(app)


def sample_payload() -> dict:
    return {
        "run_name": "rodada_teste",
        "criteria": [
            {"id": "preco", "name": "Preço", "category": "economic", "type": "cost", "weight": 0.4},
            {"id": "qualidade", "name": "Qualidade", "category": "economic", "type": "benefit", "weight": 0.35},
            {"id": "distancia", "name": "Distância", "category": "social", "type": "cost", "weight": 0.25},
        ],
        "suppliers": [
            {"id": "s1", "name": "Cooperativa Esperança", "values": {"preco": 7, "qualidade": 9, "distancia": 3}},
            {"id": "s2", "name": "Sítio Raiz", "values": {"preco": 5, "qualidade": 7, "distancia": 6}},
            {"id": "s3", "name": "Horta Local", "values": {"preco": 6, "qualidade": 8, "distancia": 2}},
        ],
    }


def sample_supplier() -> dict:
    return {
        "name": "Fornecedor Teste",
        "notes": "Fornecedor criado em teste automatizado.",
        "contact": "fornecedor@example.com",
        "values": {
            "preco": 7,
            "qualidade_visual": 8,
            "pontualidade": 9,
            "variedade_skus": 6,
            "prazo_pagamento": 7,
            "origem_comunidade": 8,
            "distancia_cozinha": 3,
            "menor_faturamento": 4,
            "sem_agrotoxicos": 9,
            "embalagem_bio": 8,
            "baixa_pegada": 9,
        },
    }


def test_calculate_marcos_returns_ranked_scores():
    payload = DecisionRequest(**sample_payload())
    response = calculate_marcos(payload)

    assert len(response.scores) == 3
    assert response.scores[0].rank == 1
    assert response.scores[0].supplier_name == "Horta Local"
    assert response.ai["preco"] == 5
    assert response.aai["preco"] == 7
    assert response.insights.winner_supplier_name == "Horta Local"
    assert len(response.insights.decisive_criteria) == 3


def test_api_marcos_endpoint_works():
    response = client.post("/api/marcos/calculate", json=sample_payload())
    assert response.status_code == 200

    data = response.json()
    assert data["run_name"] == "rodada_teste"
    assert len(data["scores"]) == 3
    assert data["scores"][0]["rank"] == 1
    assert "insights" in data


def test_api_preset_returns_saladorama_criteria():
    response = client.get("/api/criteria/preset")
    assert response.status_code == 200
    assert len(response.json()) == 11


def test_supplier_crud_and_decision_history_flow():
    created = client.post("/api/suppliers", json=sample_supplier())
    assert created.status_code == 201
    supplier_id = created.json()["id"]

    listed = client.get("/api/suppliers")
    assert listed.status_code == 200
    assert any(item["id"] == supplier_id for item in listed.json())

    run = client.post("/api/decision-runs", json=sample_payload())
    assert run.status_code == 201
    run_id = run.json()["id"]

    history = client.get("/api/decision-runs")
    assert history.status_code == 200
    assert any(item["id"] == run_id for item in history.json())

    csv_export = client.get(f"/api/decision-runs/{run_id}/export/csv")
    assert csv_export.status_code == 200
    assert "text/csv" in csv_export.headers["content-type"]

    pdf_export = client.get(f"/api/decision-runs/{run_id}/export/pdf")
    assert pdf_export.status_code == 200
    assert "application/pdf" in pdf_export.headers["content-type"]

    deleted = client.delete(f"/api/suppliers/{supplier_id}")
    assert deleted.status_code == 200
