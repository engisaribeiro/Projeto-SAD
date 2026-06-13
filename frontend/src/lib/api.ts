export type Criterion = {
  id: string;
  name: string;
  category: "economic" | "social" | "environmental";
  type: "cost" | "benefit";
  weight: number;
};

export type SupplierEntity = {
  id: number | string;
  name: string;
  notes?: string | null;
  contact?: string | null;
  values: Record<string, number>;
  created_at?: string;
  updated_at?: string;
};

export type CriterionImpact = {
  criterion_id: string;
  criterion_name: string;
  criterion_type: "cost" | "benefit";
  weight: number;
  winner_contribution: number;
  runner_up_contribution: number;
  impact: number;
  explanation: string;
};

export type Score = {
  supplier_id: string;
  supplier_name: string;
  s_i: number;
  k_i_minus: number;
  k_i_plus: number;
  f_k_i: number;
  rank: number;
  criterion_contributions: Record<string, number>;
};

export type DecisionInsights = {
  winner_supplier_id: string;
  winner_supplier_name: string;
  decisive_criteria: CriterionImpact[];
  summary: string;
};

export type CalculationResult = {
  run_name: string;
  aai: Record<string, number>;
  ai: Record<string, number>;
  normalized_matrix: Record<string, number>[];
  weighted_matrix: Record<string, number>[];
  scores: Score[];
  insights: DecisionInsights;
};

export type DecisionRun = {
  id: number;
  run_name: string;
  created_at: string;
  result: CalculationResult;
};

export const presetCriteria: Criterion[] = [
  { id: "preco", name: "Preço", category: "economic", type: "cost", weight: 0.12 },
  { id: "qualidade_visual", name: "Qualidade Visual", category: "economic", type: "benefit", weight: 0.09 },
  { id: "pontualidade", name: "Pontualidade", category: "economic", type: "benefit", weight: 0.08 },
  { id: "variedade_skus", name: "Variedade/SKUs", category: "economic", type: "benefit", weight: 0.07 },
  { id: "prazo_pagamento", name: "Prazo de Pagamento", category: "economic", type: "benefit", weight: 0.07 },
  { id: "origem_comunidade", name: "Origem em Comunidade/Favela", category: "social", type: "benefit", weight: 0.11 },
  { id: "distancia_cozinha", name: "Distância da Cozinha", category: "social", type: "cost", weight: 0.1 },
  { id: "menor_faturamento", name: "Favorecimento a Pequenos Produtores", category: "social", type: "benefit", weight: 0.11 },
  { id: "sem_agrotoxicos", name: "Ausência de Agrotóxicos", category: "environmental", type: "benefit", weight: 0.1 },
  { id: "embalagem_bio", name: "Embalagens Biodegradáveis", category: "environmental", type: "benefit", weight: 0.08 },
  { id: "baixa_pegada", name: "Baixa Pegada de Carbono", category: "environmental", type: "benefit", weight: 0.07 },
];

export const sampleSuppliers: SupplierEntity[] = [
  {
    id: "s1",
    name: "Cooperativa Esperança",
    contact: "compras@esperanca.coop",
    notes: "Fornecedor local com foco em agricultura familiar.",
    values: {
      preco: 7,
      qualidade_visual: 9,
      pontualidade: 8,
      variedade_skus: 6,
      prazo_pagamento: 7,
      origem_comunidade: 9,
      distancia_cozinha: 2,
      menor_faturamento: 4,
      sem_agrotoxicos: 9,
      embalagem_bio: 7,
      baixa_pegada: 9,
    },
  },
  {
    id: "s2",
    name: "Sítio Raiz",
    contact: "contato@sitioraiz.com",
    notes: "Operação estável e boa pontualidade.",
    values: {
      preco: 6,
      qualidade_visual: 8,
      pontualidade: 9,
      variedade_skus: 7,
      prazo_pagamento: 6,
      origem_comunidade: 7,
      distancia_cozinha: 4,
      menor_faturamento: 3,
      sem_agrotoxicos: 8,
      embalagem_bio: 8,
      baixa_pegada: 7,
    },
  },
  {
    id: "s3",
    name: "Horta Bairro Vivo",
    contact: "horta@bairrovivo.org",
    notes: "Melhor aderência ambiental e logística curta.",
    values: {
      preco: 8,
      qualidade_visual: 7,
      pontualidade: 8,
      variedade_skus: 5,
      prazo_pagamento: 8,
      origem_comunidade: 8,
      distancia_cozinha: 1,
      menor_faturamento: 2,
      sem_agrotoxicos: 9,
      embalagem_bio: 9,
      baixa_pegada: 10,
    },
  },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function toDecisionSuppliers(suppliers: SupplierEntity[]) {
  return suppliers.map((supplier) => ({
    id: String(supplier.id),
    name: supplier.name,
    notes: supplier.notes ?? undefined,
    values: supplier.values,
  }));
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error("API não configurada");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha na comunicação com a API");
  }
  return response.json() as Promise<T>;
}

export function hasApiConfig() {
  return Boolean(apiUrl);
}

export function getExportUrl(runId: number, format: "pdf" | "csv") {
  return apiUrl ? `${apiUrl}/api/decision-runs/${runId}/export/${format}` : "";
}

export async function fetchSuppliers(): Promise<SupplierEntity[]> {
  return fetchJson<SupplierEntity[]>("/api/suppliers");
}

export async function createSupplier(payload: Omit<SupplierEntity, "id" | "created_at" | "updated_at">): Promise<SupplierEntity> {
  return fetchJson<SupplierEntity>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSupplier(id: number, payload: Omit<SupplierEntity, "id" | "created_at" | "updated_at">): Promise<SupplierEntity> {
  return fetchJson<SupplierEntity>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  await fetchJson<{ status: string }>(`/api/suppliers/${id}`, { method: "DELETE" });
}

export async function fetchDecisionRuns(): Promise<DecisionRun[]> {
  return fetchJson<DecisionRun[]>("/api/decision-runs");
}

export async function saveDecisionRun(runName: string, suppliers: SupplierEntity[], criteria: Criterion[] = presetCriteria): Promise<DecisionRun> {
  return fetchJson<DecisionRun>("/api/decision-runs", {
    method: "POST",
    body: JSON.stringify({ run_name: runName, criteria, suppliers: toDecisionSuppliers(suppliers) }),
  });
}

export async function calculateWithApi(runName: string, suppliers: SupplierEntity[], criteria: Criterion[] = presetCriteria): Promise<CalculationResult> {
  return fetchJson<CalculationResult>("/api/marcos/calculate", {
    method: "POST",
    body: JSON.stringify({ run_name: runName, criteria, suppliers: toDecisionSuppliers(suppliers) }),
  });
}

export function localMarcosCalculation(runName: string, suppliers: SupplierEntity[], criteria: Criterion[] = presetCriteria): CalculationResult {
  const rows = suppliers.map((supplier) => supplier.values);
  const aai: Record<string, number> = {};
  const ai: Record<string, number> = {};

  for (const criterion of criteria) {
    const values = rows.map((row) => row[criterion.id]);
    if (criterion.type === "benefit") {
      aai[criterion.id] = Math.min(...values);
      ai[criterion.id] = Math.max(...values);
    } else {
      aai[criterion.id] = Math.max(...values);
      ai[criterion.id] = Math.min(...values);
    }
  }

  const extended = [aai, ...rows, ai];
  const normalized = extended.map((row) => {
    const out: Record<string, number> = {};
    for (const criterion of criteria) {
      out[criterion.id] = criterion.type === "benefit" ? row[criterion.id] / ai[criterion.id] : ai[criterion.id] / row[criterion.id];
    }
    return out;
  });

  const weighted = normalized.map((row) => {
    const out: Record<string, number> = {};
    for (const criterion of criteria) {
      out[criterion.id] = row[criterion.id] * criterion.weight;
    }
    return out;
  });

  const sums = weighted.map((row) => Object.values(row).reduce((acc, cur) => acc + cur, 0));
  const sAai = sums[0];
  const sAi = sums[sums.length - 1];

  const scores = suppliers
    .map((supplier, index) => {
      const s_i = sums[index + 1];
      const k_i_minus = s_i / sAai;
      const k_i_plus = s_i / sAi;
      const f_k_minus = k_i_plus / (k_i_plus + k_i_minus);
      const f_k_plus = k_i_minus / (k_i_plus + k_i_minus);
      const f_k_i = (k_i_plus + k_i_minus) / (1 + (1 - f_k_plus) / f_k_plus + (1 - f_k_minus) / f_k_minus);
      const criterion_contributions = Object.fromEntries(
        criteria.map((criterion) => [criterion.id, Number(weighted[index + 1][criterion.id].toFixed(6))])
      );

      return {
        supplier_id: String(supplier.id),
        supplier_name: supplier.name,
        s_i: Number(s_i.toFixed(6)),
        k_i_minus: Number(k_i_minus.toFixed(6)),
        k_i_plus: Number(k_i_plus.toFixed(6)),
        f_k_i: Number(f_k_i.toFixed(6)),
        rank: 0,
        criterion_contributions,
      } satisfies Score;
    })
    .sort((a, b) => b.f_k_i - a.f_k_i)
    .map((score, index) => ({ ...score, rank: index + 1 }));

  const winner = scores[0];
  const runnerUp = scores[1] ?? scores[0];
  const decisive = criteria
    .map((criterion) => {
      const winnerContribution = winner.criterion_contributions[criterion.id] ?? 0;
      const runnerContribution = runnerUp.criterion_contributions[criterion.id] ?? 0;
      return {
        criterion_id: criterion.id,
        criterion_name: criterion.name,
        criterion_type: criterion.type,
        weight: criterion.weight,
        winner_contribution: Number(winnerContribution.toFixed(6)),
        runner_up_contribution: Number(runnerContribution.toFixed(6)),
        impact: Number((winnerContribution - runnerContribution).toFixed(6)),
        explanation:
          criterion.type === "benefit"
            ? `${criterion.name} aumentou a vantagem do vencedor frente ao segundo colocado.`
            : `${criterion.name} reduziu a penalização do vencedor em relação ao cenário de custo.`,
      } satisfies CriterionImpact;
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return {
    run_name: runName,
    aai,
    ai,
    normalized_matrix: normalized,
    weighted_matrix: weighted,
    scores,
    insights: {
      winner_supplier_id: winner.supplier_id,
      winner_supplier_name: winner.supplier_name,
      decisive_criteria: decisive,
      summary: `${winner.supplier_name} liderou o ranking. Critérios mais decisivos: ${decisive.map((item) => item.criterion_name).join(", ")}.`,
    },
  };
}
