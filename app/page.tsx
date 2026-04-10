"use client";

import { useState } from "react";
import EntryForm from "@/components/EntryForm";
import EntryTable from "@/components/EntryTable";

type Tab = "registro" | "consulta";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("registro");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab("consulta");
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("registro")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "registro"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Nuevo Asiento
        </button>
        <button
          onClick={() => setActiveTab("consulta")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "consulta"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Consultar Asientos
        </button>
      </div>

      {activeTab === "registro" && <EntryForm onSaved={handleSaved} />}
      {activeTab === "consulta" && <EntryTable key={refreshKey} />}
    </div>
  );
}
