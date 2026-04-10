"use client";

import { useState } from "react";
import { supabase, JournalEntry } from "@/lib/supabase";

const emptyForm = (): Omit<JournalEntry, "id" | "created_at"> => ({
  cuenta: "",
  nombre_cuenta: "",
  centro_costo: "",
  nit: "",
  nombre_tercero: "",
  documento: "",
  fecha_documento: "",
  usuario_registro: "",
  usuario_modificacion: "",
  fecha_hora_registro: "",
  fecha_hora_modificacion: "",
  concepto: "",
  saldo_anterior: null,
  debito: null,
  credito: null,
  nuevo_saldo: null,
});

type Props = { onSaved: () => void };

export default function EntryForm({ onSaved }: Props) {
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (field: string, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: sbError } = await supabase
      .from("journal_entries")
      .insert([form]);

    setLoading(false);
    if (sbError) {
      setError(sbError.message);
    } else {
      setSuccess(true);
      setForm(emptyForm());
      setTimeout(() => {
        setSuccess(false);
        onSaved();
      }, 1200);
    }
  };

  const numField = (
    label: string,
    field: keyof typeof form,
    required = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="number"
        step="0.01"
        value={form[field] ?? ""}
        onChange={(e) =>
          set(field, e.target.value === "" ? null : parseFloat(e.target.value))
        }
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  const textField = (
    label: string,
    field: keyof typeof form,
    type = "text",
    required = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={(form[field] as string) ?? ""}
        onChange={(e) => set(field, e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-5">
        Registro de Asiento Contable
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          Asiento guardado correctamente.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Cuenta e identificación */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
            Cuenta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {textField("Cuenta", "cuenta", "text", true)}
            {textField("Nombre Cuenta", "nombre_cuenta")}
            {textField("Centro de Costo", "centro_costo")}
          </div>
        </section>

        {/* Tercero */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
            Tercero
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {textField("NIT", "nit")}
            {textField("Nombre Tercero", "nombre_tercero")}
            {textField("Documento", "documento")}
            {textField("Fecha Documento", "fecha_documento", "date")}
          </div>
        </section>

        {/* Concepto */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
            Descripción
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Concepto
            </label>
            <textarea
              value={form.concepto ?? ""}
              onChange={(e) => set("concepto", e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Valores */}
        <section className="mb-5">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
            Valores
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {numField("Saldo Anterior", "saldo_anterior")}
            {numField("Débito", "debito")}
            {numField("Crédito", "credito")}
            {numField("Nuevo Saldo", "nuevo_saldo")}
          </div>
        </section>

        {/* Auditoría */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
            Auditoría
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {textField("Usuario Registro", "usuario_registro")}
            {textField("Usuario Modificación", "usuario_modificacion")}
            {textField(
              "Fecha/Hora Registro o Anulación",
              "fecha_hora_registro",
              "datetime-local"
            )}
            {textField(
              "Fecha/Hora Modificación o Anulación",
              "fecha_hora_modificacion",
              "datetime-local"
            )}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setForm(emptyForm())}
            className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 font-medium"
          >
            {loading ? "Guardando..." : "Guardar Asiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
