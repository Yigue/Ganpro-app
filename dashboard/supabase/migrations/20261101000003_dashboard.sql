-- Datos que faltaban para el dashboard (sección "Datos faltantes" del plan).
-- Las columnas nuevas en tablas de la app son opcionales: la app v3 las ignora al
-- hacer pull, y el push solo actualiza las columnas que manda, así que no las pisa.

-- Usuarios y roles --------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  email text,
  rol text not null default 'asesor' check (rol in ('admin', 'campo', 'asesor')),
  created_at timestamptz not null default now()
);

-- El primer usuario que se registra queda como admin; el resto entra como asesor
-- (solo lectura) hasta que un admin le cambie el rol.
create or replace function public.ganpro_crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.perfiles) then 'asesor' else 'admin' end
  );
  return new;
end $$;

create trigger ganpro_crear_perfil after insert on auth.users
  for each row execute function public.ganpro_crear_perfil();

create or replace function public.ganpro_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

-- Establecimiento ---------------------------------------------------------------
create table public.establecimiento (
  id int primary key default 1 check (id = 1),
  nombre text not null default 'Loma Alta',
  renspa text default '07.014.0.00043/09',
  localidad text default 'Colonia Elía',
  provincia text default 'Entre Ríos',
  hectareas_ganaderas double precision,
  inicio_ejercicio_mes int not null default 7 check (inicio_ejercicio_mes between 1 and 12),
  dias_alerta_pesada int not null default 90,
  dias_alerta_sanidad int not null default 15,
  updated_at timestamptz not null default now()
);
insert into public.establecimiento (id) values (1);

-- Coeficientes de EV, recategorización y consumo de sal por categoría ------------
create table public.categorias_config (
  categoria text primary key,
  sexo text check (sexo in ('M', 'H')),
  ev double precision not null,
  orden int not null default 0,
  recategoriza_a text,
  edad_recategorizacion_meses int,
  consumo_sal_g_dia double precision,
  precio_columna text
);
insert into public.categorias_config
  (categoria, sexo, ev, orden, recategoriza_a, edad_recategorizacion_meses, consumo_sal_g_dia, precio_columna) values
  ('Vaca',          'H', 1.00, 1, null,         null, 80, 'vaca_kg'),
  ('Vaquillona',    'H', 0.70, 2, 'Vaca',         30, 60, 'vaquillona_kg'),
  ('Ternera',       'H', 0.50, 3, 'Vaquillona',   12, 40, 'ternera_kg'),
  ('Ternero',       'M', 0.50, 4, 'Novillito',    12, 40, 'ternero_kg'),
  ('Novillito',     'M', 0.65, 5, 'Novillo',      24, 50, 'novillo_kg'),
  ('Novillo',       'M', 0.80, 6, null,         null, 60, 'novillo_kg'),
  ('Toro',          'M', 1.30, 7, null,         null, 90, 'toro_kg'),
  ('Vaca Descarte', 'H', 0.90, 8, null,         null, 70, 'vaca_descarte_kg');

-- Servicio natural con toros ----------------------------------------------------
create table public.servicios (
  id text primary key default gen_random_uuid()::text,
  temporada text not null,
  lote_id text not null,
  toros text[] not null default '{}',
  vientres int,
  fecha_entrada bigint not null,
  fecha_salida bigint,
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.servicios (lote_id);

-- Revisación de toros (sanitaria y aptitud reproductiva)
create table public.revisacion_toros (
  id text primary key default gen_random_uuid()::text,
  animal_id text not null,
  fecha bigint not null,
  apto boolean not null,
  sanitaria text,
  circunferencia_escrotal_cm double precision,
  notas text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);

-- Ingredientes de raciones / sal mineralizada -----------------------------------
create table public.racion_ingredientes (
  id text primary key default gen_random_uuid()::text,
  racion_id text not null,
  suplemento_id text not null,
  porcentaje double precision not null check (porcentaje > 0 and porcentaje <= 100),
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.racion_ingredientes (racion_id);

-- Stock declarado en SIGSA (actas e histórico) para conciliar -------------------
create table public.sigsa_stock (
  id text primary key default gen_random_uuid()::text,
  fecha bigint not null,
  categoria text not null,
  cabezas int not null check (cabezas >= 0),
  fuente text not null default 'ACTA' check (fuente in ('ACTA', 'HISTORICO', 'CSV')),
  acta_numero text,
  created_at bigint not null default public.ganpro_now_ms(),
  updated_at bigint not null default public.ganpro_now_ms()
);
create index on public.sigsa_stock (fecha);

-- Columnas nuevas en tablas de la app -------------------------------------------
alter table public.operation_logs
  add column acta_numero text,
  add column producto_lote text;

alter table public.precios_mercado
  add column ternera_kg double precision,
  add column vaquillona_kg double precision,
  add column toro_kg double precision,
  add column dolar_oficial double precision,
  add column dolar_mep double precision;

alter table public.movimientos_financieros
  add column cabezas int,
  add column kg double precision,
  add column categoria_animal text,
  add column renspa_destino text,
  add column dte_estado text check (dte_estado in ('EMITIDO', 'ANULADO', 'RETORNO')),
  add column fecha_cobro bigint,
  add column cobrado boolean;

alter table public.suplementos
  add column stock_minimo_kg double precision;

-- Las tablas propias del dashboard también llevan sello de sync para cuando la app
-- pase al esquema v4 (todavía no se envían en el pull).
select public.ganpro_enable_sync(t)
  from unnest(array['servicios', 'revisacion_toros', 'racion_ingredientes', 'sigsa_stock']) t;
