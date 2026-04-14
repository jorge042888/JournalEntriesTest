"use client";

import { useState } from "react";
import EntryForm from "@/components/EntryForm";
import EntryTable from "@/components/EntryTable";
import CsvUpload from "@/components/CsvUpload";
import AnalysisDashboard from "@/components/AnalysisDashboard";

type Tab = "registro" | "cargue" | "consulta" | "analisis";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("registro");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab("consulta");
  };

  const handleUploaded = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab("consulta");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "registro", label: "Nuevo Asiento" },
    { id: "cargue", label: "Cargue CSV" },
    { id: "consulta", label: "Consultar Asientos" },
    { id: "analisis", label: "Análisis" },
  ];

  return (
    <div>
      <div className="flex border-b border-brand-dark/20 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-6 py-3 text-sm font-heading font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-brand-dark text-brand-dark"
                : "border-transparent text-gray-500 hover:text-brand-dark/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "registro" && <EntryForm onSaved={handleSaved} />}
      {activeTab === "cargue" && <CsvUpload onUploaded={handleUploaded} />}
      {activeTab === "consulta" && <EntryTable key={refreshKey} />}
      {activeTab === "analisis" && <AnalysisDashboard />}
    </div>
  );
}
