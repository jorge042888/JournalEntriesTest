"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, JournalEntry } from "@/lib/supabase";

const fmt = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-CO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

export default function EntryTable() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCuenta, setFilterCuenta] = useState("");
  const [filterNit, setFilterNit] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterCuenta)
      query = query.ilike("cuenta", `%${filterCuenta}%`);
    if (filterNit)
      query = query.ilike("nit", `%${filterNit}%`);
    if (filterFechaDesde)
      query = query.gte("fecha_documento", filterFechaDesde);
    if (filterFechaHasta)
      query = query.lte("fecha_documento", filterFechaHasta);

    const { data, error: sbError } = await query.limit(200);
    setLoading(false);
    if (sbError) {
      setError(sbError.message);
    } else {
      setEntries(data ?? []);
    }
  }, [filterCuenta, filterNit, filterFechaDesde, filterFechaHasta]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-5">
        Consulta de Asientos
      </h2>

      {/* Filtros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Cuenta
          </label>
          <input
            type="text"
            value={filterCuenta}
            onChange={(e) => setFilterCuenta(e.target.value)}
            placeholder="Buscar cuenta..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            NIT
          </label>
          <input
            type="text"
            value={filterNit}
            onChange={(e) => setFilterNit(e.target.value)}
            placeholder="Buscar NIT..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filterFechaDesde}
            onChange={(e) => setFilterFechaDesde(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filterFechaHasta}
            onChange={(e) => setFilterFechaHasta(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <button
          onClick={fetchEntries}
          className="px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800 font-medium"
        >
          Buscar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Cargando...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No se encontraron asientos.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-blue-900 text-white">
                {[
                  "Cuenta",
                  "Nombre Cuenta",
                  "C. Costo",
                  "NIT",
                  "Nombre Tercero",
                  "Documento",
                  "Fecha Doc.",
                  "Concepto",
                  "Saldo Ant.",
                  "Débito",
                  "Crédito",
                  "Nuevo Saldo",
                  "Usuario Reg.",
                  "Usuario Mod.",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {e.cuenta ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.nombre_cuenta ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.centro_costo ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {e.nit ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.nombre_tercero ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.documento ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.fecha_documento ?? "—"}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate">
                    {e.concepto ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {fmt(e.saldo_anterior)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-green-700 font-medium">
                    {fmt(e.debito)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-red-600 font-medium">
                    {fmt(e.credito)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-semibold">
                    {fmt(e.nuevo_saldo)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {e.usuario_registro ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {e.usuario_modificacion ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3 text-right">
            {entries.length} registro{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
