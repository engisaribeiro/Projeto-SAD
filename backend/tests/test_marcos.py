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


def test_calculate_marcos_returns_ranked_scores():
    payload = DecisionRequest(**sample_payload())
    response = calculate_marcos(payload)

    assert len(response.scores) == 3
    assert response.scores[0].rank == 1
    assert response.scores[0].supplier_name == "Horta Local"
    assert response.ai["preco"] == 5
    assert response.aai["preco"] == 7


def test_api_marcos_endpoint_works():
    response = client.post("/api/marcos/calculate", json=sample_payload())
    assert response.status_code == 200

    data = response.json()
    assert data["run_name"] == "rodada_teste"
    assert len(data["scores"]) == 3
    assert data["scores"][0]["rank"] == 1


def test_api_preset_returns_saladorama_criteria():
    response = client.get("/api/criteria/preset")
    assert response.status_code == 200
    assert len(response.json()) == 11
