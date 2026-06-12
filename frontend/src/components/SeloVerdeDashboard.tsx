"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateWithApi, presetCriteria, sampleSuppliers, type CalculationResult, type Supplier } from "@/lib/api";

function localMarcosCalculation(runName: string, suppliers: Supplier[]): CalculationResult {
  const criteria = presetCriteria;
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
      out[criterion.id] = criterion.type === "benefit"
        ? row[criterion.id] / ai[criterion.id]
        : ai[criterion.id] / row[criterion.id];
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

  const scores = suppliers.map((supplier, index) => {
    const s_i = sums[index + 1];
    const k_i_minus = s_i / sAai;
    const k_i_plus = s_i / sAi;
    const f_k_minus = k_i_plus / (k_i_plus + k_i_minus);
    const f_k_plus = k_i_minus / (k_i_plus + k_i_minus);
    const f_k_i = (k_i_plus + k_i_minus) / (
      1 + ((1 - f_k_plus) / f_k_plus) + ((1 - f_k_minus) / f_k_minus)
    );

    return {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      s_i: Number(s_i.toFixed(6)),
      k_i_minus: Number(k_i_minus.toFixed(6)),
      k_i_plus: Number(k_i_plus.toFixed(6)),
      f_k_i: Number(f_k_i.toFixed(6)),
      rank: 0,
    };
  }).sort((a, b) => b.f_k_i - a.f_k_i)
    .map((score, index) => ({ ...score, rank: index + 1 }));

  return {
    run_name: runName,
    aai,
    ai,
    normalized_matrix: normalized,
    weighted_matrix: weighted,
    scores,
  };
}

export function SeloVerdeDashboard() {
  const [runName, setRunName] = useState("Rodada Saladorama");
  const [suppliers, setSuppliers] = useState(sampleSuppliers);
  const [result, setResult] = useState<CalculationResult>(() => localMarcosCalculation("Rodada Saladorama", sampleSuppliers));
  const [loading, setLoading] = useState(false);

  const chartData = useMemo(() => result.scores.map((score) => ({
    fornecedor: score.supplier_name,
    utilidade: score.f_k_i,
  })), [result]);

  const radarData = useMemo(() => presetCriteria.map((criterion) => ({
    criterio: criterion.name,
    ideal: 9,
    melhorFornecedor: suppliers.find((supplier) => supplier.id === result.scores[0]?.supplier_id)?.values[criterion.id] ?? 0,
  })), [result, suppliers]);

  async function recalculate() {
    setLoading(true);
    try {
      const apiResult = await calculateWithApi(runName, presetCriteria, suppliers);
      setResult(apiResult ?? localMarcosCalculation(runName, suppliers));
    } catch {
      setResult(localMarcosCalculation(runName, suppliers));
    } finally {
      setLoading(false);
    }
  }

  function updateValue(supplierId: string, criterionId: string, value: number) {
    setSuppliers((current) => current.map((supplier) => {
      if (supplier.id !== supplierId) return supplier;
      return {
        ...supplier,
        values: {
          ...supplier.values,
          [criterionId]: value,
        }
      };
    }));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-saladorama-700">Selo Verde Saladorama</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Seleção de fornecedores sustentáveis com MARCOS</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              Protótipo em Next.js + Tailwind integrado a um backend FastAPI. O cálculo segue o artigo de Stević et al. (2020),
              combinando critérios econômicos, sociais e ambientais.
            </p>
          </div>
          <div className="flex gap-3">
            <input
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm w-64"
            />
            <button
              onClick={recalculate}
              className="rounded-xl bg-saladorama-700 px-5 py-3 text-sm font-semibold text-white hover:bg-saladorama-900"
            >
              {loading ? "Calculando..." : "Recalcular ranking"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 overflow-auto">
          <h2 className="text-xl font-semibold text-slate-900">Entrada de notas (1 a 9)</h2>
          <p className="mt-1 text-sm text-slate-600">Os critérios já vêm classificados como custo ou benefício.</p>
          <table className="mt-4 min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-3 pr-4">Fornecedor</th>
                {presetCriteria.map((criterion) => (
                  <th key={criterion.id} className="py-3 pr-4 min-w-32">
                    <div>{criterion.name}</div>
                    <div className="text-xs font-normal text-slate-500">{criterion.type === "cost" ? "Custo" : "Benefício"}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-medium">{supplier.name}</td>
                  {presetCriteria.map((criterion) => (
                    <td key={criterion.id} className="py-3 pr-4">
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={supplier.values[criterion.id]}
                        onChange={(e) => updateValue(supplier.id, criterion.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-emerald-50 p-6 shadow-sm ring-1 ring-emerald-100">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Melhor alternativa</p>
            <h2 className="mt-2 text-2xl font-bold text-emerald-950">{result.scores[0]?.supplier_name}</h2>
            <p className="mt-2 text-sm text-emerald-800">Utilidade final f(Ki): {result.scores[0]?.f_k_i}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Ranking</h3>
            <div className="mt-4 space-y-3">
              {result.scores.map((score) => (
                <div key={score.supplier_id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-900">#{score.rank} {score.supplier_name}</div>
                    <div className="text-xs text-slate-500">Ki-: {score.k_i_minus} · Ki+: {score.k_i_plus}</div>
                  </div>
                  <span className="rounded-full bg-saladorama-100 px-3 py-1 text-xs font-semibold text-saladorama-900">
                    f(Ki) {score.f_k_i}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Gráfico de barras</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="fornecedor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="utilidade" fill="#15803d" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Radar vs solução ideal</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 11 }} />
                <Radar name="Ideal" dataKey="ideal" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.35} />
                <Radar name="Melhor fornecedor" dataKey="melhorFornecedor" stroke="#15803d" fill="#22c55e" fillOpacity={0.45} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
