-- Tabla principal de asientos contables
-- Gonzalo Millán y Asociados S.A.
-- Ejecutar en el SQL Editor de Supabase

create table if not exists journal_entries (
  id                       uuid primary key default gen_random_uuid(),
  cuenta                   text,
  nombre_cuenta            text,
  centro_costo             text,
  nit                      text,
  nombre_tercero           text,
  documento                text,
  fecha_documento          date,
  usuario_registro         text,
  usuario_modificacion     text,
  fecha_hora_registro      timestamptz,
  fecha_hora_modificacion  timestamptz,
  concepto                 text,
  saldo_anterior           numeric(18, 2),
  debito                   numeric(18, 2),
  credito                  numeric(18, 2),
  nuevo_saldo              numeric(18, 2),
  created_at               timestamptz default now()
);

-- Índices para búsquedas frecuentes
create index if not exists idx_je_cuenta        on journal_entries (cuenta);
create index if not exists idx_je_nit           on journal_entries (nit);
create index if not exists idx_je_fecha_doc     on journal_entries (fecha_documento);
create index if not exists idx_je_created_at    on journal_entries (created_at desc);

-- Row Level Security: habilitar pero permitir acceso anónimo de lectura/escritura
-- (ajustar según necesidades de autenticación)
alter table journal_entries enable row level security;

create policy "allow_all" on journal_entries
  for all
  using (true)
  with check (true);
