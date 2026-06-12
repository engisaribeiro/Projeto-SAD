export type Criterion = {
  id: string;
  name: string;
  category: "economic" | "social" | "environmental";
  type: "cost" | "benefit";
  weight: number;
};

export type Supplier = {
  id: string;
  name: string;
  values: Record<string, number>;
};

export type Score = {
  supplier_id: string;
  supplier_name: string;
  s_i: number;
  k_i_minus: number;
  k_i_plus: number;
  f_k_i: number;
  rank: number;
};

export type CalculationResult = {
  run_name: string;
  aai: Record<string, number>;
  ai: Record<string, number>;
  normalized_matrix: Record<string, number>[];
  weighted_matrix: Record<string, number>[];
  scores: Score[];
};

export const presetCriteria: Criterion[] = [
  { id: "preco", name: "Preço", category: "economic", type: "cost", weight: 0.12 },
  { id: "qualidade_visual", name: "Qualidade Visual", category: "economic", type: "benefit", weight: 0.09 },
  { id: "pontualidade", name: "Pontualidade", category: "economic", type: "benefit", weight: 0.08 },
  { id: "variedade_skus", name: "Variedade/SKUs", category: "economic", type: "benefit", weight: 0.07 },
  { id: "prazo_pagamento", name: "Prazo de Pagamento", category: "economic", type: "benefit", weight: 0.07 },
  { id: "origem_comunidade", name: "Origem em Comunidade/Favela", category: "social", type: "benefit", weight: 0.11 },
  { id: "distancia_cozinha", name: "Distância da Cozinha", category: "social", type: "cost", weight: 0.10 },
  { id: "menor_faturamento", name: "Favorecimento a Pequenos Produtores/Menor Faturamento", category: "social", type: "cost", weight: 0.11 },
  { id: "sem_agrotoxicos", name: "Ausência de Agrotóxicos", category: "environmental", type: "benefit", weight: 0.10 },
  { id: "embalagem_bio", name: "Embalagens Biodegradáveis", category: "environmental", type: "benefit", weight: 0.08 },
  { id: "baixa_pegada", name: "Entrega via Bicicleta/Baixa Pegada de Carbono", category: "environmental", type: "benefit", weight: 0.07 },
];

export const sampleSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Cooperativa Esperança",
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
      baixa_pegada: 9
    }
  },
  {
    id: "s2",
    name: "Sítio Raiz",
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
      baixa_pegada: 7
    }
  },
  {
    id: "s3",
    name: "Horta Bairro Vivo",
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
      baixa_pegada: 10
    }
  }
];

export async function calculateWithApi(runName: string, criteria: Criterion[], suppliers: Supplier[]): Promise<CalculationResult | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  const response = await fetch(`${apiUrl}/api/marcos/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_name: runName, criteria, suppliers })
  });

  if (!response.ok) {
    throw new Error("Falha ao calcular ranking via API");
  }

  return response.json();
}
