-- GanPro: las 19 tablas del esquema WatermelonDB v3, con los mismos nombres de columna.
-- Timestamps en milisegundos Unix (bigint), igual que en la app.

create extension if not exists pgcrypto;

create or replace function public.ganpro_now_ms() returns bigint
language sql stable as $$ select (extract(epoch from now()) * 1000)::bigint $$;

create table public.potreros (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  hectareas double precision,
  recurso_forrajero text,
  capacidad_ev double precision,
  geo_json text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.lotes (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  ubicacion text,
  descripcion text,
  hectareas double precision,
  costo_alquiler_ha double precision,
  geo_json text,
  densidad_carga double precision,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.animals (
  id text primary key default gen_random_uuid()::text,
  id_caravana text not null,
  rfid text,
  sexo text not null,
  categoria text not null,
  raza text,
  fecha_nacimiento bigint,
  peso_actual double precision,
  estado text not null default 'ACTIVO',
  lote_id text,
  potrero_id text,
  synced_at bigint,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.animals (id_caravana);
create index on public.animals (rfid);
create index on public.animals (lote_id);
create index on public.animals (potrero_id);

create table public.animal_movements (
  id text primary key default gen_random_uuid()::text,
  animal_id text not null,
  potrero_origen_id text,
  potrero_destino_id text,
  lote_origen_id text,
  lote_destino_id text,
  fecha bigint not null,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.animal_movements (animal_id);

create table public.eventos (
  id text primary key default gen_random_uuid()::text,
  animal_id text not null,
  tipo text not null,
  valor double precision,
  notas text,
  timestamp bigint not null,
  lote_destino_id text,
  dte_numero text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.eventos (animal_id);
create index on public.eventos (tipo, timestamp);

create table public.sync_logs (
  id text primary key default gen_random_uuid()::text,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  synced boolean not null default false,
  timestamp bigint not null,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.operations_catalog (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  tipo text not null,
  dias_carencia double precision,
  costo_unitario double precision,
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.operation_logs (
  id text primary key default gen_random_uuid()::text,
  animal_id text,
  lote_id text,
  operation_id text not null,
  fecha_aplicacion bigint not null,
  fecha_fin_carencia bigint,
  dosis double precision,
  responsable text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.operation_logs (animal_id);
create index on public.operation_logs (lote_id);
create index on public.operation_logs (operation_id);

create table public.scheduled_operations (
  id text primary key default gen_random_uuid()::text,
  operation_id text not null,
  lote_id text,
  fecha_programada bigint not null,
  estado text not null default 'PENDIENTE',
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.scheduled_operations (operation_id);
create index on public.scheduled_operations (lote_id);

create table public.protocolos_iatf (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  lote_id text not null,
  fecha_inicio bigint not null,
  estado text not null default 'ACTIVO',
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.protocolos_iatf (lote_id);

create table public.etapas_protocolo (
  id text primary key default gen_random_uuid()::text,
  protocolo_id text not null,
  nombre text not null,
  dias_desde_inicio double precision not null,
  descripcion text,
  completada boolean not null default false,
  fecha_completada bigint,
  notificacion_id text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.etapas_protocolo (protocolo_id);

create table public.condicion_corporal (
  id text primary key default gen_random_uuid()::text,
  lote_id text,
  animal_id text,
  fecha bigint not null,
  score double precision not null,
  evaluador text,
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.condicion_corporal (lote_id);
create index on public.condicion_corporal (animal_id);

create table public.suplementos (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  tipo text not null,
  materia_seca_pct double precision not null,
  proteina_bruta_pct double precision,
  energia_mcal_kg double precision,
  precio_por_tonelada double precision,
  stock_kg double precision,
  proveedor text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.raciones (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  descripcion text,
  activa boolean not null default true,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.potrero_feeding_logs (
  id text primary key default gen_random_uuid()::text,
  potrero_id text not null,
  racion_id text not null,
  cantidad_kg double precision not null,
  fecha bigint not null,
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.potrero_feeding_logs (potrero_id);
create index on public.potrero_feeding_logs (racion_id);

create table public.manga_action_queue (
  id text primary key default gen_random_uuid()::text,
  animal_id text,
  action_type text not null,
  payload text not null,
  status text not null default 'PENDING',
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.movimientos_financieros (
  id text primary key default gen_random_uuid()::text,
  tipo text not null,
  categoria text not null,
  lote_id text,
  animal_id text,
  monto double precision not null,
  fecha bigint not null,
  descripcion text,
  comprobante text,
  dte_numero text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.movimientos_financieros (lote_id);
create index on public.movimientos_financieros (fecha);

create table public.precios_mercado (
  id text primary key default gen_random_uuid()::text,
  fecha bigint not null,
  novillo_kg double precision,
  ternero_kg double precision,
  vaca_kg double precision,
  vaca_descarte_kg double precision,
  fuente text not null default 'MANUAL',
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

create table public.agregados_financieros (
  id text primary key default gen_random_uuid()::text,
  periodo_mes text not null,
  lote_id text,
  costo_sanidad double precision,
  costo_nutricion double precision,
  costo_alquiler double precision,
  kg_ganados double precision,
  costo_x_kg double precision,
  margen_bruto double precision,
  calculado_at bigint not null,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.agregados_financieros (periodo_mes);
