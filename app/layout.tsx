import type { Metadata } from "next";
import { Poppins, Noto_Serif } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif",
});

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
    <html lang="es" className={`${poppins.variable} ${notoSerif.variable}`}>
      <body className="bg-brand-cream/20 min-h-screen font-body">
        <header className="bg-brand-dark text-white shadow-md">
          <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-heading text-lg font-semibold tracking-wide text-white">
                Gonzalo Millán y Asociados S.A.
              </span>
              <span className="text-brand-cream/80 text-sm font-body">
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
