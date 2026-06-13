"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateWithApi,
  createSupplier,
  deleteSupplier,
  fetchDecisionRuns,
  fetchSuppliers,
  getExportUrl,
  hasApiConfig,
  localMarcosCalculation,
  presetCriteria,
  sampleSuppliers,
  saveDecisionRun,
  type CalculationResult,
  type DecisionRun,
  type SupplierEntity,
  updateSupplier,
} from "@/lib/api";

type SupplierFormState = {
  id?: number;
  name: string;
  contact: string;
  notes: string;
  values: Record<string, number>;
};

function buildEmptyValues() {
  return Object.fromEntries(presetCriteria.map((criterion) => [criterion.id, 5])) as Record<string, number>;
}

function buildInitialForm(): SupplierFormState {
  return {
    name: "",
    contact: "",
    notes: "",
    values: buildEmptyValues(),
  };
}

function toFormState(supplier?: SupplierEntity): SupplierFormState {
  if (!supplier) return buildInitialForm();
  return {
    id: typeof supplier.id === "number" ? supplier.id : undefined,
    name: supplier.name,
    contact: supplier.contact ?? "",
    notes: supplier.notes ?? "",
    values: { ...supplier.values },
  };
}

function toDraftPayload(form: SupplierFormState) {
  return {
    name: form.name,
    contact: form.contact,
    notes: form.notes,
    values: form.values,
  };
}

function supplierIdValue(supplier: SupplierEntity) {
  return typeof supplier.id === "number" ? supplier.id : String(supplier.id);
}

export function SeloVerdeDashboard() {
  const [runName, setRunName] = useState("Rodada Estratégica de Fornecedores");
  const [suppliers, setSuppliers] = useState<SupplierEntity[]>(sampleSuppliers);
  const [result, setResult] = useState<CalculationResult>(() => localMarcosCalculation("Rodada Estratégica de Fornecedores", sampleSuppliers));
  const [history, setHistory] = useState<DecisionRun[]>([]);
  const [form, setForm] = useState<SupplierFormState>(buildInitialForm());
  const [loading, setLoading] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [message, setMessage] = useState("Base pronta para cadastrar fornecedores, salvar rodadas e exportar relatórios.");
  const [lastSavedRunId, setLastSavedRunId] = useState<number | null>(null);

  const apiEnabled = hasApiConfig();

  useEffect(() => {
    async function bootstrap() {
      if (!apiEnabled) {
        setMessage("API não configurada. O frontend está operando em modo local com dados de exemplo.");
        return;
      }

      try {
        const [supplierData, historyData] = await Promise.all([fetchSuppliers(), fetchDecisionRuns()]);
        if (supplierData.length >= 2) {
          setSuppliers(supplierData);
          setResult(localMarcosCalculation(runName, supplierData));
        }
        setHistory(historyData);
        if (historyData[0]) {
          setLastSavedRunId(historyData[0].id);
        }
      } catch {
        setMessage("Não foi possível carregar a API agora. O dashboard continuou em modo local.");
      }
    }

    bootstrap();
  }, [apiEnabled, runName]);

  const chartData = useMemo(
    () => result.scores.map((score) => ({ fornecedor: score.supplier_name, utilidade: score.f_k_i })),
    [result]
  );

  const radarData = useMemo(
    () =>
      presetCriteria.map((criterion) => ({
        criterio: criterion.name,
        ideal: 9,
        vencedor: suppliers.find((supplier) => String(supplier.id) === result.insights.winner_supplier_id)?.values[criterion.id] ?? 0,
      })),
    [result, suppliers]
  );

  function resetForm() {
    setForm(buildInitialForm());
  }

  function startEditSupplier(supplier: SupplierEntity) {
    setForm(toFormState(supplier));
  }

  async function handleSupplierSubmit() {
    if (!form.name.trim()) {
      setMessage("Informe o nome do fornecedor.");
      return;
    }

    setSavingSupplier(true);
    try {
      if (apiEnabled && typeof form.id === "number") {
        const updated = await updateSupplier(form.id, toDraftPayload(form));
        setSuppliers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("Fornecedor atualizado com sucesso.");
      } else if (apiEnabled) {
        const created = await createSupplier(toDraftPayload(form));
        setSuppliers((current) => [...current, created]);
        setMessage("Fornecedor cadastrado com sucesso.");
      } else {
        const localSupplier: SupplierEntity = {
          id: form.id ?? `local-${Date.now()}`,
          ...toDraftPayload(form),
        };
        setSuppliers((current) => {
          const exists = typeof form.id !== "undefined";
          return exists ? current.map((item) => (item.id === form.id ? localSupplier : item)) : [...current, localSupplier];
        });
        setMessage("Fornecedor atualizado no modo local.");
      }
      resetForm();
    } catch {
      setMessage("Falha ao salvar fornecedor.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleDeleteSupplier(supplier: SupplierEntity) {
    try {
      if (apiEnabled && typeof supplier.id === "number") {
        await deleteSupplier(supplier.id);
      }
      setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
      setMessage(`Fornecedor ${supplier.name} removido.`);
    } catch {
      setMessage("Falha ao remover fornecedor.");
    }
  }

  async function handleRecalculate() {
    if (suppliers.length < 2) {
      setMessage("Cadastre ao menos dois fornecedores para calcular o ranking.");
      return;
    }

    setLoading(true);
    try {
      const nextResult = apiEnabled ? await calculateWithApi(runName, suppliers) : localMarcosCalculation(runName, suppliers);
      setResult(nextResult);
      setMessage("Ranking recalculado com sucesso.");
    } catch {
      setResult(localMarcosCalculation(runName, suppliers));
      setMessage("A API falhou; o ranking foi recalculado localmente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRun() {
    if (suppliers.length < 2) {
      setMessage("Cadastre ao menos dois fornecedores antes de salvar a rodada.");
      return;
    }

    setLoading(true);
    try {
      if (!apiEnabled) {
        const localResult = localMarcosCalculation(runName, suppliers);
        setResult(localResult);
        setMessage("Sem API configurada, a rodada foi apenas simulada localmente.");
        return;
      }

      const run = await saveDecisionRun(runName, suppliers);
      setResult(run.result);
      setLastSavedRunId(run.id);
      const updatedHistory = await fetchDecisionRuns();
      setHistory(updatedHistory);
      setMessage("Rodada salva no histórico com sucesso.");
    } catch {
      setMessage("Falha ao salvar rodada de decisão.");
    } finally {
      setLoading(false);
    }
  }

  function loadHistoryItem(item: DecisionRun) {
    setRunName(item.run_name);
    setResult(item.result);
    setLastSavedRunId(item.id);
    setMessage(`Histórico carregado: ${item.run_name}.`);
  }

  const winner = result.scores[0];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-lime-700 p-8 text-white shadow-2xl shadow-emerald-950/20">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Selo Verde Saladorama</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight">Sistema de apoio à decisão com MARCOS</h1>
            <p className="mt-4 max-w-3xl text-sm text-emerald-50/90">
              Projeto da Disciplina de Sistemas de Apoio à Decisão CIn/UFPE.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-emerald-100">Fornecedores</div>
              <div className="mt-2 text-3xl font-semibold">{suppliers.length}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-emerald-100">Melhor alternativa</div>
              <div className="mt-2 text-lg font-semibold">{winner?.supplier_name ?? "—"}</div>
              <div className="mt-1 text-sm text-emerald-100">f(Ki) {winner?.f_k_i ?? "—"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Cadastro de fornecedores</h2>
              <p className="mt-1 text-sm text-slate-500">Crie, edite e mantenha a base de fornecedores diretamente pela interface.</p>
            </div>
            <button onClick={resetForm} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
              Novo fornecedor
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Nome</span>
                <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Contato</span>
                <input value={form.contact} onChange={(e) => setForm((current) => ({ ...current, contact: e.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Observações</span>
              <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
            </label>
            <div>
              <div className="mb-3 text-sm font-medium text-slate-700">Notas dos critérios</div>
              <div className="grid gap-3 md:grid-cols-2">
                {presetCriteria.map((criterion) => (
                  <label key={criterion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">{criterion.name}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {criterion.type === "cost" ? "Custo" : "Benefício"}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={9}
                      value={form.values[criterion.id]}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          values: { ...current.values, [criterion.id]: Number(e.target.value) },
                        }))
                      }
                      className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    />
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleSupplierSubmit}
              className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {savingSupplier ? "Salvando fornecedor..." : form.id ? "Atualizar fornecedor" : "Cadastrar fornecedor"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Base cadastrada</h2>
              <p className="mt-1 text-sm text-slate-500">Fornecedores disponíveis para participar das rodadas de decisão.</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">{message}</div>
          </div>

          <div className="mt-6 space-y-3">
            {suppliers.map((supplier) => (
              <div key={String(supplier.id)} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{supplier.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{supplier.contact || "Sem contato informado"}</div>
                    <div className="mt-2 text-sm text-slate-600">{supplier.notes || "Sem observações"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditSupplier(supplier)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Editar</button>
                    <button onClick={() => handleDeleteSupplier(supplier)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Rodada de decisão</h2>
          <p className="mt-1 text-sm text-slate-500">Configure a rodada, calcule o ranking e registre o histórico auditável.</p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <input
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
            <button onClick={handleRecalculate} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              {loading ? "Processando..." : "Recalcular"}
            </button>
            <button onClick={handleSaveRun} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">
              Salvar rodada
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Vencedor</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{winner?.supplier_name ?? "—"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Resumo</div>
              <div className="mt-2 text-sm text-slate-700">{result.insights.summary}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Exportação</div>
              <div className="mt-3 flex gap-2">
                <a
                  href={lastSavedRunId ? getExportUrl(lastSavedRunId, "pdf") : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${lastSavedRunId ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400 pointer-events-none"}`}
                >
                  PDF
                </a>
                <a
                  href={lastSavedRunId ? getExportUrl(lastSavedRunId, "csv") : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${lastSavedRunId ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-400 pointer-events-none"}`}
                >
                  CSV
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {result.scores.map((score) => (
              <div key={score.supplier_id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                <div>
                  <div className="font-semibold text-slate-900">#{score.rank} {score.supplier_name}</div>
                  <div className="mt-1 text-xs text-slate-500">Sᵢ {score.s_i} · Kᵢ- {score.k_i_minus} · Kᵢ+ {score.k_i_plus}</div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">f(Ki) {score.f_k_i}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Critérios cruciais da escolha</h3>
            <div className="mt-4 grid gap-3">
              {result.insights.decisive_criteria.map((item) => (
                <div key={item.criterion_id} className="rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-emerald-950">{item.criterion_name}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">impacto {item.impact}</div>
                  </div>
                  <p className="mt-2 text-sm text-emerald-900">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Histórico de decisões</h3>
            <div className="mt-4 space-y-3">
              {history.length === 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma rodada salva ainda.</div>}
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left hover:bg-slate-50"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{item.run_name}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="text-sm text-emerald-700">{item.result.insights.winner_supplier_name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Utilidade final por fornecedor</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fornecedor" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="utilidade" fill="#15803d" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Vencedor vs solução ideal</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 11 }} />
                <Radar name="Ideal" dataKey="ideal" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.35} />
                <Radar name="Vencedor" dataKey="vencedor" stroke="#15803d" fill="#22c55e" fillOpacity={0.45} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
