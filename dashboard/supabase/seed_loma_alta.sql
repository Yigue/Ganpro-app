-- =============================================================================
-- Loma Alta: carga inicial a partir del resumen de stock 2022-2026.
-- Pegar en Supabase > SQL Editor y ejecutar DESPUÉS de las migraciones.
--
-- Qué sale de los datos y qué es estimado:
--   * Stock actual (263 cab.) animal por animal, por lote y categoría: de los datos.
--   * Movimientos 2026 (ventas, muertes, nacimientos, retención): de los datos.
--   * Ventas 2022-2025, servicios, preñez y parición por año: de los datos.
--   * Caravanas, RFID, fechas exactas, pesos individuales, precios, montos de
--     ventas y gastos mensuales: ESTIMADOS para que el dashboard tenga contenido.
--     Reemplazalos por los reales cuando los tengas.
--
-- Si ya corriste seed.sql (demo), descomentá el bloque de limpieza de abajo.
-- =============================================================================

-- begin;
-- truncate public.animals, public.eventos, public.animal_movements, public.lotes,
--   public.potreros, public.operations_catalog, public.operation_logs,
--   public.scheduled_operations, public.protocolos_iatf, public.etapas_protocolo,
--   public.condicion_corporal, public.suplementos, public.raciones,
--   public.racion_ingredientes, public.potrero_feeding_logs,
--   public.movimientos_financieros, public.precios_mercado, public.servicios,
--   public.revisacion_toros, public.sigsa_stock, public.escenarios;
-- commit;

create or replace function pg_temp.ms(d date) returns bigint
language sql immutable as $$ select (extract(epoch from (d::timestamp + interval '12 hours')) * 1000)::bigint $$;

-- Precio vigente en una fecha (el último cargado hasta ese día).
create or replace function pg_temp.precio(d date, col text) returns double precision
language plpgsql stable as $$
declare v double precision;
begin
  execute format('select %I from public.precios_mercado where fecha <= $1 and %I is not null order by fecha desc limit 1', col, col)
    into v using pg_temp.ms(d);
  return v;
end $$;

-- Establecimiento y coeficientes ---------------------------------------------
update public.establecimiento
   set nombre = 'Loma Alta', localidad = 'Colonia Elía', provincia = 'Entre Ríos',
       hectareas_ganaderas = 200, inicio_ejercicio_mes = 7
 where id = 1;

-- EV de los datos: vaca 1,0 · vaquillona 0,7 · toro 1,3 · ternero al pie 0,3.
-- La ternera pasa a vaquillona al destete (~7 meses) y la vaquillona a vaca al
-- 31/12 del año en que se entora (~27 meses).
update public.categorias_config set ev = 1.0 where categoria = 'Vaca';
update public.categorias_config set ev = 0.7, recategoriza_a = 'Vaca', edad_recategorizacion_meses = 27 where categoria = 'Vaquillona';
update public.categorias_config set ev = 1.3 where categoria = 'Toro';
update public.categorias_config set ev = 0.3, recategoriza_a = 'Vaquillona', edad_recategorizacion_meses = 7 where categoria = 'Ternera';
update public.categorias_config set ev = 0.3 where categoria = 'Ternero';

-- Lotes y potreros (uno por lote) ---------------------------------------------
insert into public.lotes (id, nombre, ubicacion, descripcion, hectareas, costo_alquiler_ha) values
  ('la-l1', 'L1 Monte',        'Loma Alta', 'Cría', 60, 0),
  ('la-l2', 'L2 Pastura base', 'Loma Alta', 'Cría', 50, 0),
  ('la-l3', 'L3 Campo bajo',   'Loma Alta', 'Cría', 70, 0),
  ('la-l4', 'L4 Recría',       'Loma Alta', 'Recría de vaquillonas y toros', 20, 0);

insert into public.potreros (id, nombre, hectareas, recurso_forrajero, capacidad_ev) values
  ('la-p1', 'L1 Monte',        60, 'Campo natural con monte', 54),
  ('la-p2', 'L2 Pastura base', 50, 'Pastura implantada',      60),
  ('la-p3', 'L3 Campo bajo',   70, 'Campo natural',           63),
  ('la-p4', 'L4 Recría',       20, 'Verdeo / pastura',        40);

-- Precios de referencia mensuales ene-2022 a nov-2026 (ESTIMADOS, $/kg vivo) ----
insert into public.precios_mercado (fecha, ternero_kg, ternera_kg, novillo_kg, vaquillona_kg, vaca_kg, vaca_descarte_kg, toro_kg, dolar_oficial, dolar_mep, fuente)
select pg_temp.ms(m::date),
       round(t::numeric), round((t * 0.94)::numeric), round((t / 1.18)::numeric), round((t / 1.18 * 1.03)::numeric),
       round((t / 1.18 * 0.72)::numeric), round((t / 1.18 * 0.62)::numeric), round((t / 1.18 * 0.68)::numeric),
       round(dol::numeric, 1), round((dol * mep)::numeric, 1), 'MANUAL'
from (
  select m,
         -- interpolación geométrica entre anclas de enero + estacionalidad suave
         a.t0 * power(a.t1 / a.t0, extract(month from age(m, a.desde)) / 12.0)
           * (1 + 0.04 * cos(2 * pi() * (extract(month from m) - 3) / 12)) as t,
         a.d0 * power(a.d1 / a.d0, extract(month from age(m, a.desde)) / 12.0) as dol,
         case when m < '2024-01-01' then 1.9 when m < '2025-04-01' then 1.25 else 1.04 end as mep
    from generate_series('2022-01-01'::timestamp, '2026-11-01'::timestamp, interval '1 month') m
    join (values
      ('2022-01-01'::timestamp, 330.0, 560.0, 103.0, 180.0),
      ('2023-01-01'::timestamp, 560.0, 1700.0, 180.0, 810.0),
      ('2024-01-01'::timestamp, 1700.0, 2700.0, 810.0, 1045.0),
      ('2025-01-01'::timestamp, 2700.0, 3250.0, 1045.0, 1440.0),
      ('2026-01-01'::timestamp, 3250.0, 3600.0, 1440.0, 1520.0)
    ) as a(desde, t0, t1, d0, d1) on m >= a.desde and m < a.desde + interval '1 year'
) x;

-- Catálogo sanitario -------------------------------------------------------------
insert into public.operations_catalog (id, nombre, tipo, dias_carencia, costo_unitario, notas) values
  ('la-op-aftosa',   'Aftosa (FUCOFA)',                    'VACUNA', 0,  1800, 'Campañas FUCOFA'),
  ('la-op-bruce',    'Brucelosis (terneras)',              'VACUNA', 0,  1500, 'Terneras de 3 a 8 meses'),
  ('la-op-clostri',  'Clostridiales',                      'VACUNA', 21, 900,  'Al destete y refuerzo'),
  ('la-op-carbunclo','Carbunclo',                          'VACUNA', 21, 600,  'Anual'),
  ('la-op-repro',    'Leptospirosis / IBR / DVB',          'VACUNA', 21, 2200, 'Pre-servicio'),
  ('la-op-iatf',     'Protocolo IATF',                     'IATF',   0,  9500, 'IATF parcial + repaso con toros');

do $$
declare
  hoy constant date := '2026-11-01';
  d constant bigint := 86400000;
  i int;
  k int;
  aid text;
  nac date;
  lote text;
  pot text;
  raza text;
  peso double precision;
  sexo text;
  anio int;
  r record;
begin
  ----------------------------------------------------------------------------
  -- ANIMALES ACTIVOS (263)
  ----------------------------------------------------------------------------

  -- 115 vacas: L1 41, L2 33, L3 41. Nacidas 2017-2023 (las de 2023 pasaron a vaca el 31/12/2025).
  for i in 1..115 loop
    nac := make_date(
      case when i <= 22 then 2023 when i <= 42 then 2022 when i <= 62 then 2021 when i <= 82 then 2020
           when i <= 98 then 2019 when i <= 108 then 2018 else 2017 end,
      9 + (i % 3), 1 + (i * 7) % 28);
    lote := case when i <= 41 then 'la-l1' when i <= 74 then 'la-l2' else 'la-l3' end;
    pot := replace(lote, '-l', '-p');
    raza := case when i % 5 in (0, 3) then 'Brangus' else 'Angus' end;
    peso := case when i <= 22 then 395 else 425 end + (i * 13) % 50;
    aid := 'la-v-' || lpad(i::text, 3, '0');
    insert into public.animals (id, id_caravana, rfid, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, (1000 + i)::text, '982000' || lpad((410000000 + i)::text, 9, '0'), 'H', 'Vaca', raza, pg_temp.ms(nac), peso, 'ACTIVO', lote, pot,
            pg_temp.ms(nac + 200), pg_temp.ms(hoy));
    insert into public.eventos (animal_id, tipo, valor, timestamp, notas) values
      (aid, 'PESAJE', peso - 18 + (i % 7), pg_temp.ms('2025-10-20'), 'Pre-servicio'),
      (aid, 'PESAJE', peso - 30 + (i % 9), pg_temp.ms('2026-04-08'), 'Destete'),
      (aid, 'PESAJE', peso,                 pg_temp.ms('2026-10-15'), 'Pre-servicio');
  end loop;

  -- 46 vaquillonas en L4: 22 entoradas (nacidas sep-nov 2024) + 24 retenidas en 2026 (nacidas 2025).
  for i in 1..46 loop
    nac := make_date(case when i <= 22 then 2024 else 2025 end, 9 + (i % 3), 1 + (i * 5) % 28);
    peso := case when i <= 22 then 345 + (i * 11) % 35 else 215 + (i * 7) % 30 end;
    aid := 'la-q-' || lpad(i::text, 2, '0');
    insert into public.animals (id, id_caravana, rfid, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, (case when i <= 22 then 2400 else 2500 end + i)::text, '982000' || lpad((420000000 + i)::text, 9, '0'), 'H', 'Vaquillona',
            case when i % 3 = 0 then 'Brangus' else 'Angus' end, pg_temp.ms(nac), peso, 'ACTIVO', 'la-l4', 'la-p4', pg_temp.ms(nac), pg_temp.ms(hoy));
    if i <= 22 then
      insert into public.eventos (animal_id, tipo, valor, timestamp, notas) values
        (aid, 'PESAJE', 172 + (i % 10), pg_temp.ms('2025-04-10'), 'Destete'),
        (aid, 'PESAJE', 250 + (i % 12), pg_temp.ms('2025-10-20'), null),
        (aid, 'PESAJE', 305 + (i % 15), pg_temp.ms('2026-04-08'), null),
        (aid, 'PESAJE', peso,           pg_temp.ms('2026-10-15'), 'Pre-servicio');
    else
      insert into public.eventos (animal_id, tipo, valor, timestamp, notas) values
        (aid, 'PESAJE', 168 + (i % 10), pg_temp.ms('2026-04-08'), 'Destete'),
        (aid, 'PESAJE', 190 + (i % 12), pg_temp.ms('2026-07-15'), null),
        (aid, 'PESAJE', peso,           pg_temp.ms('2026-10-15'), null);
    end if;
  end loop;

  -- 5 toros en L4 (dos comprados: 2022 y 2024).
  for i in 1..5 loop
    aid := 'la-t-' || i;
    peso := 780 + i * 15;
    insert into public.animals (id, id_caravana, rfid, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, 'T' || i, '982000' || lpad((430000000 + i)::text, 9, '0'), 'M', 'Toro', case when i % 2 = 0 then 'Brangus' else 'Angus' end,
            pg_temp.ms(make_date(2016 + i, 10, 1)), peso, 'ACTIVO', 'la-l4', 'la-p4',
            case i when 4 then pg_temp.ms('2022-08-18') when 5 then pg_temp.ms('2024-08-22') else pg_temp.ms(make_date(2018 + i, 9, 1)) end,
            pg_temp.ms(hoy));
    insert into public.eventos (animal_id, tipo, valor, timestamp) values (aid, 'PESAJE', peso, pg_temp.ms('2026-10-15'));
  end loop;

  -- 97 terneros al pie nacidos sep-oct 2026: 48 machos y 49 hembras. L1 35, L2 27, L3 35.
  for i in 1..97 loop
    nac := '2026-09-01'::date + ((i * 3) % 60);
    sexo := case when i % 2 = 0 then 'M' else 'H' end;
    lote := case when i <= 35 then 'la-l1' when i <= 62 then 'la-l2' else 'la-l3' end;
    pot := replace(lote, '-l', '-p');
    aid := 'la-c-' || lpad(i::text, 3, '0');
    insert into public.animals (id, id_caravana, rfid, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, (2600 + i)::text, null, sexo, case sexo when 'M' then 'Ternero' else 'Ternera' end,
            case when i % 5 in (0, 3) then 'Brangus' else 'Angus' end, pg_temp.ms(nac),
            round((32 + 0.85 * (hoy - nac))::numeric), 'ACTIVO', lote, pot, pg_temp.ms(nac), pg_temp.ms(hoy));
    insert into public.eventos (animal_id, tipo, valor, timestamp, notas) values (aid, 'PESAJE', 30 + (i % 6), pg_temp.ms(nac), 'Nacimiento');
  end loop;

  ----------------------------------------------------------------------------
  -- BAJAS 2026 (para el histórico de los últimos 12 meses)
  ----------------------------------------------------------------------------

  -- 52 terneros machos y 27 terneras de la parición 2025, vendidos al destete.
  for i in 1..79 loop
    sexo := case when i <= 52 then 'M' else 'H' end;
    nac := make_date(2025, 9 + (i % 3), 1 + (i * 3) % 28);
    aid := 'la-d-' || lpad(i::text, 3, '0');
    peso := case sexo when 'M' then 175 + (i * 7) % 20 else 165 + (i * 5) % 16 end;
    insert into public.animals (id, id_caravana, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, (2500 + 24 + i)::text, sexo, case sexo when 'M' then 'Ternero' else 'Ternera' end, 'Angus', pg_temp.ms(nac), peso, 'VENDIDO',
            case when i % 3 = 0 then 'la-l1' when i % 3 = 1 then 'la-l2' else 'la-l3' end,
            case when i % 3 = 0 then 'la-p1' when i % 3 = 1 then 'la-p2' else 'la-p3' end, pg_temp.ms(nac),
            pg_temp.ms(case sexo when 'M' then '2026-03-26'::date else '2026-04-09'::date end));
    insert into public.eventos (animal_id, tipo, valor, timestamp, notas) values
      (aid, 'PESAJE', peso, pg_temp.ms(case sexo when 'M' then '2026-03-25'::date else '2026-04-08'::date end), 'Destete');
    insert into public.eventos (animal_id, tipo, timestamp, dte_numero, notas) values
      (aid, 'VENTA', pg_temp.ms(case sexo when 'M' then '2026-03-26'::date else '2026-04-09'::date end),
       case sexo when 'M' then '07-2026-001842' else '07-2026-002107' end,
       case sexo when 'M' then 'Venta terneros al destete' else 'Venta terneras al destete' end);
  end loop;

  -- 13 vacas de descarte vendidas (las vacías del tacto 2025 y la más vieja).
  for i in 1..13 loop
    aid := 'la-vd-' || lpad(i::text, 2, '0');
    insert into public.animals (id, id_caravana, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (aid, (900 + i)::text, 'H', 'Vaca', 'Angus', pg_temp.ms(make_date(2013 + i % 4, 10, 1)), 420 + (i * 9) % 40, 'VENDIDO',
            case when i <= 5 then 'la-l1' when i <= 9 then 'la-l2' else 'la-l3' end,
            case when i <= 5 then 'la-p1' when i <= 9 then 'la-p2' else 'la-p3' end, pg_temp.ms('2020-01-01'), pg_temp.ms('2026-04-22'));
    insert into public.eventos (animal_id, tipo, timestamp, dte_numero, notas) values
      (aid, 'VENTA', pg_temp.ms('2026-04-22'), '07-2026-002266', 'Vacas de descarte');
  end loop;

  -- Muertes 2026: 2 vacas y 3 terneros al pie.
  insert into public.animals (id, id_caravana, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at) values
    ('la-vm-1', '951', 'H', 'Vaca', 'Angus', pg_temp.ms('2015-10-01'), 410, 'MUERTO', 'la-l3', 'la-p3', pg_temp.ms('2020-01-01'), pg_temp.ms('2026-06-12')),
    ('la-vm-2', '952', 'H', 'Vaca', 'Brangus', pg_temp.ms('2017-09-15'), 430, 'MUERTO', 'la-l1', 'la-p1', pg_temp.ms('2020-01-01'), pg_temp.ms('2026-08-03')),
    ('la-cm-1', '2701', 'M', 'Ternero', 'Angus', pg_temp.ms('2026-09-04'), 34, 'MUERTO', 'la-l3', 'la-p3', pg_temp.ms('2026-09-04'), pg_temp.ms('2026-09-06')),
    ('la-cm-2', '2702', 'H', 'Ternera', 'Angus', pg_temp.ms('2026-09-20'), 33, 'MUERTO', 'la-l1', 'la-p1', pg_temp.ms('2026-09-20'), pg_temp.ms('2026-09-23')),
    ('la-cm-3', '2703', 'M', 'Ternero', 'Brangus', pg_temp.ms('2026-10-11'), 35, 'MUERTO', 'la-l2', 'la-p2', pg_temp.ms('2026-10-11'), pg_temp.ms('2026-10-14'));
  insert into public.eventos (animal_id, tipo, timestamp, notas) values
    ('la-vm-1', 'MUERTE', pg_temp.ms('2026-06-12'), 'Causa a confirmar'),
    ('la-vm-2', 'MUERTE', pg_temp.ms('2026-08-03'), 'Causa a confirmar'),
    ('la-cm-1', 'MUERTE', pg_temp.ms('2026-09-06'), 'Al parto'),
    ('la-cm-2', 'MUERTE', pg_temp.ms('2026-09-23'), 'Al parto'),
    ('la-cm-3', 'MUERTE', pg_temp.ms('2026-10-14'), null);

  -- Retenidas 2026: pasaron del lote de cría a L4 al destete.
  insert into public.animal_movements (animal_id, lote_origen_id, lote_destino_id, potrero_origen_id, potrero_destino_id, fecha)
  select id, 'la-l1', 'la-l4', 'la-p1', 'la-p4', pg_temp.ms('2026-04-10') from public.animals where id between 'la-q-23' and 'la-q-46';

  ----------------------------------------------------------------------------
  -- TACTO 2025 (preñez 92 %): las 10 vacías son descartes vendidos en 2026.
  ----------------------------------------------------------------------------
  insert into public.eventos (animal_id, tipo, notas, timestamp)
  select id, 'TACTO',
         case when id between 'la-vd-01' and 'la-vd-10' then 'tacto:vacia'
              else 'tacto:prenada ' || (array['cabeza', 'cabeza', 'cuerpo', 'cola'])[1 + abs(hashtext(id)) % 4] end,
         pg_temp.ms('2025-04-08')
    from public.animals
   where id like 'la-v-%' or id like 'la-vd-%' or id like 'la-vm-%';

  ----------------------------------------------------------------------------
  -- SERVICIOS por temporada (año Y de los datos = servicio dic Y-1 a feb Y)
  ----------------------------------------------------------------------------
  for r in select * from (values
      (2022, 100, 22), (2023, 110, 20), (2024, 117, 20), (2025, 122, 22), (2026, 130, 22)
    ) as t(anio, vacas, vaquillonas) loop
    insert into public.servicios (temporada, lote_id, toros, vientres, fecha_entrada, fecha_salida, notas) values
      ((r.anio - 1) || '-' || right(r.anio::text, 2), 'la-l1', array['la-t-1', 'la-t-2'], round(r.vacas * 0.36), pg_temp.ms(make_date(r.anio - 1, 12, 1)), pg_temp.ms(make_date(r.anio, 2, 28)), 'IATF parcial + repaso con toros'),
      ((r.anio - 1) || '-' || right(r.anio::text, 2), 'la-l2', array['la-t-3'],           round(r.vacas * 0.28), pg_temp.ms(make_date(r.anio - 1, 12, 1)), pg_temp.ms(make_date(r.anio, 2, 28)), 'IATF parcial + repaso con toros'),
      ((r.anio - 1) || '-' || right(r.anio::text, 2), 'la-l3', array['la-t-4'],           r.vacas - round(r.vacas * 0.36) - round(r.vacas * 0.28), pg_temp.ms(make_date(r.anio - 1, 12, 1)), pg_temp.ms(make_date(r.anio, 2, 28)), 'IATF parcial + repaso con toros'),
      ((r.anio - 1) || '-' || right(r.anio::text, 2), 'la-l4', array['la-t-5'],           r.vaquillonas, pg_temp.ms(make_date(r.anio - 1, 12, 1)), pg_temp.ms(make_date(r.anio, 2, 28)), 'Vaquillonas: IATF + repaso');
  end loop;

  ----------------------------------------------------------------------------
  -- SANIDAD 2022-2026 por lote
  ----------------------------------------------------------------------------
  for anio in 2022..2026 loop
    -- Aftosa campaña de otoño: todo el rodeo.
    insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, dosis, responsable, acta_numero)
    select l, 'la-op-aftosa', pg_temp.ms(make_date(anio, 5, 12)), 1, 'Vacunador FUCOFA', 'FUCOFA-ER-' || anio || '-0' || (300 + anio % 100)
      from unnest(array['la-l1', 'la-l2', 'la-l3', 'la-l4']) l;
    -- Destete: clostridiales a los terneros (en los lotes de cría) y brucelosis a las retenidas (L4).
    insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, fecha_fin_carencia, dosis, responsable)
    select l, 'la-op-clostri', pg_temp.ms(make_date(anio, 4, 6)), pg_temp.ms(make_date(anio, 4, 27)), 1, 'Encargado'
      from unnest(array['la-l1', 'la-l2', 'la-l3']) l;
    insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, dosis, responsable, acta_numero) values
      ('la-l4', 'la-op-bruce', pg_temp.ms(make_date(anio, 4, 15)), 1, 'Veterinario', 'BR-' || anio || '-114');
    -- Carbunclo anual.
    insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, fecha_fin_carencia, dosis, responsable)
    select l, 'la-op-carbunclo', pg_temp.ms(make_date(anio, 8, 20)), pg_temp.ms(make_date(anio, 9, 10)), 1, 'Encargado'
      from unnest(array['la-l1', 'la-l2', 'la-l3', 'la-l4']) l;
    -- Aftosa campaña de primavera (menores) y reproductivas pre-servicio: 2022-2025.
    if anio < 2026 then
      insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, dosis, responsable, acta_numero) values
        ('la-l4', 'la-op-aftosa', pg_temp.ms(make_date(anio, 11, 10)), 1, 'Vacunador FUCOFA', 'FUCOFA-ER-' || anio || '-1' || (100 + anio % 100));
      insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, fecha_fin_carencia, dosis, responsable)
      select l, 'la-op-repro', pg_temp.ms(make_date(anio, 11, 18)), pg_temp.ms(make_date(anio, 12, 9)), 1, 'Veterinario'
        from unnest(array['la-l1', 'la-l2', 'la-l3', 'la-l4']) l;
    end if;
  end loop;

  -- Calendario 2026-27: lo que falta este año y lo del próximo.
  insert into public.scheduled_operations (operation_id, lote_id, fecha_programada, estado) values
    ('la-op-aftosa',    'la-l4', pg_temp.ms('2026-11-10'), 'PENDIENTE'),
    ('la-op-aftosa',    'la-l1', pg_temp.ms('2026-11-10'), 'PENDIENTE'),
    ('la-op-aftosa',    'la-l2', pg_temp.ms('2026-11-10'), 'PENDIENTE'),
    ('la-op-aftosa',    'la-l3', pg_temp.ms('2026-11-10'), 'PENDIENTE'),
    ('la-op-repro',     'la-l1', pg_temp.ms('2026-11-18'), 'PENDIENTE'),
    ('la-op-repro',     'la-l2', pg_temp.ms('2026-11-18'), 'PENDIENTE'),
    ('la-op-repro',     'la-l3', pg_temp.ms('2026-11-18'), 'PENDIENTE'),
    ('la-op-repro',     'la-l4', pg_temp.ms('2026-11-18'), 'PENDIENTE'),
    ('la-op-iatf',      'la-l4', pg_temp.ms('2026-12-01'), 'PENDIENTE'),
    ('la-op-clostri',   'la-l1', pg_temp.ms('2027-04-06'), 'PENDIENTE'),
    ('la-op-bruce',     'la-l4', pg_temp.ms('2027-04-15'), 'PENDIENTE'),
    ('la-op-aftosa',    'la-l1', pg_temp.ms('2027-05-12'), 'PENDIENTE'),
    ('la-op-carbunclo', 'la-l1', pg_temp.ms('2027-08-20'), 'PENDIENTE');

  ----------------------------------------------------------------------------
  -- VENTAS Y COMPRAS 2022-2026 (cabezas de los datos; kg y montos estimados)
  ----------------------------------------------------------------------------
  for r in select * from (values
      (2022, 38, 24, 10, 1, 1, 175), (2023, 41, 21, 11, 0, 0, 180), (2024, 46, 24, 12, 1, 1, 172),
      (2025, 48, 25, 12, 0, 0, 182), (2026, 52, 27, 13, 0, 0, 178)
    ) as t(anio, machos, terneras, vacas, toros_desc, toros_compra, peso_destete) loop
    insert into public.movimientos_financieros (tipo, categoria, lote_id, monto, fecha, descripcion, cabezas, kg, categoria_animal, dte_numero, dte_estado, cobrado, fecha_cobro) values
      ('INGRESO', 'VENTA', null, round(r.machos * (r.peso_destete + 6) * pg_temp.precio(make_date(r.anio, 3, 26), 'ternero_kg')), pg_temp.ms(make_date(r.anio, 3, 26)),
       'Venta ' || r.machos || ' terneros al destete', r.machos, r.machos * (r.peso_destete + 6), 'Ternero', '07-' || r.anio || '-001842', 'EMITIDO', true, pg_temp.ms(make_date(r.anio, 3, 26))),
      ('INGRESO', 'VENTA', null, round(r.terneras * (r.peso_destete - 8) * pg_temp.precio(make_date(r.anio, 4, 9), 'ternera_kg')), pg_temp.ms(make_date(r.anio, 4, 9)),
       'Venta ' || r.terneras || ' terneras al destete', r.terneras, r.terneras * (r.peso_destete - 8), 'Ternera', '07-' || r.anio || '-002107', 'EMITIDO', true, pg_temp.ms(make_date(r.anio, 4, 9))),
      ('INGRESO', 'VENTA', null, round(r.vacas * 430 * pg_temp.precio(make_date(r.anio, 4, 22), 'vaca_descarte_kg')), pg_temp.ms(make_date(r.anio, 4, 22)),
       'Venta ' || r.vacas || ' vacas de descarte', r.vacas, r.vacas * 430, 'Vaca Descarte', '07-' || r.anio || '-002266', 'EMITIDO', true, pg_temp.ms(make_date(r.anio, 5, 22)));
    if r.toros_desc > 0 then
      insert into public.movimientos_financieros (tipo, categoria, lote_id, monto, fecha, descripcion, cabezas, kg, categoria_animal, dte_numero, dte_estado, cobrado)
      values ('INGRESO', 'VENTA', 'la-l4', round(760 * pg_temp.precio(make_date(r.anio, 5, 15), 'toro_kg')), pg_temp.ms(make_date(r.anio, 5, 15)),
              'Venta toro de descarte', 1, 760, 'Toro', '07-' || r.anio || '-002590', 'EMITIDO', true);
    end if;
    if r.toros_compra > 0 then
      insert into public.movimientos_financieros (tipo, categoria, lote_id, monto, fecha, descripcion, cabezas, kg, categoria_animal, dte_numero, dte_estado)
      values ('GASTO', 'COMPRA', 'la-l4', round(780 * pg_temp.precio(make_date(r.anio, 8, 20), 'novillo_kg') * 1.8), pg_temp.ms(make_date(r.anio, 8, 20)),
              'Compra toro reproductor', 1, 780, 'Toro', '07-' || r.anio || '-004410', 'EMITIDO');
    end if;
  end loop;

  -- Gastos mensuales ene-2022 a oct-2026 (ESTIMADOS: valores de ene-2026 ajustados por el precio del ternero).
  insert into public.movimientos_financieros (tipo, categoria, monto, fecha, descripcion)
  select 'GASTO', c.cat,
         round(c.base * (case when c.cat = 'SANIDAD' and extract(month from m) in (4, 5, 8, 11) then 2.5
                              when c.cat = 'NUTRICION' and extract(month from m) in (6, 7, 8) then 1.8 else 1 end)
               * pg_temp.precio(m::date, 'ternero_kg') / 3250.0),
         pg_temp.ms((m + interval '4 days')::date), c.descr
    from generate_series('2022-01-01'::timestamp, '2026-10-01'::timestamp, interval '1 month') m,
         (values ('MANO_OBRA', 1300000, 'Sueldo y cargas del encargado'),
                 ('SANIDAD', 160000, 'Vacunas y veterinario'),
                 ('NUTRICION', 240000, 'Sal mineral y suplemento'),
                 ('MANTENIMIENTO', 220000, 'Alambrados, aguadas y combustible'),
                 ('IMPUESTOS', 160000, 'Inmobiliario rural y tasas')) as c(cat, base, descr);

  ----------------------------------------------------------------------------
  -- SIGSA: stock al 31/12 de cada año y consulta actual
  ----------------------------------------------------------------------------
  for r in select * from (values
      ('2022-12-31'::date, 110, 20, 5, 82), ('2023-12-31'::date, 117, 20, 5, 92),
      ('2024-12-31'::date, 122, 22, 5, 95), ('2025-12-31'::date, 130, 22, 5, 103)
    ) as t(fecha, vacas, vaquillonas, toros, terneros) loop
    insert into public.sigsa_stock (fecha, categoria, cabezas, fuente, acta_numero) values
      (pg_temp.ms(r.fecha), 'Vaca', r.vacas, 'HISTORICO', 'Stock SIGSA ' || extract(year from r.fecha)),
      (pg_temp.ms(r.fecha), 'Vaquillona', r.vaquillonas, 'HISTORICO', 'Stock SIGSA ' || extract(year from r.fecha)),
      (pg_temp.ms(r.fecha), 'Toro', r.toros, 'HISTORICO', 'Stock SIGSA ' || extract(year from r.fecha)),
      (pg_temp.ms(r.fecha), 'Ternero', r.terneros / 2, 'HISTORICO', 'Stock SIGSA ' || extract(year from r.fecha)),
      (pg_temp.ms(r.fecha), 'Ternera', r.terneros - r.terneros / 2, 'HISTORICO', 'Stock SIGSA ' || extract(year from r.fecha));
  end loop;
  insert into public.sigsa_stock (fecha, categoria, cabezas, fuente, acta_numero) values
    (pg_temp.ms('2026-11-01'), 'Vaca', 115, 'HISTORICO', 'Consulta SIGSA 01/11/2026'),
    (pg_temp.ms('2026-11-01'), 'Vaquillona', 46, 'HISTORICO', 'Consulta SIGSA 01/11/2026'),
    (pg_temp.ms('2026-11-01'), 'Toro', 5, 'HISTORICO', 'Consulta SIGSA 01/11/2026'),
    (pg_temp.ms('2026-11-01'), 'Ternero', 48, 'HISTORICO', 'Consulta SIGSA 01/11/2026'),
    (pg_temp.ms('2026-11-01'), 'Ternera', 49, 'HISTORICO', 'Consulta SIGSA 01/11/2026');
end $$;

-- Control rápido: tiene que dar 115 vacas, 46 vaquillonas, 5 toros, 48 terneros y 49 terneras.
select categoria, count(*) as cabezas from public.animals where estado = 'ACTIVO' group by categoria order by cabezas desc;
