"use client";

import { useState } from "react";
import { supabase, JournalEntry } from "@/lib/supabase";
import { isSundayOrHoliday, getDayLabel } from "@/lib/colombianHolidays";

// ─── Types ───────────────────────────────────────────────────────────────────

type EDA = {
  total: number;
  fechaMinDoc: string | null;
  fechaMaxDoc: string | null;
  fechaMinContab: string | null;
  fechaMaxContab: string | null;
  totalDebito: number;
  totalCredito: number;
  balance: number;
  cuentasUnicas: number;
  nitsUnicos: number;
  usuariosUnicos: number;
};

type TestResult = {
  id: string;
  label: string;
  description: string;
  records: JournalEntry[];
  isPositive?: boolean; // 1C muestra registros "buenos"
  observacion: (e: JournalEntry) => string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDatePart(ts: string | null | undefined): string {
  if (!ts) return "";
  return ts.slice(0, 10);
}

const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtCell = (n: number | null) => (n == null ? "—" : fmtNum(n));

async function fetchAllEntries(
  onProgress: (n: number) => void
): Promise<JournalEntry[]> {
  const all: JournalEntry[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    onProgress(all.length);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function downloadCSV(filename: string, rows: JournalEntry[], extraCol?: { header: string; fn: (e: JournalEntry) => string }) {
  const cols: (keyof JournalEntry)[] = [
    "cuenta", "nombre_cuenta", "centro_costo", "nit", "nombre_tercero",
    "documento", "fecha_documento", "fecha_hora_registro",
    "concepto", "saldo_anterior", "debito", "credito", "nuevo_saldo",
    "usuario_registro", "usuario_modificacion",
  ];
  const headers = [...cols, ...(extraCol ? [extraCol.header] : [])];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csvRows = rows.map((e) => [
    ...cols.map((c) => escape(e[c])),
    ...(extraCol ? [escape(extraCol.fn(e))] : []),
  ].join(","));
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Analysis computation ────────────────────────────────────────────────────

function computeAnalysis(
  entries: JournalEntry[],
  periodoInicio: string,
  fechaCierre: string
): { eda: EDA; tests: TestResult[] } {
  // EDA
  const fechasDocs = entries.map((e) => e.fecha_documento).filter(Boolean) as string[];
  const fechasContab = entries.map((e) => getDatePart(e.fecha_hora_registro)).filter(Boolean);
  fechasDocs.sort();
  fechasContab.sort();

  const eda: EDA = {
    total: entries.length,
    fechaMinDoc: fechasDocs[0] ?? null,
    fechaMaxDoc: fechasDocs.at(-1) ?? null,
    fechaMinContab: fechasContab[0] ?? null,
    fechaMaxContab: fechasContab.at(-1) ?? null,
    totalDebito: entries.reduce((s, e) => s + (e.debito ?? 0), 0),
    totalCredito: entries.reduce((s, e) => s + (e.credito ?? 0), 0),
    balance: entries.reduce((s, e) => s + (e.debito ?? 0) - (e.credito ?? 0), 0),
    cuentasUnicas: new Set(entries.map((e) => e.cuenta).filter(Boolean)).size,
    nitsUnicos: new Set(entries.map((e) => e.nit).filter(Boolean)).size,
    usuariosUnicos: new Set(entries.map((e) => e.usuario_registro).filter(Boolean)).size,
  };

  // 10 días antes del cierre
  let diezAntesStr = "";
  if (fechaCierre) {
    const d = new Date(fechaCierre + "T12:00:00");
    d.setDate(d.getDate() - 10);
    diezAntesStr = d.toISOString().slice(0, 10);
  }

  const tests: TestResult[] = [
    {
      id: "1A",
      label: "Campos Numéricos Vacíos",
      description: "Registros con saldo_anterior, débito, crédito o nuevo_saldo en blanco (null)",
      records: entries.filter(
        (e) =>
          e.saldo_anterior === null ||
          e.debito === null ||
          e.credito === null ||
          e.nuevo_saldo === null
      ),
      observacion: (e) => {
        const nulls = (["saldo_anterior", "debito", "credito", "nuevo_saldo"] as const)
          .filter((f) => e[f] === null)
          .join(", ");
        return `Nulos: ${nulls}`;
      },
    },
    {
      id: "1B",
      label: "Fecha Documento Nula o Inválida",
      description: "Registros con Fecha de Documento nula, vacía o igual a cero",
      records: entries.filter((e) => !e.fecha_documento),
      observacion: () => "Fecha documento ausente",
    },
    {
      id: "1C",
      label: "Registros en Período Válido",
      description: `Registros con Fecha de Contabilización dentro del período ${periodoInicio || "?"} – ${fechaCierre || "?"}`,
      isPositive: true,
      records:
        periodoInicio && fechaCierre
          ? entries.filter((e) => {
              const d = getDatePart(e.fecha_hora_registro);
              return d >= periodoInicio && d <= fechaCierre;
            })
          : entries,
      observacion: (e) => `Contabilización: ${getDatePart(e.fecha_hora_registro)}`,
    },
    {
      id: "1D",
      label: "Asientos con Valor = 0",
      description: "Asientos donde débito y crédito son ambos cero (o null)",
      records: entries.filter(
        (e) => (e.debito ?? 0) === 0 && (e.credito ?? 0) === 0
      ),
      observacion: () => "Débito = 0 y Crédito = 0",
    },
    {
      id: "1E",
      label: "Saldos Negativos",
      description: "Registros con saldo_anterior o nuevo_saldo negativos",
      records: entries.filter(
        (e) =>
          (e.saldo_anterior !== null && e.saldo_anterior < 0) ||
          (e.nuevo_saldo !== null && e.nuevo_saldo < 0)
      ),
      observacion: (e) => {
        const neg: string[] = [];
        if ((e.saldo_anterior ?? 0) < 0) neg.push(`saldo_ant: ${fmtNum(e.saldo_anterior!)}`);
        if ((e.nuevo_saldo ?? 0) < 0) neg.push(`nuevo_saldo: ${fmtNum(e.nuevo_saldo!)}`);
        return neg.join("; ");
      },
    },
    {
      id: "1F",
      label: "Usuario o Tercero en Blanco",
      description: "Registros sin usuario_registro o sin nombre_tercero",
      records: entries.filter((e) => !e.usuario_registro || !e.nombre_tercero),
      observacion: (e) => {
        const blanks: string[] = [];
        if (!e.usuario_registro) blanks.push("usuario_registro");
        if (!e.nombre_tercero) blanks.push("nombre_tercero");
        return `En blanco: ${blanks.join(", ")}`;
      },
    },
    {
      id: "3C-1",
      label: "10 Días Antes del Cierre",
      description: `Registros contabilizados entre ${diezAntesStr || "?"} y ${fechaCierre || "?"} (exclusive)`,
      records: fechaCierre
        ? entries.filter((e) => {
            const d = getDatePart(e.fecha_hora_registro);
            return d >= diezAntesStr && d < fechaCierre;
          })
        : [],
      observacion: (e) => `Contabilización: ${getDatePart(e.fecha_hora_registro)}`,
    },
    {
      id: "3D",
      label: "Registros en Fecha de Cierre",
      description: `Registros contabilizados exactamente el día de cierre (${fechaCierre || "?"})`,
      records: fechaCierre
        ? entries.filter((e) => getDatePart(e.fecha_hora_registro) === fechaCierre)
        : [],
      observacion: (e) => `Contabilización: ${getDatePart(e.fecha_hora_registro)}`,
    },
    {
      id: "3E-1",
      label: "Múltiplos de $1.000.000",
      description: "Transacciones cuyo débito o crédito es múltiplo exacto de 1,000,000",
      records: entries.filter((e) => {
        const d = e.debito ?? 0;
        const c = e.credito ?? 0;
        return (d > 0 && d % 1_000_000 === 0) || (c > 0 && c % 1_000_000 === 0);
      }),
      observacion: (e) => {
        const parts: string[] = [];
        if ((e.debito ?? 0) > 0 && e.debito! % 1_000_000 === 0)
          parts.push(`Deb: ${fmtNum(e.debito!)}`);
        if ((e.credito ?? 0) > 0 && e.credito! % 1_000_000 === 0)
          parts.push(`Cred: ${fmtNum(e.credito!)}`);
        return parts.join("; ");
      },
    },
    {
      id: "3E-2",
      label: "Transacciones a $1",
      description: "Débito o crédito igual exactamente a $1 (un peso colombiano)",
      records: entries.filter((e) => e.debito === 1 || e.credito === 1),
      observacion: (e) => {
        const parts: string[] = [];
        if (e.debito === 1) parts.push("Débito = $1");
        if (e.credito === 1) parts.push("Crédito = $1");
        return parts.join("; ");
      },
    },
    {
      id: "3F",
      label: "Domingos y Festivos",
      description: "Registros contabilizados en domingo o festivo colombiano (Ley 51/1983)",
      records: entries.filter((e) => {
        const d = getDatePart(e.fecha_hora_registro);
        return d ? isSundayOrHoliday(d) : false;
      }),
      observacion: (e) => getDayLabel(getDatePart(e.fecha_hora_registro)),
    },
  ];

  return { eda, tests };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-sm font-semibold text-brand-dark leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function badgeColor(test: TestResult): string {
  if (test.isPositive) return "bg-blue-100 text-blue-800";
  if (test.records.length === 0) return "bg-green-100 text-green-800";
  if (test.records.length < 10) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function cardBorder(test: TestResult): string {
  if (test.isPositive) return "border-blue-300";
  if (test.records.length === 0) return "border-green-300";
  if (test.records.length < 10) return "border-amber-300";
  return "border-red-300";
}

function TestCard({
  test,
  active,
  onClick,
}: {
  test: TestResult;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg border-2 ${cardBorder(test)} p-4 flex flex-col gap-2 ${
        active ? "ring-2 ring-offset-1 ring-brand-dark" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono font-bold text-gray-500">[{test.id}]</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor(test)}`}>
          {test.records.length.toLocaleString("es-CO")}
        </span>
      </div>
      <p className="font-heading font-semibold text-sm text-brand-dark leading-snug">
        {test.label}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed flex-1">{test.description}</p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onClick}
          className="flex-1 text-xs px-3 py-1.5 rounded border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors font-medium"
        >
          {active ? "Ocultar" : "Ver detalle"}
        </button>
        {test.records.length > 0 && (
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              downloadCSV(
                `prueba_${test.id}_${new Date().toISOString().slice(0, 10)}.csv`,
                test.records,
                { header: "Observacion", fn: test.observacion }
              );
            }}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            CSV
          </button>
        )}
      </div>
    </div>
  );
}

function DetailTable({ test }: { test: TestResult }) {
  const cols = [
    { key: "cuenta", label: "Cuenta" },
    { key: "nombre_cuenta", label: "Nombre Cuenta" },
    { key: "nit", label: "NIT" },
    { key: "nombre_tercero", label: "Nombre Tercero" },
    { key: "documento", label: "Documento" },
    { key: "fecha_documento", label: "Fecha Doc." },
    { key: "fecha_hora_registro", label: "Fecha Contab." },
    { key: "concepto", label: "Concepto" },
    { key: "debito", label: "Débito", num: true },
    { key: "credito", label: "Crédito", num: true },
    { key: "nuevo_saldo", label: "Nuevo Saldo", num: true },
    { key: "usuario_registro", label: "Usuario" },
  ] as const;

  if (test.records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        {test.isPositive
          ? "No hay registros en el período seleccionado."
          : "Sin hallazgos — ningún registro cumple esta condición."}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {test.records.length.toLocaleString("es-CO")} registro
          {test.records.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() =>
            downloadCSV(
              `prueba_${test.id}_${new Date().toISOString().slice(0, 10)}.csv`,
              test.records,
              { header: "Observacion", fn: test.observacion }
            )
          }
          className="text-xs px-3 py-1.5 rounded border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors font-medium"
        >
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-80">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-brand-dark text-white">
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2 text-left whitespace-nowrap font-heading font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 text-left whitespace-nowrap font-heading font-medium">
                Observación
              </th>
            </tr>
          </thead>
          <tbody>
            {test.records.map((e, i) => (
              <tr key={e.id ?? i} className={i % 2 === 0 ? "bg-white" : "bg-brand-cream/20"}>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 whitespace-nowrap ${"num" in c && c.num ? "text-right font-mono" : ""}`}
                  >
                    {"num" in c && c.num
                      ? fmtCell(e[c.key] as number | null)
                      : (e[c.key] as string | null)?.slice(0, 40) ?? "—"}
                  </td>
                ))}
                <td className="px-3 py-1.5 whitespace-nowrap text-gray-500 italic">
                  {test.observacion(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalysisDashboard() {
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [eda, setEda] = useState<EDA | null>(null);
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setEda(null);
    setTests(null);
    setActiveTest(null);
    setFetchedCount(0);
    try {
      const entries = await fetchAllEntries(setFetchedCount);
      const result = computeAnalysis(entries, periodoInicio, fechaCierre);
      setEda(result.eda);
      setTests(result.tests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const exportSummary = () => {
    if (!tests) return;
    const rows = tests.map((t) =>
      [
        t.id,
        `"${t.label}"`,
        `"${t.description}"`,
        t.records.length,
        t.isPositive ? "Positivo" : t.records.length === 0 ? "OK" : "Hallazgo",
      ].join(",")
    );
    const csv = ["Prueba,Nombre,Descripcion,Registros,Estado", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumen_analisis_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTestObj = tests?.find((t) => t.id === activeTest) ?? null;

  return (
    <div className="space-y-6">
      {/* Config panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-heading text-base font-semibold text-brand-dark mb-4">
          Parámetros del Análisis
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Período Inicio <span className="text-gray-400">(para Prueba 1C)</span>
            </label>
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fecha de Cierre <span className="text-gray-400">(para 1C, 3C-1, 3D)</span>
            </label>
            <input
              type="date"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
            />
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-6 py-2 text-sm bg-brand-dark text-white rounded hover:bg-brand-dark/90 font-heading font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? `Cargando... (${fetchedCount.toLocaleString("es-CO")})` : "Ejecutar Análisis"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          El análisis aplica sobre <strong>todos</strong> los asientos cargados en la base de datos. Las fechas solo son requeridas para las pruebas que las necesitan.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* EDA */}
      {eda && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">
                Detalle Journal
              </span>
              <h3 className="font-heading text-base font-semibold text-brand-dark">
                Análisis Exploratorio de Datos
              </h3>
            </div>
            {tests && (
              <button
                onClick={exportSummary}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Exportar Resumen
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="Total Registros" value={eda.total.toLocaleString("es-CO")} />
            <KpiCard
              label="Período Documentos"
              value={eda.fechaMinDoc ?? "—"}
              sub={eda.fechaMaxDoc ? `hasta ${eda.fechaMaxDoc}` : undefined}
            />
            <KpiCard
              label="Período Contabilización"
              value={eda.fechaMinContab ?? "—"}
              sub={eda.fechaMaxContab ? `hasta ${eda.fechaMaxContab}` : undefined}
            />
            <KpiCard label="Total Débito" value={`$ ${fmtNum(eda.totalDebito)}`} />
            <KpiCard label="Total Crédito" value={`$ ${fmtNum(eda.totalCredito)}`} />
            <KpiCard
              label="Balance (Deb – Cred)"
              value={`$ ${fmtNum(eda.balance)}`}
              sub={Math.abs(eda.balance) < 0.01 ? "Balanceado" : "Diferencia detectada"}
            />
            <KpiCard label="Cuentas Únicas" value={eda.cuentasUnicas.toLocaleString("es-CO")} />
            <KpiCard label="NITs Únicos" value={eda.nitsUnicos.toLocaleString("es-CO")} />
            <KpiCard label="Usuarios Únicos" value={eda.usuariosUnicos.toLocaleString("es-CO")} />
          </div>
        </div>
      )}

      {/* Tests grid */}
      {tests && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-heading text-base font-semibold text-brand-dark mb-4">
            Pruebas de Auditoría
          </h3>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-300 inline-block" />
              Sin hallazgos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-300 inline-block" />
              1–9 registros
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-300 inline-block" />
              10+ registros
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-300 inline-block" />
              Registros válidos (positivo)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                active={activeTest === t.id}
                onClick={() => setActiveTest(activeTest === t.id ? null : t.id)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {activeTestObj && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-xs font-mono text-gray-400">[{activeTestObj.id}]</span>
                <h4 className="font-heading font-semibold text-sm text-brand-dark">
                  {activeTestObj.label}
                </h4>
              </div>
              <DetailTable test={activeTestObj} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
