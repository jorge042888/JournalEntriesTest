"use client";

import { useState, useRef } from "react";
import { supabase, JournalEntry } from "@/lib/supabase";

type ParsedRow = Omit<JournalEntry, "id" | "created_at">;
type UploadStatus = "idle" | "parsing" | "preview" | "uploading" | "done" | "error";

const HEADERS: (keyof ParsedRow)[] = [
  "cuenta", "nombre_cuenta", "centro_costo", "nit", "nombre_tercero",
  "documento", "fecha_documento", "usuario_registro", "usuario_modificacion",
  "fecha_hora_registro", "fecha_hora_modificacion", "concepto",
  "saldo_anterior", "debito", "credito", "nuevo_saldo",
];

const NUM_FIELDS = new Set(["saldo_anterior", "debito", "credito", "nuevo_saldo"]);

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  const errors: string[] = [];

  if (lines.length < 2) {
    return { rows: [], errors: ["El archivo no tiene datos."] };
  }

  const headerLine = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    if (cells.every((c) => c.trim() === "")) continue;

    const row: Record<string, string | number | null> = {};

    HEADERS.forEach((field) => {
      const colIndex = headerLine.indexOf(field);
      const raw = colIndex >= 0 ? (cells[colIndex] ?? "").trim() : "";

      if (NUM_FIELDS.has(field)) {
        row[field] = raw === "" ? null : parseFloat(raw.replace(/,/g, ""));
      } else {
        row[field] = raw === "" ? null : raw;
      }
    });

    rows.push(row as ParsedRow);
  }

  return { rows, errors };
}

const fmt = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2 }).format(n);

type Props = { onUploaded: () => void };

export default function CsvUpload({ onUploaded }: Props) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseErrors(["Solo se aceptan archivos .csv"]);
      setStatus("error");
      return;
    }
    setStatus("parsing");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows: parsed, errors } = parseCSV(text);
      setParseErrors(errors);
      setRows(parsed);
      setStatus(errors.length ? "error" : "preview");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    setStatus("uploading");
    setUploadError(null);

    const BATCH = 50;
    let count = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("journal_entries").insert(batch);
      if (error) {
        setUploadError(error.message);
        setStatus("error");
        return;
      }
      count += batch.length;
      setUploadedCount(count);
    }

    setStatus("done");
    setTimeout(() => {
      setStatus("idle");
      setRows([]);
      onUploaded();
    }, 1500);
  };

  const reset = () => {
    setStatus("idle");
    setRows([]);
    setParseErrors([]);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-base font-semibold text-brand-dark">
          Cargue Masivo desde CSV
        </h2>
        <a
          href="/muestra_asientos.csv"
          download
          className="text-xs text-brand-dark underline hover:text-brand-dark/70"
        >
          Descargar plantilla de ejemplo
        </a>
      </div>

      {/* Drop zone */}
      {(status === "idle" || status === "error") && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-brand-dark/30 rounded-lg p-10 text-center cursor-pointer hover:border-brand-dark hover:bg-brand-cream/20 transition-colors"
          >
            <p className="text-gray-500 text-sm">
              Arrastra un archivo <span className="font-medium">.csv</span> aquí,
              o haz click para seleccionarlo
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Las columnas deben seguir el orden de la plantilla
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parseErrors.map((err, i) => (
            <p key={i} className="mt-3 text-sm text-red-600">
              {err}
            </p>
          ))}
          {uploadError && (
            <p className="mt-3 text-sm text-red-600">{uploadError}</p>
          )}
        </>
      )}

      {status === "parsing" && (
        <p className="text-sm text-gray-500 py-6 text-center">
          Leyendo archivo...
        </p>
      )}

      {status === "uploading" && (
        <p className="text-sm text-gray-500 py-6 text-center">
          Subiendo registros... ({uploadedCount} / {rows.length})
        </p>
      )}

      {status === "done" && (
        <p className="text-sm text-green-700 py-6 text-center font-medium">
          {uploadedCount} asientos importados correctamente.
        </p>
      )}

      {/* Preview */}
      {status === "preview" && rows.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-3">
            Se encontraron{" "}
            <span className="font-semibold">{rows.length}</span> registros.
            Revisa antes de importar:
          </p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-5">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-brand-dark text-white">
                  {["Cuenta", "Nombre Cuenta", "NIT", "Nombre Tercero", "Fecha Doc.", "Concepto", "Débito", "Crédito", "Nuevo Saldo"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap font-heading font-medium">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-brand-cream/20"}>
                    <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.cuenta ?? "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.nombre_cuenta ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.nit ?? "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.nombre_tercero ?? "—"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.fecha_documento ?? "—"}</td>
                    <td className="px-3 py-1.5 max-w-xs truncate">{r.concepto ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right text-green-700">{fmt(r.debito)}</td>
                    <td className="px-3 py-1.5 text-right text-red-600">{fmt(r.credito)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmt(r.nuevo_saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              className="px-6 py-2 text-sm bg-brand-dark text-white rounded hover:bg-brand-dark/90 font-heading font-medium"
            >
              Importar {rows.length} registros
            </button>
          </div>
        </>
      )}
    </div>
  );
}
