import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Journal Entries — Gonzalo Millan y Asociados S.A.",
  description: "Registro y consulta de asientos contables",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-blue-900 text-white shadow-md">
          <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-wide">
                Gonzalo Millán y Asociados S.A.
              </span>
              <span className="text-blue-200 text-sm">
                Módulo de Asientos Contables
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-screen-xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
