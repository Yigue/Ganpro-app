-- Datos de demostración para Loma Alta. Solo para un proyecto de prueba:
-- no lo corras sobre la base real que sincroniza el celular.
-- Uso: supabase db reset (lo aplica solo) o pegarlo en el SQL Editor.

do $$
declare
  d constant bigint := 86400000;
  hoy bigint := public.ganpro_now_ms();
  i int;
  cat text;
  sexo text;
  lote text;
  pot text;
  peso double precision;
  aid text;
begin
  insert into public.lotes (id, nombre, ubicacion, hectareas, costo_alquiler_ha, densidad_carga) values
    ('lote-cria',   'Rodeo de cría',  'Campo norte', 220, 0,     null),
    ('lote-recria', 'Recría',         'Campo sur',   80,  60000, null),
    ('lote-toros',  'Toros',          'Casco',       25,  0,     null);

  insert into public.potreros (id, nombre, hectareas, recurso_forrajero, capacidad_ev) values
    ('pot-1', 'La Aguada',   120, 'Campo natural',        90),
    ('pot-2', 'El Monte',    100, 'Campo natural mejorado', 85),
    ('pot-3', 'Pastura',      60, 'Festuca + trébol',      70),
    ('pot-4', 'Verdeo',       20, 'Avena',                 30),
    ('pot-5', 'Casco',        25, 'Campo natural',         20);

  update public.establecimiento set hectareas_ganaderas = 325 where id = 1;

  -- Rodeo: 120 vacas, 30 vaquillonas, 70 terneros/as, 20 novillitos, 5 toros
  for i in 1..245 loop
    if i <= 120 then cat := 'Vaca'; sexo := 'H'; lote := 'lote-cria'; pot := case when i % 2 = 0 then 'pot-1' else 'pot-2' end; peso := 400 + (i % 60);
    elsif i <= 150 then cat := 'Vaquillona'; sexo := 'H'; lote := 'lote-recria'; pot := 'pot-3'; peso := 300 + (i % 40);
    elsif i <= 185 then cat := 'Ternera'; sexo := 'H'; lote := 'lote-cria'; pot := 'pot-1'; peso := 150 + (i % 30);
    elsif i <= 220 then cat := 'Ternero'; sexo := 'M'; lote := 'lote-cria'; pot := 'pot-2'; peso := 160 + (i % 35);
    elsif i <= 240 then cat := 'Novillito'; sexo := 'M'; lote := 'lote-recria'; pot := 'pot-4'; peso := 260 + (i % 40);
    else cat := 'Toro'; sexo := 'M'; lote := 'lote-toros'; pot := 'pot-5'; peso := 750 + (i % 10) * 10;
    end if;
    aid := 'an-' || lpad(i::text, 4, '0');
    insert into public.animals (id, id_caravana, rfid, sexo, categoria, raza, fecha_nacimiento, peso_actual, estado, lote_id, potrero_id, created_at, updated_at)
    values (
      aid, lpad(i::text, 4, '0'), '982000' || lpad((400000000 + i)::text, 9, '0'), sexo, cat,
      (array['Angus', 'Hereford', 'Braford', 'Brangus'])[1 + i % 4],
      hoy - (case cat when 'Vaca' then 1800 + i * 5 when 'Vaquillona' then 600 + i when 'Ternera' then 150 + (i % 60) * 4 when 'Ternero' then 150 + (i % 60) * 4 when 'Novillito' then 420 + i else 2000 end) * d,
      peso, 'ACTIVO', lote, pot, hoy - 400 * d, hoy - 400 * d);

    -- Pesadas: 4 por animal (no toros), cada 60 días
    if cat <> 'Toro' then
      insert into public.eventos (animal_id, tipo, valor, timestamp)
      select aid, 'PESAJE', peso - (3 - k) * (case when cat in ('Vaca') then 5 else 32 end), hoy - (180 - k * 60 + (i % 7)) * d
        from generate_series(0, 3) k;
    end if;

    -- Tacto de la última temporada en vacas y vaquillonas
    if cat in ('Vaca', 'Vaquillona') then
      insert into public.eventos (animal_id, tipo, notas, timestamp)
      values (aid, 'TACTO', case when i % 9 = 0 then 'tacto:vacia' else 'tacto:prenada' end, hoy - 120 * d);
      insert into public.condicion_corporal (animal_id, lote_id, fecha, score, evaluador)
      values (aid, lote, hoy - 210 * d, 2.5 + (i % 5) * 0.25, 'Encargado');
    end if;
  end loop;

  -- Bajas del ejercicio
  update public.animals set estado = 'MUERTO' where id in ('an-0007', 'an-0190');
  insert into public.eventos (animal_id, tipo, notas, timestamp) values
    ('an-0007', 'MUERTE', 'Mancha', hoy - 90 * d),
    ('an-0190', 'MUERTE', 'Neumonía', hoy - 30 * d);
  update public.animals set estado = 'VENDIDO' where id between 'an-0221' and 'an-0230';
  insert into public.eventos (animal_id, tipo, notas, timestamp, dte_numero)
    select id, 'VENTA', 'Venta novillitos', hoy - 45 * d, '07-2026-004512' from public.animals where id between 'an-0221' and 'an-0230';

  -- Movimientos entre potreros
  insert into public.animal_movements (animal_id, potrero_origen_id, potrero_destino_id, lote_origen_id, lote_destino_id, fecha)
    select id, 'pot-3', 'pot-4', 'lote-recria', 'lote-recria', hoy - 20 * d from public.animals where categoria = 'Novillito' limit 10;

  -- Catálogo sanitario
  insert into public.operations_catalog (id, nombre, tipo, dias_carencia, costo_unitario, notas) values
    ('op-aftosa',   'Aftosa (FUCOFA)',          'VACUNA',      0,  1800, 'Campaña FUCOFA'),
    ('op-bruce',    'Brucelosis (FUCOFA)',      'VACUNA',      0,  1500, 'Terneras 3-8 meses'),
    ('op-mancha',   'Mancha y gangrena',        'VACUNA',      21, 900,  null),
    ('op-lepto',    'Leptospirosis',            'VACUNA',      21, 1100, null),
    ('op-repro',    'Reproductiva (IBR-DVB)',   'VACUNA',      21, 2200, null),
    ('op-ivermec',  'Ivermectina 3,15%',        'TRATAMIENTO', 122, 1300, 'Antiparasitario'),
    ('op-tristeza', 'Tristeza (Babesia/Anaplasma)', 'VACUNA',  0,  2600, null),
    ('op-iatf',     'Protocolo IATF',           'IATF',        0,  9500, 'Dispositivo + hormonas');

  insert into public.operation_logs (lote_id, operation_id, fecha_aplicacion, fecha_fin_carencia, dosis, responsable, acta_numero) values
    ('lote-cria',   'op-aftosa',  hoy - 150 * d, null,             1, 'Vet. FUCOFA', 'FUCOFA-2026-1187'),
    ('lote-recria', 'op-aftosa',  hoy - 150 * d, null,             1, 'Vet. FUCOFA', 'FUCOFA-2026-1187'),
    ('lote-cria',   'op-mancha',  hoy - 60 * d,  hoy - 39 * d,     1, 'Encargado',   null),
    ('lote-recria', 'op-ivermec', hoy - 10 * d,  hoy + 112 * d,    1, 'Encargado',   null),
    ('lote-cria',   'op-repro',   hoy - 200 * d, hoy - 179 * d,    1, 'Veterinario', null);

  insert into public.scheduled_operations (operation_id, lote_id, fecha_programada, estado) values
    ('op-aftosa',   'lote-cria',   hoy + 8 * d,   'PENDIENTE'),
    ('op-aftosa',   'lote-recria', hoy + 8 * d,   'PENDIENTE'),
    ('op-bruce',    'lote-cria',   hoy + 25 * d,  'PENDIENTE'),
    ('op-lepto',    'lote-cria',   hoy + 45 * d,  'PENDIENTE'),
    ('op-tristeza', 'lote-recria', hoy + 70 * d,  'PENDIENTE'),
    ('op-repro',    'lote-cria',   hoy + 160 * d, 'PENDIENTE'),
    ('op-mancha',   'lote-cria',   hoy - 60 * d,  'COMPLETADO');

  -- IATF y servicio natural
  insert into public.protocolos_iatf (id, nombre, lote_id, fecha_inicio, estado) values
    ('prot-1', 'IATF vaquillonas 2026', 'lote-recria', hoy - 5 * d, 'ACTIVO');
  insert into public.etapas_protocolo (protocolo_id, nombre, dias_desde_inicio, completada, fecha_completada) values
    ('prot-1', 'Día 0: dispositivo + BE', 0, true, hoy - 5 * d),
    ('prot-1', 'Día 8: retiro + PGF + eCG', 8, false, null),
    ('prot-1', 'Día 10: inseminación', 10, false, null),
    ('prot-1', 'Día 40: ecografía', 40, false, null);
  insert into public.servicios (temporada, lote_id, toros, vientres, fecha_entrada, fecha_salida) values
    ('2025-26', 'lote-cria', array['an-0241', 'an-0242', 'an-0243', 'an-0244'], 135, hoy - 300 * d, hoy - 210 * d);
  insert into public.revisacion_toros (animal_id, fecha, apto, sanitaria, circunferencia_escrotal_cm) values
    ('an-0241', hoy - 320 * d, true,  'Negativo Trich/Campy', 38),
    ('an-0242', hoy - 320 * d, true,  'Negativo Trich/Campy', 36),
    ('an-0243', hoy - 320 * d, true,  'Negativo Trich/Campy', 37),
    ('an-0244', hoy - 320 * d, true,  'Negativo Trich/Campy', 35),
    ('an-0245', hoy - 320 * d, false, 'Pendiente', 31);

  -- Nutrición
  insert into public.suplementos (id, nombre, tipo, materia_seca_pct, proteina_bruta_pct, energia_mcal_kg, precio_por_tonelada, stock_kg, stock_minimo_kg, proveedor) values
    ('sup-maiz',  'Maíz partido',     'MAIZ',   88, 9,  3.1, 220000, 6500, 2000, 'Acopio Elía'),
    ('sup-heno',  'Rollo de moha',    'HENO',   85, 8,  1.9, 95000,  12000, 4000, 'Propio'),
    ('sup-sal',   'Sal común',        'OTRO',   99, 0,  0,   180000, 300,  500,  'Agro Concepción'),
    ('sup-fosf',  'Fosfato bicálcico','OTRO',   98, 0,  0,   1450000, 150, 100,  'Agro Concepción'),
    ('sup-urea',  'Urea',             'UREA',   99, 280, 0,  850000, 400,  100,  'Agro Concepción');
  insert into public.raciones (id, nombre, descripcion, activa) values
    ('rac-sal',   'Sal mineral cría', 'Sal + fosfato 70/30', true),
    ('rac-recria','Suplemento recría', 'Maíz + urea', true);
  insert into public.racion_ingredientes (racion_id, suplemento_id, porcentaje) values
    ('rac-sal', 'sup-sal', 70), ('rac-sal', 'sup-fosf', 30),
    ('rac-recria', 'sup-maiz', 98), ('rac-recria', 'sup-urea', 2);
  insert into public.potrero_feeding_logs (potrero_id, racion_id, cantidad_kg, fecha)
    select (array['pot-3', 'pot-4'])[1 + k % 2], 'rac-recria', 180, hoy - k * d from generate_series(1, 30) k;
  insert into public.potrero_feeding_logs (potrero_id, racion_id, cantidad_kg, fecha)
    select (array['pot-1', 'pot-2'])[1 + k % 2], 'rac-sal', 25, hoy - k * 7 * d from generate_series(1, 8) k;

  -- Precios de referencia (ARS/kg vivo) y dólar: 5 años mensuales con inflación y
  -- estacionalidad (el ternero sube en otoño, cuando hay menos oferta).
  insert into public.precios_mercado (fecha, novillo_kg, ternero_kg, vaca_kg, vaca_descarte_kg, ternera_kg, vaquillona_kg, toro_kg, dolar_oficial, dolar_mep, fuente)
    select f, n, t, n * 0.72, n * 0.62, t * 0.94, n * 1.03, n * 0.66, dol, dol * 1.04, 'MANUAL'
      from (
        select hoy - k * 30 * d as f,
               2900 * power(0.975, k) as n,
               2900 * power(0.975, k) * (1.22 + 0.06 * sin(2 * pi() * (extract(month from to_timestamp((hoy - k * 30 * d) / 1000)) - 2) / 12)) as t,
               1450 * power(0.977, k) as dol
          from generate_series(0, 59) k
      ) x;

  -- Movimientos financieros de 12 meses
  insert into public.movimientos_financieros (tipo, categoria, lote_id, monto, fecha, descripcion)
    select 'GASTO', c.cat, c.lote, c.monto * (1 + (k % 3) * 0.1), hoy - k * 30 * d, c.descr
      from generate_series(0, 11) k,
      (values ('SANIDAD', 'lote-cria', 380000, 'Insumos veterinarios'),
              ('NUTRICION', 'lote-recria', 650000, 'Maíz y urea'),
              ('ALQUILER', 'lote-recria', 400000, 'Alquiler campo sur'),
              ('MANO_OBRA', null, 1200000, 'Sueldo encargado'),
              ('MANTENIMIENTO', null, 250000, 'Alambrados y aguadas'),
              ('IMPUESTOS', null, 180000, 'Inmobiliario rural')) as c(cat, lote, monto, descr);
  insert into public.movimientos_financieros (tipo, categoria, lote_id, monto, fecha, descripcion, cabezas, kg, categoria_animal, dte_numero, renspa_destino, dte_estado, fecha_cobro, cobrado) values
    ('INGRESO', 'VENTA', 'lote-recria', 9300000, hoy - 45 * d, 'Venta 10 novillitos', 10, 3100, 'Novillito', '07-2026-004512', '07.021.0.01234/00', 'EMITIDO', hoy - 15 * d, true),
    ('INGRESO', 'VENTA', 'lote-cria', 21600000, hoy - 200 * d, 'Venta terneros destete', 40, 7200, 'Ternero', '07-2026-001877', '07.021.0.04411/02', 'EMITIDO', hoy - 170 * d, true),
    ('INGRESO', 'VENTA', 'lote-cria', 6300000, hoy - 20 * d, 'Venta vacas descarte (plazo 60 días)', 8, 3600, 'Vaca Descarte', '07-2026-004890', '07.033.0.00087/01', 'EMITIDO', hoy + 40 * d, false),
    ('GASTO', 'COMPRA', 'lote-toros', 4800000, hoy - 330 * d, 'Compra toro Angus', 1, 780, 'Toro', '07-2025-009921', null, 'EMITIDO', null, null);

  -- Última acta SIGSA (para conciliar)
  insert into public.sigsa_stock (fecha, categoria, cabezas, fuente, acta_numero) values
    (hoy - 150 * d, 'Vaca', 119, 'ACTA', 'FUCOFA-2026-1187'),
    (hoy - 150 * d, 'Vaquillona', 30, 'ACTA', 'FUCOFA-2026-1187'),
    (hoy - 150 * d, 'Ternera', 35, 'ACTA', 'FUCOFA-2026-1187'),
    (hoy - 150 * d, 'Ternero', 35, 'ACTA', 'FUCOFA-2026-1187'),
    (hoy - 150 * d, 'Novillito', 20, 'ACTA', 'FUCOFA-2026-1187'),
    (hoy - 150 * d, 'Toro', 5, 'ACTA', 'FUCOFA-2026-1187');
end $$;
