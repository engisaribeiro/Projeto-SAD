# Selo Verde Saladorama

Aplicação Web Full Stack para seleção de fornecedores sustentáveis usando o método **MARCOS (Measurement of Alternatives and Ranking according to COmpromise Solution)**, com foco em compras alimentares que priorizam impacto social, local e ambiental.

## O problema que o projeto resolve

O Saladorama precisa comparar fornecedores com base em múltiplos critérios simultâneos: preço, qualidade, pontualidade, origem comunitária, proximidade da cozinha, ausência de agrotóxicos e pegada de carbono. O método MARCOS transforma essa decisão complexa em um ranking tecnicamente justificável e transparente.

## Base metodológica

O motor do sistema segue o artigo:

- Stević et al. (2020) — *Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS)*
- Arquivo-base: https://www.sciencedirect.com/science/article/pii/S0360835219307004

## Stack técnica

- **Backend:** FastAPI + Pydantic
- **Frontend:** Next.js + Tailwind CSS + Recharts
- **Testes:** Pytest
- **Deploy sugerido:** Vercel (frontend) + Render/Railway (backend)

## Estrutura do repositório

```bash
selo-verde-saladorama/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── schemas/
│   │   └── services/
│   └── tests/
├── frontend/
└── README.md
```

## Backend

### Executar localmente

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Endpoints principais

- `GET /` — metadados da API
- `GET /docs` — Swagger/OpenAPI
- `GET /api/health`
- `GET /api/criteria/preset`
- `POST /api/marcos/calculate`

### Exemplo de payload

```json
{
  "run_name": "Selecao junho",
  "criteria": [
    {"id": "preco", "name": "Preço", "category": "economic", "type": "cost", "weight": 0.4},
    {"id": "qualidade", "name": "Qualidade", "category": "economic", "type": "benefit", "weight": 0.35},
    {"id": "distancia", "name": "Distância", "category": "social", "type": "cost", "weight": 0.25}
  ],
  "suppliers": [
    {"id": "s1", "name": "Cooperativa Esperança", "values": {"preco": 7, "qualidade": 9, "distancia": 3}},
    {"id": "s2", "name": "Horta Local", "values": {"preco": 6, "qualidade": 8, "distancia": 2}}
  ]
}
```

## Frontend

### Executar localmente

```bash
cd frontend
npm install
npm run dev
```

Crie o arquivo `.env.local` com a URL do backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Lógica MARCOS implementada

1. construção da matriz de decisão
2. geração dos pontos AAI e AI
3. normalização por custo/benefício
4. ponderação por pesos
5. cálculo de `S_i`, `K_i-`, `K_i+`
6. função de utilidade final `f(K_i)`
7. ranking decrescente

## Exportação planejada

A interface já está estruturada para exibir ranking, gráfico de barras e radar. Como próxima iteração, recomenda-se adicionar:

- exportação CSV do ranking
- geração de PDF com justificativa técnica
- persistência em PostgreSQL
- autenticação de usuários

## Deploy sugerido

### Backend no Render/Railway

- criar serviço Python
- comando de build: `pip install -r requirements.txt`
- comando de start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend na Vercel

- importar pasta `frontend`
- configurar variável `NEXT_PUBLIC_API_URL`
- publicar

## Testes

```bash
cd backend
pytest -q
```
## Próximos passos recomendados

- persistir fornecedores/rodadas em banco
- permitir edição de pesos via interface
- exportar PDF/CSV
- registrar histórico de decisões
