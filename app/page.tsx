"use client";

import { useState } from "react";
import EntryForm from "@/components/EntryForm";
import EntryTable from "@/components/EntryTable";
import CsvUpload from "@/components/CsvUpload";

type Tab = "registro" | "cargue" | "consulta";

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
  ];

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "registro" && <EntryForm onSaved={handleSaved} />}
      {activeTab === "cargue" && <CsvUpload onUploaded={handleUploaded} />}
      {activeTab === "consulta" && <EntryTable key={refreshKey} />}
    </div>
  );
}
