import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type JournalEntry = {
  id?: string;
  cuenta: string | null;
  nombre_cuenta: string | null;
  centro_costo: string | null;
  nit: string | null;
  nombre_tercero: string | null;
  documento: string | null;
  fecha_documento: string | null;
  usuario_registro: string | null;
  usuario_modificacion: string | null;
  fecha_hora_registro: string | null;
  fecha_hora_modificacion: string | null;
  concepto: string | null;
  saldo_anterior: number | null;
  debito: number | null;
  credito: number | null;
  nuevo_saldo: number | null;
  created_at?: string;
};
