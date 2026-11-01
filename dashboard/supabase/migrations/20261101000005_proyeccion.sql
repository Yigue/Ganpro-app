-- Módulo Proyección: escenarios guardados para comparar entre sí y con el resultado real.

create table public.escenarios (
  id text primary key default gen_random_uuid()::text,
  tipo text not null check (tipo in ('negocio', 'peso', 'plan', 'cria')),
  nombre text not null,
  fecha bigint not null default public.ganpro_now_ms(),
  lote_id text,
  estado text not null default 'PROYECTADO' check (estado in ('PROYECTADO', 'EN_CURSO', 'CERRADO')),
  supuestos jsonb not null default '{}',
  resultado jsonb not null default '{}',
  resultado_real jsonb,
  escenario_real_id text references public.escenarios (id) on delete set null,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.escenarios (tipo, fecha);

create table public.escenario_lineas (
  id text primary key default gen_random_uuid()::text,
  escenario_id text not null references public.escenarios (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  tipo text not null check (tipo in ('VENTA', 'COMPRA')),
  categoria text not null,
  cabezas int not null check (cabezas > 0),
  kg double precision,
  precio_kg double precision,
  monto double precision,
  movimiento_id text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.escenario_lineas (escenario_id);

select public.ganpro_enable_sync(t) from unnest(array['escenarios', 'escenario_lineas']) t;

do $$
declare t text;
begin
  foreach t in array array['escenarios', 'escenario_lineas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy ganpro_select on public.%I for select to authenticated using (public.ganpro_rol() is not null)', t);
    execute format('create policy ganpro_insert on public.%I for insert to authenticated with check (public.ganpro_rol() in (''admin'', ''campo''))', t);
    execute format('create policy ganpro_update on public.%I for update to authenticated using (public.ganpro_rol() in (''admin'', ''campo'')) with check (public.ganpro_rol() in (''admin'', ''campo''))', t);
    execute format('create policy ganpro_delete on public.%I for delete to authenticated using (public.ganpro_rol() in (''admin'', ''campo''))', t);
  end loop;
end $$;
