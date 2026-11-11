-- GANPRO-APP / dashboard — actualizar una base existente (originales 01–04).
-- Generado desde las migraciones originales del PR #3, sin seed ni datos demo.
-- Antes: respaldo y prueba sobre una copia. Ejecutar TODO junto en SQL Editor.
-- Una sola transacción: cualquier error revierte los cambios de este script.
-- Si hay migraciones parcialmente aplicadas, se detiene sin adivinar ni borrar.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $ganpro_preflight$
DECLARE ident text;
BEGIN
 FOREACH ident IN ARRAY ARRAY['public.animals','public.lotes','public.potreros','public.eventos','public.animal_movements','public.perfiles','public.establecimiento','public.categorias_config','public.movimientos_financieros','public.operations_catalog','public.operation_logs','public.scheduled_operations','public.suplementos','public.raciones','public.racion_ingredientes','public.servicios','public.revisacion_toros','public.sigsa_stock','public.potrero_feeding_logs','public.sync_tombstones'] LOOP
  IF to_regclass(ident) IS NULL THEN RAISE EXCEPTION 'Falta la tabla base %. No se aplicó la actualización. No ejecute seed ni recree tablas; revise el esquema original.',ident; END IF;
 END LOOP;
 FOREACH ident IN ARRAY ARRAY['public.ganpro_rol()','public.ganpro_now_ms()','public.ganpro_sync_tables()','public.ganpro_sync_pull(bigint)','public.ganpro_sync_push(jsonb,bigint)','public.ganpro_crear_perfil()','public.ganpro_enable_sync(text)'] LOOP
  IF to_regprocedure(ident) IS NULL THEN RAISE EXCEPTION 'Falta la función base %. No se aplicó la actualización.',ident; END IF;
 END LOOP;
 FOREACH ident IN ARRAY ARRAY['public.command_receipts','public.command_audit','public.cuentas_caja','public.asientos_caja','public.cierres_caja','public.sync_clock','public.sync_push_receipts','public.insumos_campo','public.aplicacion_animales'] LOOP
  IF to_regclass(ident) IS NOT NULL THEN RAISE EXCEPTION 'Ya existe %. Puede haber actualizaciones completas o parciales. Este script no modificó nada: revise las migraciones aplicadas antes de continuar.',ident; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='movimientos_financieros' AND column_name IN('ledger_version','es_inventario')) OR (table_name='potreros' AND column_name='map_version') OR (table_name='animals' AND column_name IN('venta_movimiento_id','compra_movimiento_id')))) THEN
  RAISE EXCEPTION 'La base contiene columnas de una actualización parcial. No se modificó nada. Revise el estado antes de continuar.';
 END IF;
 IF (to_regclass('public.escenarios') IS NULL)<>(to_regclass('public.escenario_lineas') IS NULL) THEN RAISE EXCEPTION 'El módulo de proyecciones está aplicado parcialmente. No se modificó nada.'; END IF;
END
$ganpro_preflight$;

DO $ganpro_optional_05$
BEGIN
 IF to_regclass('public.escenarios') IS NULL THEN
  EXECUTE $ganpro_original_05$
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

$ganpro_original_05$;
 END IF;
END
$ganpro_optional_05$;

-- 20261109000006_commands_ledger.sql / SHA256 00726657d4c5ddd2e08a2e29dceedad0d4af46f091987f70b521b80f2cb4c0cf
-- Ganpro is a shared establishment (id=1), not an organization model from another application.
CREATE TABLE public.command_receipts (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 command text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.command_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid,
 source text NOT NULL, table_name text NOT NULL, record_id text NOT NULL,
 previous jsonb, next jsonb, command_key text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.command_audit(table_name, record_id, created_at);
CREATE TABLE public.cuentas_caja (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, nombre text NOT NULL UNIQUE,
 saldo_inicial numeric(16,2) NOT NULL, fecha_apertura bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.asientos_caja (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id) ON DELETE RESTRICT,
 movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT,
 transferencia_id uuid, reversa_de text UNIQUE REFERENCES public.asientos_caja(id) ON DELETE RESTRICT,
 monto numeric(16,2) NOT NULL CHECK(monto<>0), fecha bigint NOT NULL,
 motivo text, actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.asientos_caja(movimiento_id,fecha);
CREATE INDEX ON public.asientos_caja(cuenta_id,fecha);
CREATE TABLE public.cierres_caja (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hasta bigint NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.movimientos_financieros
 ADD COLUMN ledger_version int NOT NULL DEFAULT 0 CHECK(ledger_version IN(0,1)),
 ADD COLUMN vencimiento bigint, ADD COLUMN contraparte text,
 ADD COLUMN centro_costo text, ADD COLUMN anulado_en bigint,
 ADD COLUMN animal_ids text[],
 ADD COLUMN saldo_previo_conciliado numeric(16,2) NOT NULL DEFAULT 0,
 ADD COLUMN adopcion_fecha bigint;
ALTER TABLE public.animals ADD COLUMN venta_movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT,
 ADD COLUMN compra_movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT;
ALTER TABLE public.potreros ADD COLUMN map_version int NOT NULL DEFAULT 0,
 ADD COLUMN perimetro_m numeric(14,2), ADD COLUMN tipo_potrero text NOT NULL DEFAULT 'SIN_DATOS',
 ADD COLUMN capacidad_cabezas int CHECK(capacidad_cabezas>=0),
 ADD COLUMN estado_forraje text NOT NULL DEFAULT 'SIN_DATOS',
 ADD COLUMN agua boolean, ADD COLUMN sombra boolean,
 ADD COLUMN notas text;
-- Never infer historic payments or change mobile timestamps on legacy movements.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['command_receipts','command_audit','cuentas_caja','asientos_caja','cierres_caja'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  IF t<>'command_receipts' THEN
   EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (public.ganpro_rol() IS NOT NULL)',t);
  END IF;
 END LOOP;
END $$;
GRANT SELECT ON public.command_audit,public.cuentas_caja,public.asientos_caja,public.cierres_caja TO authenticated;

-- 20261109000007_lock_audit.sql / SHA256 34efc3fac9cfcb8a1f238f712e80d331064cf8c3f4e7887b3eca4329ebcce3f4
CREATE FUNCTION public.ganpro_lock() RETURNS void LANGUAGE sql AS $$ SELECT pg_advisory_xact_lock(20261109,1) $$;
CREATE FUNCTION public.ganpro_lock_statement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.ganpro_lock(); RETURN NULL; END $$;
CREATE FUNCTION public.ganpro_audit_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.command_audit(actor_id,source,table_name,record_id,previous,next,command_key)
 VALUES(auth.uid(),coalesce(nullif(current_setting('ganpro.command',true),''),'sync-or-rest'),TG_TABLE_NAME,
 coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id',to_jsonb(NEW)->>'categoria',to_jsonb(OLD)->>'categoria'),
 CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD)-'server_created_at'-'server_updated_at' ELSE NULL END,
 CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW)-'server_created_at'-'server_updated_at' ELSE NULL END,
 nullif(current_setting('ganpro.command_key',true),''));
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['animals','animal_movements','eventos','operation_logs','movimientos_financieros','potreros','lotes','cuentas_caja','asientos_caja','cierres_caja'] LOOP
  EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  EXECUTE format('CREATE TRIGGER ganpro_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ganpro_audit_row()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.ganpro_assert_open(p_date bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_date IS NULL OR p_date<=0 OR p_date>public.ganpro_now_ms()+86400000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.cierres_caja WHERE hasta>=p_date) THEN RAISE EXCEPTION 'GANPRO_CLOSED_PERIOD'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_lock(),public.ganpro_lock_statement(),public.ganpro_audit_row(),public.ganpro_assert_open(bigint) FROM PUBLIC;
-- User RPC helpers call this with owner privileges; authenticated REST is still protected by RLS.

-- 20261109000008_stock_integrity.sql / SHA256 05230c0c9515f2670f175c9bf235c2e3dc26d2fa40cfadd3cf231d35d6d45e0c
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.animals WHERE estado NOT IN('VENDIDO','MUERTO') GROUP BY upper(trim(id_caravana)) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM public.animals WHERE nullif(trim(rfid),'') IS NOT NULL GROUP BY trim(rfid) HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Reconcile duplicate visual/RFID identities before migrating; no data was merged';
 END IF;
END $$;
CREATE UNIQUE INDEX animals_visual_identity ON public.animals(upper(trim(id_caravana))) WHERE estado NOT IN('VENDIDO','MUERTO');
CREATE UNIQUE INDEX animals_rfid_identity ON public.animals(trim(rfid)) WHERE nullif(trim(rfid),'') IS NOT NULL;
CREATE FUNCTION public.ganpro_validate_animal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_sex text; BEGIN
 IF nullif(trim(NEW.id_caravana),'') IS NULL OR NEW.sexo NOT IN('M','H') OR NEW.estado NOT IN('ACTIVO','VENDIDO','MUERTO','DESCARTE')
 OR (NEW.peso_actual IS NOT NULL AND (NEW.peso_actual<=0 OR NEW.peso_actual>9999 OR NEW.peso_actual='NaN'::float8)) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT sexo INTO expected_sex FROM public.categorias_config WHERE categoria=NEW.categoria;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF expected_sex IS NOT NULL AND expected_sex<>NEW.sexo THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
 IF coalesce(current_setting('ganpro.command',true),'')<>'sync' AND (NEW.lote_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=NEW.lote_id)
 OR NEW.potrero_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=NEW.potrero_id)) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF TG_OP='UPDATE' AND NEW.estado<>OLD.estado AND coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void','sync') THEN
  RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL';
 END IF;
 NEW.id_caravana=upper(trim(NEW.id_caravana)); NEW.rfid=nullif(trim(NEW.rfid),'');
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_validate_animal BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_validate_animal();
-- Visual identifiers are reserved while in stock; sold/dead history keeps its original number.
-- NOT VALID preserves pre-existing orphans for explicit reconciliation while protecting all new writes.
ALTER TABLE public.animals ADD CONSTRAINT animal_lot_ref FOREIGN KEY(lote_id) REFERENCES public.lotes(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.animals ADD CONSTRAINT animal_paddock_ref FOREIGN KEY(potrero_id) REFERENCES public.potreros(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.eventos ADD CONSTRAINT event_animal_ref FOREIGN KEY(animal_id) REFERENCES public.animals(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.animal_movements ADD CONSTRAINT movement_animal_ref FOREIGN KEY(animal_id) REFERENCES public.animals(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
REVOKE ALL ON FUNCTION public.ganpro_validate_animal() FROM PUBLIC;

-- 20261109000009_batch.sql / SHA256 c840263f432419a9ee6c7cf1c42f4fa073b80a4131b4e07595aa2f01ef81f551
CREATE FUNCTION public.ganpro_apply_batch(p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; t text; d jsonb; cols text; sets text; affected int; version bigint; BEGIN
 IF jsonb_typeof(p_data)<>'array' OR jsonb_array_length(p_data)>2000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_data) LOOP
  t=item->>'table'; d=item->'data';
  IF t<>ALL(ARRAY['operation_logs','scheduled_operations','operations_catalog','condicion_corporal','protocolos_iatf','etapas_protocolo','servicios','revisacion_toros','suplementos','raciones','racion_ingredientes','potrero_feeding_logs','sigsa_stock','escenarios','escenario_lineas','precios_mercado']) THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  IF item->>'mode'='delete' THEN
   IF t='animals' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING item->>'id';
  ELSIF item->>'mode' IN('insert','update') AND jsonb_typeof(d)='object' THEN
   IF d ?| ARRAY['server_created_at','server_updated_at','synced_at'] THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   SELECT string_agg(format('%I',key),',') INTO cols FROM jsonb_object_keys(d) key;
   IF cols IS NULL OR length(cols)>3000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   IF item->>'mode'='insert' THEN
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1)',t,cols,cols,t) USING d;
   ELSE
    IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
    IF t='animals' AND NOT item ? 'expected' THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
    IF item ? 'expected' THEN
     EXECUTE format('SELECT server_updated_at FROM public.%I WHERE id=$1',t) INTO version USING item->>'id';
     IF version IS DISTINCT FROM (item->>'expected')::bigint THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
    END IF;
    SELECT string_agg(format('%I=r.%I',key,key),',') INTO sets FROM jsonb_object_keys(d) key;
    EXECUTE format('UPDATE public.%I x SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE x.id=$2',t,sets,t) USING d,item->>'id';
    GET DIAGNOSTICS affected=ROW_COUNT;
    IF affected<>1 THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
   END IF;
  ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 END LOOP;
 RETURN jsonb_build_object('message','Guardado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_apply_batch(jsonb) FROM PUBLIC;

-- 20261109000010_stock_save.sql / SHA256 5689e78098da91a4681412e13e0dca7bb8446227b454bb9e762c07ecfab1184a
CREATE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.animals; previous public.animals; ident text:=coalesce(nullif(d->>'id',''),gen_random_uuid()::text); ts bigint:=public.ganpro_now_ms(); BEGIN
 SELECT * INTO previous FROM public.animals WHERE id=ident;
 IF FOUND THEN
  IF NOT d ? 'expected_version' OR previous.server_updated_at<>(d->>'expected_version')::bigint THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  IF coalesce(d->>'estado',previous.estado)<>previous.estado THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  UPDATE public.animals SET id_caravana=d->>'id_caravana',rfid=nullif(d->>'rfid',''),sexo=d->>'sexo',categoria=d->>'categoria',
   raza=nullif(d->>'raza',''),fecha_nacimiento=(d->>'fecha_nacimiento')::bigint,peso_actual=(d->>'peso_actual')::float8,
   lote_id=nullif(d->>'lote_id',''),potrero_id=nullif(d->>'potrero_id','') WHERE id=ident RETURNING * INTO a;
 ELSE
  IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
  INSERT INTO public.animals(id,id_caravana,rfid,sexo,categoria,raza,fecha_nacimiento,peso_actual,lote_id,potrero_id)
  VALUES(ident,d->>'id_caravana',nullif(d->>'rfid',''),d->>'sexo',d->>'categoria',nullif(d->>'raza',''),(d->>'fecha_nacimiento')::bigint,
   (d->>'peso_actual')::float8,nullif(d->>'lote_id',''),nullif(d->>'potrero_id','')) RETURNING * INTO a;
 END IF;
 IF a.fecha_nacimiento>ts THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF previous.id IS NOT NULL AND (a.lote_id IS DISTINCT FROM previous.lote_id OR a.potrero_id IS DISTINCT FROM previous.potrero_id) THEN
  IF previous.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  INSERT INTO public.animal_movements(animal_id,lote_origen_id,lote_destino_id,potrero_origen_id,potrero_destino_id,fecha)
  VALUES(ident,previous.lote_id,a.lote_id,previous.potrero_id,a.potrero_id,ts);
 END IF;
 IF a.peso_actual IS NOT NULL AND a.peso_actual IS DISTINCT FROM previous.peso_actual THEN
  INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(ident,'PESAJE',a.peso_actual,ts);
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Animal guardado');
END $$;
CREATE FUNCTION public.ganpro_stock_recat(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; a public.animals; cfg public.categorias_config; BEGIN
 IF jsonb_array_length(d)>1000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
  SELECT * INTO a FROM public.animals WHERE id=item->>'id' AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  SELECT * INTO cfg FROM public.categorias_config WHERE categoria=a.categoria;
  IF cfg.recategoriza_a IS DISTINCT FROM item->>'categoria' OR a.fecha_nacimiento IS NULL
   OR (public.ganpro_now_ms()-a.fecha_nacimiento)/86400000.0/30.4375<cfg.edad_recategorizacion_meses THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.animals SET categoria=cfg.recategoriza_a WHERE id=a.id;
  INSERT INTO public.eventos(animal_id,tipo,notas,timestamp) VALUES(a.id,'RECATEGORIZACION',a.categoria||' → '||cfg.recategoriza_a,public.ganpro_now_ms());
 END LOOP;
 RETURN jsonb_build_object('message','Recategorización guardada');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_save(jsonb),public.ganpro_stock_recat(jsonb) FROM PUBLIC;

-- 20261109000011_stock_import.sql / SHA256 59c4c4dfa6e193170821024de27b73acc7094b53dbf2b5b860ae8e4566bf202a
CREATE FUNCTION public.ganpro_stock_import(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; a public.animals; aid text; bid text; nuevos int:=0; pesadas int:=0; ts bigint; BEGIN
 IF jsonb_typeof(d->'filas')<>'array' OR jsonb_array_length(d->'filas')>2000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'filas') x WHERE nullif(x->>'caravana','') IS NOT NULL GROUP BY upper(trim(x->>'caravana')) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'filas') x WHERE nullif(x->>'rfid','') IS NOT NULL GROUP BY trim(x->>'rfid') HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_TAG'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'filas') LOOP
  aid=NULL; bid=NULL;
  SELECT id INTO aid FROM public.animals WHERE rfid=nullif(item->>'rfid','');
  SELECT id INTO bid FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(item->>'caravana'));
  IF aid IS NOT NULL AND bid IS NOT NULL AND aid<>bid THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  aid=coalesce(aid,bid); ts=coalesce((item->>'fecha')::bigint,public.ganpro_now_ms());
  IF ts>public.ganpro_now_ms()+86400000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF aid IS NULL THEN
   aid=gen_random_uuid()::text;
   INSERT INTO public.animals(id,id_caravana,rfid,sexo,categoria,raza,peso_actual,lote_id,potrero_id)
   VALUES(aid,coalesce(nullif(item->>'caravana',''),'RFID-'||(item->>'rfid')),nullif(item->>'rfid',''),
    coalesce(item->>'sexo',d->>'sexo'),coalesce(item->>'categoria',d->>'categoria'),item->>'raza',(item->>'peso')::float8,d->>'lote_id',d->>'potrero_id');
   nuevos=nuevos+1;
  ELSE
   SELECT * INTO a FROM public.animals WHERE id=aid;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=aid AND tipo='PESAJE' AND timestamp>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF item->>'peso' IS NOT NULL THEN UPDATE public.animals SET peso_actual=(item->>'peso')::float8 WHERE id=aid; END IF;
  END IF;
  IF item->>'peso' IS NOT NULL THEN
   INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(aid,'PESAJE',(item->>'peso')::float8,ts); pesadas=pesadas+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('message',nuevos||' animales nuevos, '||pesadas||' pesadas registradas');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_import(jsonb) FROM PUBLIC;

-- 20261109000012_finance_helpers.sql / SHA256 f554ff990811a1d4d07af6b65d36c50fb5324bbc29dc1c3f0654f1847abf6387
CREATE FUNCTION public.ganpro_money(v text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF v IS NULL OR v !~ '^\d{1,12}(\.\d{1,2})?$' OR v::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 RETURN v::numeric(16,2);
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_assert_open(p_date bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_date IS NULL OR p_date<=0 OR (to_timestamp(p_date/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>
 (clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.cierres_caja WHERE hasta>=p_date) THEN RAISE EXCEPTION 'GANPRO_CLOSED_PERIOD'; END IF;
END $$;
CREATE FUNCTION public.ganpro_paid(p_id text,p_until bigint DEFAULT 9223372036854775807) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT saldo_previo_conciliado FROM public.movimientos_financieros WHERE id=p_id AND coalesce(adopcion_fecha,fecha)<p_until),0)+abs(coalesce((SELECT sum(monto) FROM public.asientos_caja WHERE movimiento_id=p_id AND fecha<p_until),0))
$$;
CREATE FUNCTION public.ganpro_finance_settle(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; account public.cuentas_caja; amount numeric:=public.ganpro_money(d->>'monto'); ts bigint:=(d->>'fecha')::bigint; ident text; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'movimiento_id' AND ledger_version=1 AND anulado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts<coalesce(doc.adopcion_fecha,doc.fecha) OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=doc.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 SELECT * INTO account FROM public.cuentas_caja WHERE id=d->>'cuenta_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF ts<account.fecha_apertura THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF amount>round(doc.monto::numeric,2)-public.ganpro_paid(doc.id) THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_BALANCE'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,movimiento_id,monto,fecha,actor_id)
 VALUES(account.id,doc.id,CASE WHEN doc.tipo='INGRESO' THEN amount ELSE -amount END,ts,auth.uid()) RETURNING id INTO ident;
 UPDATE public.movimientos_financieros SET cobrado=public.ganpro_paid(doc.id)>=round(doc.monto::numeric,2),fecha_cobro=ts WHERE id=doc.id;
 RETURN jsonb_build_object('id',ident,'message','Cobro / pago registrado');
END $$;
CREATE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL OR nullif(trim(d->>'contraparte'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]')))) RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_money(text),public.ganpro_paid(text,bigint),public.ganpro_finance_settle(jsonb),public.ganpro_finance_document(jsonb) FROM PUBLIC;

-- 20261109000013_cash_operations.sql / SHA256 fb0a395f1ee2ecc60506a2fe8d894b226c150dd7167f0707dae30ad19c5c73e9
CREATE FUNCTION public.ganpro_cash_account(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF nullif(trim(d->>'nombre'),'') IS NULL OR d->>'saldo_inicial' !~ '^-?\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.cuentas_caja(nombre,saldo_inicial,fecha_apertura) VALUES(trim(d->>'nombre'),(d->>'saldo_inicial')::numeric,ts) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Cuenta abierta');
END $$;
CREATE FUNCTION public.ganpro_cash_transfer(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident uuid:=gen_random_uuid(); ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'origen_id'=d->>'destino_id' OR (SELECT count(*) FROM public.cuentas_caja WHERE id IN(d->>'origen_id',d->>'destino_id'))<>2 THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF EXISTS(SELECT 1 FROM public.cuentas_caja WHERE id IN(d->>'origen_id',d->>'destino_id') AND fecha_apertura>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,transferencia_id,monto,fecha,actor_id) VALUES
 (d->>'origen_id',ident,-amount,ts,auth.uid()),(d->>'destino_id',ident,amount,ts,auth.uid());
 RETURN jsonb_build_object('id',ident,'message','Transferencia registrada');
END $$;
CREATE FUNCTION public.ganpro_cash_reverse(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE original public.asientos_caja; ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO original FROM public.asientos_caja WHERE id=d->>'id';
 IF NOT FOUND OR original.reversa_de IS NOT NULL OR original.transferencia_id IS NOT NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 PERFORM public.ganpro_assert_open(original.fecha);
 IF ts<original.fecha OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=original.movimiento_id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF EXISTS(SELECT 1 FROM public.asientos_caja WHERE reversa_de=original.id) THEN RAISE EXCEPTION 'GANPRO_ALREADY_REVERSED'; END IF;
 IF nullif(trim(d->>'motivo'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,movimiento_id,reversa_de,monto,fecha,motivo,actor_id)
 VALUES(original.cuenta_id,original.movimiento_id,original.id,-original.monto,ts,d->>'motivo',auth.uid()) RETURNING id INTO ident;
 UPDATE public.movimientos_financieros SET cobrado=false WHERE id=original.movimiento_id;
 RETURN jsonb_build_object('id',ident,'message','Cobro / pago revertido');
END $$;
CREATE FUNCTION public.ganpro_cash_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ts bigint:=(d->>'fecha')::bigint; last_ms bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>=(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 last_ms=extract(epoch FROM (((to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000-1;
 INSERT INTO public.cierres_caja(hasta,actor_id) VALUES(last_ms,auth.uid());
 RETURN jsonb_build_object('message','Período cerrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_cash_account(jsonb),public.ganpro_cash_transfer(jsonb),public.ganpro_cash_reverse(jsonb),public.ganpro_cash_close(jsonb) FROM PUBLIC;

-- 20261109000014_stock_movement.sql / SHA256 80cf10ccc528a54016c85fc4f1ff81ed849538a1751eaca121adf1cea92fb284
CREATE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE kind text:=d->>'tipo'; ts bigint:=(d->>'fecha')::bigint; tag text; tags text[];
 a public.animals; ids text[]:='{}'; cat text; sex text; amount jsonb; plan public.escenario_lineas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF kind IS NULL OR kind NOT IN('VENTA','COMPRA','MUERTE','NACIMIENTO','TRASLADO') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'caravanas');
 IF coalesce(cardinality(tags),0)=0 OR cardinality(tags)>1000 OR EXISTS(SELECT 1 FROM unnest(tags) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'lote_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_destino_id')
 OR d->>'potrero_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=d->>'potrero_destino_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF kind IN('VENTA','COMPRA') THEN PERFORM public.ganpro_money(d->>'monto'); END IF;
 IF kind='VENTA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'escenario_linea_id' IS NOT NULL THEN
  SELECT * INTO plan FROM public.escenario_lineas WHERE id=d->>'escenario_linea_id';
  IF NOT FOUND OR plan.movimiento_id IS NOT NULL OR plan.tipo<>kind OR plan.cabezas<>cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 FOREACH tag IN ARRAY tags LOOP
  IF kind IN('COMPRA','NACIMIENTO') THEN
   sex=coalesce(d->>'sexo','H'); cat=coalesce(d->>'categoria',CASE WHEN sex='M' THEN 'Ternero' ELSE 'Ternera' END);
   IF kind='NACIMIENTO' AND cat NOT IN('Ternero','Ternera') THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
   INSERT INTO public.animals(id_caravana,sexo,categoria,estado,fecha_nacimiento,peso_actual,lote_id,potrero_id)
   VALUES(tag,sex,cat,'ACTIVO',CASE WHEN kind='NACIMIENTO' THEN ts END,
   (d->>'kg')::float8/cardinality(tags),d->>'lote_destino_id',d->>'potrero_destino_id') RETURNING * INTO a;
   INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   IF a.peso_actual IS NOT NULL THEN INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(a.id,'PESAJE',a.peso_actual,ts); END IF;
  ELSE
   SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=tag;
   IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF a.fecha_nacimiento>ts OR EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND timestamp>ts) OR EXISTS(SELECT 1 FROM public.animal_movements WHERE animal_id=a.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF kind='TRASLADO' THEN
    IF d->>'lote_destino_id' IS NULL AND d->>'potrero_destino_id' IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
    INSERT INTO public.animal_movements(animal_id,potrero_origen_id,potrero_destino_id,lote_origen_id,lote_destino_id,fecha)
    VALUES(a.id,a.potrero_id,coalesce(d->>'potrero_destino_id',a.potrero_id),a.lote_id,coalesce(d->>'lote_destino_id',a.lote_id),ts);
    UPDATE public.animals SET potrero_id=coalesce(d->>'potrero_destino_id',potrero_id),lote_id=coalesce(d->>'lote_destino_id',lote_id) WHERE id=a.id;
   ELSE
    IF kind='VENTA' AND EXISTS(SELECT 1 FROM public.operation_logs WHERE fecha_aplicacion<=ts AND fecha_fin_carencia>ts AND (animal_id=a.id OR (lote_id IS NOT NULL AND lote_id=a.lote_id))) THEN RAISE EXCEPTION 'GANPRO_WITHDRAWAL'; END IF;
    UPDATE public.animals SET estado=CASE WHEN kind='VENTA' THEN 'VENDIDO' ELSE 'MUERTO' END WHERE id=a.id;
    INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   END IF;
  END IF;
  ids=array_append(ids,a.id);
 END LOOP;
 IF kind IN('VENTA','COMPRA') THEN
  amount=public.ganpro_finance_document(d||jsonb_build_object('tipo',CASE WHEN kind='VENTA' THEN 'INGRESO' ELSE 'GASTO' END,'categoria',kind,
   'descripcion',coalesce(d->>'notas',kind||' '||cardinality(tags)||' cabezas'),'cabezas',cardinality(tags),'animal_ids',to_jsonb(ids),
   'categoria_animal',(SELECT CASE WHEN count(DISTINCT categoria)=1 THEN min(categoria) END FROM public.animals WHERE id=ANY(ids)),
   'lote_id',(SELECT CASE WHEN count(DISTINCT lote_id)=1 THEN min(lote_id) END FROM public.animals WHERE id=ANY(ids))));
  IF kind='VENTA' THEN UPDATE public.animals SET venta_movimiento_id=amount->>'id' WHERE id=ANY(ids);
  ELSE UPDATE public.animals SET compra_movimiento_id=amount->>'id' WHERE id=ANY(ids); END IF;
  IF plan.id IS NOT NULL THEN UPDATE public.escenario_lineas SET movimiento_id=amount->>'id' WHERE id=plan.id; END IF;
 END IF;
 RETURN jsonb_build_object('message',kind||': '||cardinality(tags)||' animales registrados','id',amount->>'id');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261109000015_finance_void.sql / SHA256 7345e6353c1b0c5be6f0cef88c371d0cdd9dde0b00869cb4183ed376cbd4e0e1
CREATE FUNCTION public.ganpro_finance_void(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; a public.animals; ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'id' AND ledger_version=1 AND anulado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 PERFORM public.ganpro_assert_open(coalesce(doc.adopcion_fecha,doc.fecha));
 IF doc.categoria IN('VENTA','COMPRA') AND coalesce(cardinality(doc.animal_ids),0)=0 THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 IF ts<coalesce(doc.adopcion_fecha,doc.fecha) OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=doc.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF public.ganpro_paid(doc.id)<>0 OR nullif(trim(d->>'motivo'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 FOREACH ident IN ARRAY coalesce(doc.animal_ids,'{}') LOOP
  SELECT * INTO a FROM public.animals WHERE id=ident;
  IF NOT FOUND OR (doc.categoria='VENTA' AND (a.estado<>'VENDIDO' OR a.venta_movimiento_id IS DISTINCT FROM doc.id)) OR (doc.categoria='COMPRA' AND (a.estado<>'ACTIVO' OR a.compra_movimiento_id IS DISTINCT FROM doc.id)) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF doc.categoria='COMPRA' THEN
   -- Retain identity and history: an annulled purchase is an exit, not a DELETE.
   UPDATE public.animals SET estado='DESCARTE',compra_movimiento_id=NULL WHERE id=a.id;
  ELSE UPDATE public.animals SET estado='ACTIVO',venta_movimiento_id=NULL WHERE id=a.id; END IF;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,valor,notas) VALUES(a.id,'ANULACION',ts,CASE WHEN doc.categoria='VENTA' THEN 1 ELSE -1 END,'Reversión de comprobante '||doc.id||': '||(d->>'motivo'));
 END LOOP;
 UPDATE public.movimientos_financieros SET anulado_en=ts WHERE id=doc.id;
 UPDATE public.escenario_lineas SET movimiento_id=NULL WHERE movimiento_id=doc.id;
 RETURN jsonb_build_object('message','Comprobante anulado con historial');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_void(jsonb) FROM PUBLIC;

-- 20261109000016_managed_guards.sql / SHA256 068db67bff8c6103c4d8e00de0fa4c0fdbceff8dbfe9dc7befb992f596f8f173
CREATE FUNCTION public.ganpro_guard_managed_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cmd text:=coalesce(current_setting('ganpro.command',true),''); BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.ledger_version=1 AND cmd NOT IN('stock.movement','finance.document') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.ledger_version=0 AND NEW.ledger_version=1 AND cmd<>'finance.adopt' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF OLD.ledger_version=1 THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF cmd NOT IN('finance.settle','finance.reverse','finance.void','stock.movement','finance.document') AND
   (to_jsonb(NEW)-ARRAY['server_updated_at','updated_at','dte_estado']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['server_updated_at','updated_at','dte_estado']) THEN
   RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF NEW.ledger_version<>OLD.ledger_version THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER ganpro_managed_document BEFORE INSERT OR UPDATE OR DELETE ON public.movimientos_financieros FOR EACH ROW EXECUTE FUNCTION public.ganpro_guard_managed_document();
CREATE FUNCTION public.ganpro_guard_document_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (TG_OP='INSERT' AND (NEW.venta_movimiento_id IS NOT NULL OR NEW.compra_movimiento_id IS NOT NULL)) OR
 (TG_OP='UPDATE' AND (NEW.venta_movimiento_id IS DISTINCT FROM OLD.venta_movimiento_id OR NEW.compra_movimiento_id IS DISTINCT FROM OLD.compra_movimiento_id)) THEN
  IF coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_document_links BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_guard_document_links();
REVOKE ALL ON FUNCTION public.ganpro_guard_managed_document(),public.ganpro_guard_document_links() FROM PUBLIC;

-- 20261109000017_polygon_measure.sql / SHA256 ab711b07c98a49b727a7808e2c173d455eb0b9682fa0324afae118ad2c699eb6
CREATE FUNCTION public.ganpro_segments_intersect(ax float8,ay float8,bx float8,by_ float8,cx float8,cy float8,dx float8,dy float8)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT greatest(least(ax,bx),least(cx,dx))<=least(greatest(ax,bx),greatest(cx,dx))+1e-12
 AND greatest(least(ay,by_),least(cy,dy))<=least(greatest(ay,by_),greatest(cy,dy))+1e-12
 AND ((bx-ax)*(cy-ay)-(by_-ay)*(cx-ax))*((bx-ax)*(dy-ay)-(by_-ay)*(dx-ax))<=1e-24
 AND ((dx-cx)*(ay-cy)-(dy-cy)*(ax-cx))*((dx-cx)*(by_-cy)-(dy-cy)*(bx-cx))<=1e-24
$$;
CREATE FUNCTION public.ganpro_measure_polygon(g jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE ring jsonb; n int; i int; j int; a jsonb; b jsonb; c jsonb; d jsonb;
 x float8; y float8; x2 float8; y2 float8; area float8:=0; perimeter float8:=0; h float8; minx float8:=180; maxx float8:=-180;
BEGIN
 IF g->>'type'<>'Polygon' OR jsonb_typeof(g->'coordinates')<>'array' OR jsonb_array_length(g->'coordinates')<>1 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 ring=g->'coordinates'->0; n=jsonb_array_length(ring);
 IF n<4 OR n>501 OR ring->0<>ring->(n-1) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 FOR i IN 0..n-2 LOOP
  a=ring->i; b=ring->(i+1);
  IF jsonb_typeof(a)<>'array' OR jsonb_array_length(a)<>2 OR jsonb_typeof(a->0)<>'number' OR jsonb_typeof(a->1)<>'number' THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  x=(a->>0)::float8; y=(a->>1)::float8; x2=(b->>0)::float8; y2=(b->>1)::float8;
  IF x NOT BETWEEN -180 AND 180 OR y NOT BETWEEN -85 AND 85 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  minx=least(minx,x); maxx=greatest(maxx,x);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(ring) WITH ORDINALITY q(point,idx) WHERE idx>i+1 AND idx<n AND point=a) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  area=area+radians(x2-x)*(2+sin(radians(y))+sin(radians(y2)));
  h=power(sin(radians(y2-y)/2),2)+cos(radians(y))*cos(radians(y2))*power(sin(radians(x2-x)/2),2);
  perimeter=perimeter+2*6371008.8*asin(least(1,sqrt(h)));
  IF i<n-3 THEN
   FOR j IN i+2..n-2 LOOP
    IF i=0 AND j=n-2 THEN CONTINUE; END IF;
    c=ring->j; d=ring->(j+1);
    IF public.ganpro_segments_intersect(x,y,x2,y2,(c->>0)::float8,(c->>1)::float8,(d->>0)::float8,(d->>1)::float8) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 area=abs(area*6371008.8*6371008.8/2)/10000;
 IF maxx-minx>180 OR area<0.01 OR area>1000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 RETURN jsonb_build_object('hectareas',round(area::numeric,2),'perimetro_m',round(perimeter::numeric,2));
END $$;
REVOKE ALL ON FUNCTION public.ganpro_segments_intersect(float8,float8,float8,float8,float8,float8,float8,float8),public.ganpro_measure_polygon(jsonb) FROM PUBLIC;

-- 20261109000018_map.sql / SHA256 e93b5461ee7141962f22adb87020d2cc7d16e0ae03e64b0bbbb2409e873316c9
CREATE FUNCTION public.ganpro_map_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); p public.potreros; measured jsonb; BEGIN
 SELECT * INTO p FROM public.potreros WHERE id=ident;
 IF FOUND AND ((d->>'expected_version')::int IS DISTINCT FROM p.map_version) THEN RAISE EXCEPTION 'GANPRO_MAP_CONFLICT'; END IF;
 IF NOT FOUND AND d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 measured=public.ganpro_measure_polygon(d->'geometry');
 IF p.id IS NULL THEN INSERT INTO public.potreros(id,nombre) VALUES(ident,d->>'nombre'); END IF;
 UPDATE public.potreros SET nombre=d->>'nombre',geo_json=(d->'geometry')::text,
 hectareas=(measured->>'hectareas')::float8,perimetro_m=(measured->>'perimetro_m')::numeric,
 tipo_potrero=coalesce(d->>'tipo_potrero','CAMPO_NATURAL'),recurso_forrajero=d->>'recurso_forrajero',
 capacidad_ev=(d->>'capacidad_ev')::float8,capacidad_cabezas=(d->>'capacidad_cabezas')::int,
 estado_forraje=coalesce(d->>'estado_forraje','REGULAR'),agua=(d->>'agua')::boolean,
 sombra=(d->>'sombra')::boolean,notas=d->>'notas',map_version=map_version+1 WHERE id=ident;
 RETURN measured||jsonb_build_object('id',ident,'message','Potrero guardado');
END $$;
CREATE FUNCTION public.ganpro_protect_map() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE measured jsonb; shape jsonb; BEGIN
 IF NEW.geo_json IS NOT NULL AND (TG_OP='INSERT' OR NEW.geo_json IS DISTINCT FROM OLD.geo_json OR NEW.hectareas IS DISTINCT FROM OLD.hectareas) THEN
  shape=NEW.geo_json::jsonb;
  IF shape->>'type'='Feature' THEN shape=shape->'geometry'; END IF;
  IF shape->>'type'='FeatureCollection' AND jsonb_array_length(shape->'features')=1 THEN shape=shape->'features'->0->'geometry'; END IF;
  measured=public.ganpro_measure_polygon(shape);
  NEW.hectareas=(measured->>'hectareas')::float8;NEW.perimetro_m=(measured->>'perimetro_m')::numeric;
 END IF;
 IF TG_OP='UPDATE' AND current_setting('ganpro.command',true) IS DISTINCT FROM 'map.save' AND to_jsonb(NEW)-ARRAY['updated_at','server_updated_at','server_created_at','map_version'] IS DISTINCT FROM to_jsonb(OLD)-ARRAY['updated_at','server_updated_at','server_created_at','map_version'] THEN NEW.map_version=OLD.map_version+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_protect_map BEFORE INSERT OR UPDATE ON public.potreros FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_map();
REVOKE ALL ON FUNCTION public.ganpro_map_save(jsonb),public.ganpro_protect_map() FROM PUBLIC;

-- 20261109000019_dispatcher.sql / SHA256 0caf0a5aabd1194c4a4fe3eaca3dcf3c48fde29004c448bc6580a17fc6d48263
CREATE FUNCTION public.ganpro_command(p_name text,p_key uuid,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cached public.command_receipts; result jsonb; fingerprint text; BEGIN
 PERFORM public.ganpro_lock();
 IF auth.uid() IS NULL OR coalesce(public.ganpro_rol(),'') NOT IN('admin','campo') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_key IS NULL OR p_data IS NULL OR octet_length(p_data::text)>4000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 fingerprint=encode(sha256(convert_to(p_name||':'||p_data::text,'UTF8')),'hex');
 SELECT * INTO cached FROM public.command_receipts WHERE id=p_key;
 IF FOUND THEN
  IF cached.actor_id<>auth.uid() OR cached.command<>p_name OR cached.fingerprint<>fingerprint THEN RAISE EXCEPTION 'GANPRO_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN cached.result;
 END IF;
 PERFORM set_config('ganpro.command',p_name,true);PERFORM set_config('ganpro.command_key',p_key::text,true);
 CASE p_name
 WHEN 'stock.save' THEN result=public.ganpro_stock_save(p_data);
 WHEN 'stock.recat' THEN result=public.ganpro_stock_recat(p_data);
 WHEN 'stock.import' THEN result=public.ganpro_stock_import(p_data);
 WHEN 'stock.movement' THEN result=public.ganpro_stock_movement(p_data);
 WHEN 'finance.adopt' THEN result=public.ganpro_finance_adopt(p_data);
 WHEN 'finance.document' THEN result=public.ganpro_finance_document(p_data);
 WHEN 'finance.settle' THEN result=public.ganpro_finance_settle(p_data);
 WHEN 'finance.account' THEN result=public.ganpro_cash_account(p_data);
 WHEN 'finance.transfer' THEN result=public.ganpro_cash_transfer(p_data);
 WHEN 'finance.reverse' THEN result=public.ganpro_cash_reverse(p_data);
 WHEN 'finance.close' THEN result=public.ganpro_cash_close(p_data);
 WHEN 'finance.void' THEN result=public.ganpro_finance_void(p_data);
 WHEN 'map.save' THEN result=public.ganpro_map_save(p_data);
 WHEN 'health.apply' THEN result=public.ganpro_health_apply(p_data);
 WHEN 'batch' THEN result=public.ganpro_apply_batch(p_data);
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END CASE;
 INSERT INTO public.command_receipts(id,actor_id,command,fingerprint,result) VALUES(p_key,auth.uid(),p_name,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_command(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_command(text,uuid,jsonb) TO authenticated;

-- 20261109000020_sync_clock.sql / SHA256 e51f4e7b933069b06bf6fc7dfddec5617866eb15c03acc74a91f26b829c20e25
CREATE TABLE public.sync_clock(id int PRIMARY KEY CHECK(id=1),last_ms bigint NOT NULL);
INSERT INTO public.sync_clock VALUES(1,0);
ALTER TABLE public.sync_clock ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.ganpro_next_sync_ms() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tick bigint; BEGIN
 PERFORM public.ganpro_lock();
 UPDATE public.sync_clock SET last_ms=greatest(public.ganpro_now_ms(),last_ms+1) WHERE id=1 RETURNING last_ms INTO tick;
 RETURN tick;
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_sync_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tick bigint:=public.ganpro_next_sync_ms(); BEGIN
 IF TG_OP='INSERT' THEN
  NEW.server_created_at=tick;NEW.created_at=coalesce(NEW.created_at,tick);NEW.updated_at=coalesce(NEW.updated_at,tick);
  DELETE FROM public.sync_tombstones WHERE table_name=TG_TABLE_NAME AND record_id=NEW.id;
 ELSE NEW.server_created_at=OLD.server_created_at;
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN NEW.updated_at=public.ganpro_now_ms(); END IF;
 END IF;
 NEW.server_updated_at=tick;RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_sync_tombstone() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.sync_tombstones(table_name,record_id,deleted_at) VALUES(TG_TABLE_NAME,OLD.id,public.ganpro_next_sync_ms())
 ON CONFLICT(table_name,record_id) DO UPDATE SET deleted_at=EXCLUDED.deleted_at;RETURN OLD;
END $$;
DO $$ DECLARE t text; maximum bigint; BEGIN
 FOREACH t IN ARRAY public.ganpro_sync_tables()||ARRAY['servicios','revisacion_toros','racion_ingredientes','sigsa_stock','escenarios','escenario_lineas'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||t)::regclass AND tgname='ganpro_lock_write') THEN
   EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  END IF;
  EXECUTE format('SELECT coalesce(max(server_updated_at),0) FROM public.%I',t) INTO maximum;
  UPDATE public.sync_clock SET last_ms=greatest(last_ms,maximum) WHERE id=1;
 END LOOP;
 SELECT coalesce(max(deleted_at),0) INTO maximum FROM public.sync_tombstones;
 UPDATE public.sync_clock SET last_ms=greatest(last_ms,maximum) WHERE id=1;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_next_sync_ms() FROM PUBLIC;

-- 20261109000021_sync_guard.sql / SHA256 4984618cd1c9b47d55c015203e00e7137f8910b6d70a8bd3a846fb29f61f1e79
CREATE TABLE public.sync_push_receipts(fingerprint text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.sync_push_receipts ENABLE ROW LEVEL SECURITY;
ALTER FUNCTION public.ganpro_sync_push(jsonb,bigint) RENAME TO ganpro_sync_push_v3;
ALTER FUNCTION public.ganpro_sync_pull(bigint) RENAME TO ganpro_sync_pull_v3;
REVOKE ALL ON FUNCTION public.ganpro_sync_push_v3(jsonb,bigint),public.ganpro_sync_pull_v3(bigint) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.ganpro_sync_pull(p_last_pulled_at bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; tick bigint; BEGIN
 PERFORM public.ganpro_lock();
 result=public.ganpro_sync_pull_v3(p_last_pulled_at);
 tick=public.ganpro_next_sync_ms();
 RETURN result||jsonb_build_object('timestamp',tick);
END $$;
CREATE FUNCTION public.ganpro_sync_push(p_changes jsonb,p_last_pulled_at bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; group_ jsonb; changes jsonb:='{}'; row_ jsonb; list_ jsonb; kind text;
 conflict boolean; v_fingerprint text:=encode(sha256(convert_to(p_changes::text||':'||p_last_pulled_at::text,'UTF8')),'hex'); BEGIN
 PERFORM public.ganpro_lock();
 IF jsonb_typeof(p_changes)<>'object' OR p_last_pulled_at<0 OR octet_length(p_changes::text)>4000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.sync_push_receipts WHERE sync_push_receipts.fingerprint=v_fingerprint) THEN RETURN; END IF;
 PERFORM set_config('ganpro.command','sync',true);
 FOR t,group_ IN SELECT key,value FROM jsonb_each(p_changes) LOOP
  IF t<>ALL(public.ganpro_sync_tables()) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  FOREACH kind IN ARRAY ARRAY['created','updated','deleted'] LOOP
   list_=coalesce(group_->kind,'[]');
   IF jsonb_typeof(list_)<>'array' OR jsonb_array_length(list_)>10000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   IF kind='deleted' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id IN(SELECT jsonb_array_elements_text($1)) AND server_updated_at>$2)',t) INTO conflict USING list_,p_last_pulled_at;
   ELSE
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I x JOIN jsonb_array_elements($1) e ON x.id=e->>''id'' WHERE $3 OR x.server_updated_at>$2)',t) INTO conflict USING list_,p_last_pulled_at,kind='created';
   END IF;
   IF conflict THEN RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001'; END IF;
   IF kind<>'deleted' THEN
    SELECT coalesce(jsonb_agg(value-ARRAY['venta_movimiento_id','compra_movimiento_id','ledger_version','animal_ids','map_version','perimetro_m','server_updated_at','server_created_at']),'[]') INTO list_ FROM jsonb_array_elements(list_);
   END IF;
   changes=jsonb_set(changes,ARRAY[t],coalesce(changes->t,'{}')||jsonb_build_object(kind,list_));
  END LOOP;
 END LOOP;
 PERFORM public.ganpro_sync_push_v3(changes,p_last_pulled_at);
 IF p_changes<>'{}' THEN INSERT INTO public.sync_push_receipts VALUES(v_fingerprint,now()); END IF;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_sync_push(jsonb,bigint),public.ganpro_sync_pull(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ganpro_sync_push(jsonb,bigint),public.ganpro_sync_pull(bigint) TO service_role;

-- 20261109000022_ledger_snapshot.sql / SHA256 fab0d72cfa35df8956e5bbb7c4f310ce87e00f115f4b6da2f2947112fc7a2b4c
CREATE FUNCTION public.ganpro_ledger_snapshot(p_month text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE start_ms bigint; end_ms bigint; cutoff bigint; accounts jsonb; docs jsonb; entries jsonb; totals jsonb; legacy jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 start_ms=extract(epoch FROM ((p_month||'-01')::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 end_ms=extract(epoch FROM (((p_month||'-01')::date+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 cutoff=least(end_ms,extract(epoch FROM (((clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'saldo',saldo::text,'fecha_apertura',fecha_apertura) ORDER BY nombre),'[]') INTO accounts
 FROM(SELECT c.*,c.saldo_inicial+coalesce((SELECT sum(monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND fecha<end_ms),0) saldo FROM public.cuentas_caja c WHERE fecha_apertura<end_ms) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'pendiente',(amount-paid)::text) ORDER BY fecha DESC,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'cuenta_id',cuenta_id,'movimiento_id',movimiento_id,'transferencia_id',transferencia_id,'reversa_de',reversa_de,'monto',a.monto::text,'fecha',a.fecha,'motivo',a.motivo) ORDER BY a.fecha DESC,a.created_at DESC),'[]') INTO entries FROM public.asientos_caja a WHERE a.fecha<end_ms;
 SELECT jsonb_build_object(
  'saldo',coalesce((SELECT sum((v->>'saldo')::numeric) FROM jsonb_array_elements(accounts) v),0)::text,
  'por_cobrar',coalesce(sum(amount-paid) FILTER(WHERE tipo='INGRESO'),0)::text,
  'por_pagar',coalesce(sum(amount-paid) FILTER(WHERE tipo='GASTO'),0)::text,
  'cobros_vencidos',coalesce(sum(amount-paid) FILTER(WHERE tipo='INGRESO' AND vencimiento<cutoff),0)::text,
  'pagos_vencidos',coalesce(sum(amount-paid) FILTER(WHERE tipo='GASTO' AND vencimiento<cutoff),0)::text
 ) INTO totals FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT totals||jsonb_build_object('cobros',coalesce(sum(monto) FILTER(WHERE monto>0),0)::text,'pagos',(-coalesce(sum(monto) FILTER(WHERE monto<0),0))::text,'flujo',coalesce(sum(monto),0)::text) INTO totals FROM public.asientos_caja WHERE fecha>=start_ms AND fecha<end_ms AND transferencia_id IS NULL;
 SELECT jsonb_build_object('cantidad',count(*),'monto',coalesce(sum(monto::numeric),0)::text,'filas',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT id,tipo,descripcion,fecha,monto::text FROM public.movimientos_financieros WHERE ledger_version=0 ORDER BY fecha DESC LIMIT 100) x)) INTO legacy FROM public.movimientos_financieros WHERE ledger_version=0;
 RETURN jsonb_build_object('mes',p_month,'cuentas',accounts,'documentos',docs,'asientos',entries,'totales',totals,'anteriores',legacy);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_ledger_snapshot(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_ledger_snapshot(text) TO authenticated;

-- 20261109000023_legacy_adoption.sql / SHA256 02adb015c2aa77cc2cf2bd02b6fcdec8494c401f5875cacfaa2fa954f8f2828b
CREATE FUNCTION public.ganpro_finance_adopt(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; ts bigint:=(d->>'fecha')::bigint; paid numeric; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'id' AND ledger_version=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF ts<doc.fecha OR nullif(trim(d->>'contraparte'),'') IS NULL OR d->>'conciliado' !~ '^\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 paid=(d->>'conciliado')::numeric;
 IF paid>round(doc.monto::numeric,2) OR doc.monto<=0 THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_BALANCE'; END IF;
 IF (d->>'vencimiento')::bigint<doc.fecha THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 UPDATE public.movimientos_financieros SET ledger_version=1,adopcion_fecha=ts,saldo_previo_conciliado=paid,
 contraparte=d->>'contraparte',vencimiento=(d->>'vencimiento')::bigint,cobrado=paid>=round(monto::numeric,2) WHERE id=doc.id;
 RETURN jsonb_build_object('id',doc.id,'message','Movimiento conciliado sin duplicar comprobantes ni crear caja');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_adopt(jsonb) FROM PUBLIC;

-- 20261109000024_health_roles.sql / SHA256 9f9253873d4e5db72f95d4072c997173ef1251b5b584f7437538c1697c6f5803
CREATE FUNCTION public.ganpro_health_apply(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE animal text; lot text; product public.operations_catalog; ts bigint:=(d->>'fecha')::bigint; BEGIN
 SELECT * INTO product FROM public.operations_catalog WHERE id=d->>'operation_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts IS NULL OR ts<=0 OR (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'destino'='animal' THEN
  SELECT id INTO animal FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(d->>'caravana')) AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 ELSIF d->>'destino'='lote' THEN
  SELECT id INTO lot FROM public.lotes WHERE id=d->>'lote_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot;
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_crear_perfil() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(20261109,2);
 INSERT INTO public.perfiles(id,email,nombre,rol) VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'nombre',split_part(NEW.email,'@',1)),CASE WHEN EXISTS(SELECT 1 FROM public.perfiles) THEN 'asesor' ELSE 'admin' END);
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_lock_profiles BEFORE INSERT OR UPDATE OR DELETE ON public.perfiles FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement();
CREATE FUNCTION public.ganpro_last_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.rol='admin' AND (TG_OP='DELETE' OR NEW.rol<>'admin') AND (SELECT count(*) FROM public.perfiles WHERE rol='admin')<=1 THEN RAISE EXCEPTION 'GANPRO_LAST_ADMIN'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER ganpro_last_admin BEFORE UPDATE OR DELETE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.ganpro_last_admin();
REVOKE ALL ON FUNCTION public.ganpro_health_apply(jsonb),public.ganpro_last_admin() FROM PUBLIC;

-- 20261110000025_operational_tables.sql / SHA256 8ab104d95e35fa65961c4f6c8bafbbdbfff8b026e88c37c96c7871aaab5dbd8f
ALTER TABLE public.operation_logs ADD COLUMN receptores_fijados boolean NOT NULL DEFAULT false,
 ADD COLUMN cantidad_animales int, ADD COLUMN costo_total numeric(16,2);
CREATE TABLE public.aplicacion_animales(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, aplicacion_id text NOT NULL REFERENCES public.operation_logs(id) ON DELETE RESTRICT,
 animal_id text NOT NULL REFERENCES public.animals(id) ON DELETE RESTRICT, UNIQUE(aplicacion_id,animal_id)
);
CREATE TABLE public.insumos_campo(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,nombre text NOT NULL,
 tipo text NOT NULL CHECK(tipo IN('ALIMENTO','MEDICAMENTO','OTRO')),unidad text NOT NULL CHECK(unidad IN('KG','DOSIS','UNIDAD','ML')),
 suplemento_id text UNIQUE REFERENCES public.suplementos(id),operation_id text UNIQUE REFERENCES public.operations_catalog(id),
 cantidad numeric(18,4) NOT NULL CHECK(cantidad>=0),valor numeric(16,2) NOT NULL CHECK(valor>=0),fecha_apertura bigint NOT NULL,
 CHECK((tipo='ALIMENTO' AND unidad='KG' AND suplemento_id IS NOT NULL) OR (tipo<>'ALIMENTO' AND suplemento_id IS NULL))
);
CREATE TABLE public.insumo_partidas(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,insumo_id text NOT NULL REFERENCES public.insumos_campo(id),
 nombre text NOT NULL,cantidad numeric(18,4) NOT NULL CHECK(cantidad>=0),caducidad bigint,UNIQUE(insumo_id,nombre)
);
CREATE TABLE public.insumo_movimientos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,insumo_id text NOT NULL REFERENCES public.insumos_campo(id),
 cantidad numeric(18,4) NOT NULL,valor numeric(16,2) NOT NULL,fecha bigint NOT NULL,
 origen text NOT NULL CHECK(origen IN('APERTURA','COMPRA','CONSUMO')),referencia_id text,
 lote_id text REFERENCES public.lotes(id),potrero_id text REFERENCES public.potreros(id),partida_id text REFERENCES public.insumo_partidas(id),motivo text
);
ALTER TABLE public.movimientos_financieros ADD COLUMN es_inventario boolean NOT NULL DEFAULT false;
ALTER TABLE public.potrero_feeding_logs ADD COLUMN costo_total numeric(16,2),ADD COLUMN snapshot_formula jsonb;
ALTER TABLE public.animals ADD COLUMN madre_id text REFERENCES public.animals(id),ADD COLUMN padre_id text REFERENCES public.animals(id);
CREATE TABLE public.repro_ciclos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,madre_id text NOT NULL REFERENCES public.animals(id),padre_id text REFERENCES public.animals(id),
 servicio_id text NOT NULL REFERENCES public.servicios(id),fecha_servicio bigint NOT NULL,
 estado text NOT NULL DEFAULT 'SERVIDA' CHECK(estado IN('SERVIDA','PRENADA','VACIA','PARIDA','DESTETADA','PERDIDA')),
 fecha_tacto bigint,fecha_parto bigint,ternero_id text UNIQUE REFERENCES public.animals(id),fecha_destete bigint,peso_destete numeric(10,2)
);
CREATE UNIQUE INDEX repro_cycle_open ON public.repro_ciclos(madre_id) WHERE estado NOT IN('VACIA','DESTETADA','PERDIDA');
CREATE TABLE public.planes_pastoreo(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,lote_id text NOT NULL REFERENCES public.lotes(id),potrero_id text NOT NULL REFERENCES public.potreros(id),
 entrada bigint NOT NULL,salida bigint NOT NULL CHECK(salida>entrada),descanso_dias int NOT NULL CHECK(descanso_dias BETWEEN 1 AND 365),
 forraje_kg_ms_ha numeric(12,2) NOT NULL CHECK(forraje_kg_ms_ha>0),remanente_kg_ms_ha numeric(12,2) NOT NULL CHECK(remanente_kg_ms_ha>=0),
 consumo_ev_dia numeric(10,2) NOT NULL CHECK(consumo_ev_dia>0),
 estado text NOT NULL DEFAULT 'PLANIFICADO' CHECK(estado IN('PLANIFICADO','EN_CURSO','COMPLETADO')),animales text[],entrada_real bigint,salida_real bigint
);
CREATE TABLE public.inventario_cierres(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,fecha bigint NOT NULL UNIQUE,cabezas int NOT NULL,kg numeric(18,2) NOT NULL,
 valor_animales numeric(18,2) NOT NULL,valor_insumos numeric(18,2) NOT NULL,animales jsonb NOT NULL,insumos jsonb NOT NULL,
 resultado jsonb,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.banco_extractos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id),desde bigint NOT NULL,hasta bigint NOT NULL,
 saldo_inicial numeric(16,2) NOT NULL,saldo_final numeric(16,2) NOT NULL,CHECK(hasta>=desde)
);
CREATE TABLE public.banco_lineas(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,extracto_id text NOT NULL REFERENCES public.banco_extractos(id),cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id),
 fecha bigint NOT NULL,referencia text NOT NULL,descripcion text NOT NULL,monto numeric(16,2) NOT NULL CHECK(monto<>0),
 asiento_id text UNIQUE REFERENCES public.asientos_caja(id),UNIQUE(cuenta_id,referencia)
);
CREATE TABLE public.documentos_comprobantes(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,movimiento_id text NOT NULL REFERENCES public.movimientos_financieros(id),
 nombre text NOT NULL,path text NOT NULL UNIQUE,sha256 text NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['aplicacion_animales','insumos_campo','insumo_partidas','insumo_movimientos','repro_ciclos','planes_pastoreo','inventario_cierres','banco_extractos','banco_lineas','documentos_comprobantes'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (public.ganpro_rol() IS NOT NULL)',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  EXECUTE format('CREATE TRIGGER ganpro_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ganpro_audit_row()',t);
 END LOOP;
END $$;
CREATE INDEX ON public.aplicacion_animales(animal_id);
CREATE INDEX ON public.insumo_movimientos(fecha,lote_id);

-- 20261110000026_treatment_recipients.sql / SHA256 94932506b1f6b63414beea6a7456ef46a620ac7d4f9af28f4c981ade030e1615
-- Reconstruct membership from recorded transfers, using the origin for the first future transfer.
CREATE FUNCTION public.ganpro_animals_at(ts bigint) RETURNS TABLE(id text,lote_id text,potrero_id text)
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT a.id,
 CASE WHEN past.id IS NOT NULL THEN past.lote_destino_id WHEN future.id IS NOT NULL THEN future.lote_origen_id ELSE a.lote_id END,
 CASE WHEN past.id IS NOT NULL THEN past.potrero_destino_id WHEN future.id IS NOT NULL THEN future.potrero_origen_id ELSE a.potrero_id END
 FROM public.animals a
 LEFT JOIN LATERAL(SELECT * FROM public.animal_movements m WHERE m.animal_id=a.id AND fecha<=ts ORDER BY fecha DESC,created_at DESC LIMIT 1) past ON true
 LEFT JOIN LATERAL(SELECT * FROM public.animal_movements m WHERE m.animal_id=a.id AND fecha>ts ORDER BY fecha,created_at LIMIT 1) future ON true
 LEFT JOIN LATERAL(SELECT tipo,valor FROM public.eventos e WHERE e.animal_id=a.id AND timestamp<=ts AND tipo IN('COMPRA','NACIMIENTO','VENTA','MUERTE','ANULACION') ORDER BY timestamp DESC,created_at DESC LIMIT 1) life ON true
 WHERE coalesce((SELECT min(timestamp) FROM public.eventos WHERE animal_id=a.id AND tipo IN('COMPRA','NACIMIENTO')),a.created_at)<=ts
 AND CASE WHEN life.tipo IN('VENTA','MUERTE') THEN false WHEN life.tipo='ANULACION' THEN life.valor>0
 WHEN life.tipo IN('COMPRA','NACIMIENTO') THEN true ELSE a.estado='ACTIVO' OR a.updated_at>ts END
$$;
CREATE FUNCTION public.ganpro_capture_recipients() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; unit_cost numeric; used jsonb; supply public.insumos_campo; BEGIN
 INSERT INTO public.aplicacion_animales(aplicacion_id,animal_id)
 SELECT NEW.id,a.id FROM public.ganpro_animals_at(NEW.fecha_aplicacion) a
 WHERE (NEW.animal_id IS NOT NULL AND a.id=NEW.animal_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NOT NULL AND a.lote_id=NEW.lote_id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT costo_unitario INTO unit_cost FROM public.operations_catalog WHERE id=NEW.operation_id;
 IF NEW.insumo_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.insumos_campo WHERE operation_id=NEW.operation_id) THEN
  SELECT * INTO supply FROM public.insumos_campo WHERE id=NEW.insumo_id AND operation_id=NEW.operation_id AND tipo='MEDICAMENTO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
  used=public.ganpro_supply_consume(jsonb_build_object('insumo_id',supply.id,'cantidad',coalesce(NEW.dosis,1)*n,'fecha',NEW.fecha_aplicacion,'lote_id',NEW.lote_id,'partida_id',NEW.partida_id,'motivo','Aplicación sanitaria','referencia_id',NEW.id));
  unit_cost=(used->>'costo')::numeric/nullif(coalesce(NEW.dosis,1)*n,0);
 END IF;
 UPDATE public.operation_logs SET receptores_fijados=true,cantidad_animales=n,costo_total=unit_cost*coalesce(NEW.dosis,1)*n WHERE id=NEW.id;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_recipients AFTER INSERT ON public.operation_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_capture_recipients();
CREATE FUNCTION public.ganpro_animal_withdrawal(ident text,ts bigint) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.operation_logs l WHERE fecha_aplicacion<=ts AND fecha_fin_carencia>ts AND
 (EXISTS(SELECT 1 FROM public.aplicacion_animales r WHERE r.aplicacion_id=l.id AND animal_id=ident)
 OR (NOT l.receptores_fijados AND (l.animal_id=ident OR EXISTS(SELECT 1 FROM public.ganpro_animals_at(l.fecha_aplicacion) a WHERE a.id=ident AND a.lote_id=l.lote_id)))))
$$;
-- Prevent the mobile v3 push or REST from rewriting a fixed treatment's recipients, dose or costs.
CREATE FUNCTION public.ganpro_protect_treatment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.receptores_fijados AND (TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['updated_at','server_created_at','server_updated_at','synced_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','server_created_at','server_updated_at','synced_at'])) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_treatment BEFORE UPDATE OR DELETE ON public.operation_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_treatment();
REVOKE ALL ON FUNCTION public.ganpro_animals_at(bigint),public.ganpro_capture_recipients(),public.ganpro_animal_withdrawal(text,bigint),public.ganpro_protect_treatment() FROM PUBLIC;

-- 20261110000027_sale_withdrawal.sql / SHA256 d9c9245caa7761e314bc502ef2f7fbdc3fc49ce0805bbdf0c45eee207a2753c9
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE kind text:=d->>'tipo'; ts bigint:=(d->>'fecha')::bigint; tag text; tags text[];
 a public.animals; ids text[]:='{}'; cat text; sex text; amount jsonb; plan public.escenario_lineas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF kind IS NULL OR kind NOT IN('VENTA','COMPRA','MUERTE','NACIMIENTO','TRASLADO') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'caravanas');
 IF coalesce(cardinality(tags),0)=0 OR cardinality(tags)>1000 OR EXISTS(SELECT 1 FROM unnest(tags) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'lote_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_destino_id')
 OR d->>'potrero_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=d->>'potrero_destino_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF kind IN('VENTA','COMPRA') THEN PERFORM public.ganpro_money(d->>'monto'); END IF;
 IF kind='VENTA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'escenario_linea_id' IS NOT NULL THEN
  SELECT * INTO plan FROM public.escenario_lineas WHERE id=d->>'escenario_linea_id';
  IF NOT FOUND OR plan.movimiento_id IS NOT NULL OR plan.tipo<>kind OR plan.cabezas<>cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 FOREACH tag IN ARRAY tags LOOP
  IF kind IN('COMPRA','NACIMIENTO') THEN
   sex=coalesce(d->>'sexo','H'); cat=coalesce(d->>'categoria',CASE WHEN sex='M' THEN 'Ternero' ELSE 'Ternera' END);
   IF kind='NACIMIENTO' AND cat NOT IN('Ternero','Ternera') THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
   INSERT INTO public.animals(id_caravana,sexo,categoria,estado,fecha_nacimiento,peso_actual,lote_id,potrero_id)
   VALUES(tag,sex,cat,'ACTIVO',CASE WHEN kind='NACIMIENTO' THEN ts END,
   (d->>'kg')::float8/cardinality(tags),d->>'lote_destino_id',d->>'potrero_destino_id') RETURNING * INTO a;
   INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   IF a.peso_actual IS NOT NULL THEN INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(a.id,'PESAJE',a.peso_actual,ts); END IF;
  ELSE
   SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=tag;
   IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF a.fecha_nacimiento>ts OR EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND timestamp>ts) OR EXISTS(SELECT 1 FROM public.animal_movements WHERE animal_id=a.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF kind='TRASLADO' THEN
    IF d->>'lote_destino_id' IS NULL AND d->>'potrero_destino_id' IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
    INSERT INTO public.animal_movements(animal_id,potrero_origen_id,potrero_destino_id,lote_origen_id,lote_destino_id,fecha)
    VALUES(a.id,a.potrero_id,coalesce(d->>'potrero_destino_id',a.potrero_id),a.lote_id,coalesce(d->>'lote_destino_id',a.lote_id),ts);
    UPDATE public.animals SET potrero_id=coalesce(d->>'potrero_destino_id',potrero_id),lote_id=coalesce(d->>'lote_destino_id',lote_id) WHERE id=a.id;
   ELSE
    IF kind='VENTA' AND public.ganpro_animal_withdrawal(a.id,ts) THEN RAISE EXCEPTION 'GANPRO_WITHDRAWAL'; END IF;
    UPDATE public.animals SET estado=CASE WHEN kind='VENTA' THEN 'VENDIDO' ELSE 'MUERTO' END WHERE id=a.id;
    INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   END IF;
  END IF;
  ids=array_append(ids,a.id);
 END LOOP;
 IF kind IN('VENTA','COMPRA') THEN
  amount=public.ganpro_finance_document(d||jsonb_build_object('tipo',CASE WHEN kind='VENTA' THEN 'INGRESO' ELSE 'GASTO' END,'categoria',kind,
   'descripcion',coalesce(d->>'notas',kind||' '||cardinality(tags)||' cabezas'),'cabezas',cardinality(tags),'animal_ids',to_jsonb(ids),
   'categoria_animal',(SELECT CASE WHEN count(DISTINCT categoria)=1 THEN min(categoria) END FROM public.animals WHERE id=ANY(ids)),
   'lote_id',(SELECT CASE WHEN count(DISTINCT lote_id)=1 THEN min(lote_id) END FROM public.animals WHERE id=ANY(ids))));
  IF kind='VENTA' THEN UPDATE public.animals SET venta_movimiento_id=amount->>'id' WHERE id=ANY(ids);
  ELSE UPDATE public.animals SET compra_movimiento_id=amount->>'id' WHERE id=ANY(ids); END IF;
  IF plan.id IS NOT NULL THEN UPDATE public.escenario_lineas SET movimiento_id=amount->>'id' WHERE id=plan.id; END IF;
 END IF;
 RETURN jsonb_build_object('message',kind||': '||cardinality(tags)||' animales registrados','id',amount->>'id');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261110000028_supplies.sql / SHA256 0af84fa268456149e2319bc764e943b1bc92b5c4f988e62f607e2040039512a0
CREATE FUNCTION public.ganpro_supply_open(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; qty numeric:=(d->>'cantidad')::numeric; val numeric:=(d->>'valor_inicial')::numeric; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' OR d->>'valor_inicial' !~ '^\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.insumos_campo WHERE suplemento_id=d->>'suplemento_id' OR operation_id=d->>'operation_id') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF qty IS NULL OR val IS NULL OR qty<>round(qty,4) OR val<>round(val,2) OR qty<0 OR val<0 OR (qty=0 AND val<>0) OR nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'tipo'='ALIMENTO' AND NOT EXISTS(SELECT 1 FROM public.suplementos WHERE id=d->>'suplemento_id' AND coalesce(stock_kg,0)=qty) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 INSERT INTO public.insumos_campo(nombre,tipo,unidad,suplemento_id,operation_id,cantidad,valor,fecha_apertura)
 VALUES(d->>'nombre',d->>'tipo',d->>'unidad',d->>'suplemento_id',d->>'operation_id',qty,val,ts) RETURNING id INTO ident;
 IF d->>'tipo'='MEDICAMENTO' AND qty>0 THEN
  IF d->>'partida' IS NULL OR d->>'caducidad' IS NULL OR (d->>'caducidad')::bigint<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
  INSERT INTO public.insumo_partidas(insumo_id,nombre,cantidad,caducidad) VALUES(ident,d->>'partida',qty,(d->>'caducidad')::bigint);
 END IF;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,motivo) VALUES(ident,qty,val,ts,'APERTURA','Inventario inicial declarado; no genera caja');
 RETURN jsonb_build_object('id',ident,'message','Insumo incorporado con apertura sin generar caja');
END $$;
CREATE FUNCTION public.ganpro_supply_purchase(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.insumos_campo; qty numeric:=(d->>'cantidad')::numeric; cost numeric:=public.ganpro_money(d->>'monto'); ts bigint:=(d->>'fecha')::bigint; doc jsonb; batch text; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO s FROM public.insumos_campo WHERE id=d->>'insumo_id';
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF s.id IS NULL OR qty IS NULL OR qty<=0 OR qty<>round(qty,4) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF ts<s.fecha_apertura OR EXISTS(SELECT 1 FROM public.insumo_movimientos WHERE insumo_id=s.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF s.tipo='MEDICAMENTO' AND (nullif(trim(d->>'partida'),'') IS NULL OR d->>'caducidad' IS NULL) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF (d->>'caducidad')::bigint<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
 IF d->>'partida' IS NOT NULL THEN
  INSERT INTO public.insumo_partidas(insumo_id,nombre,cantidad,caducidad) VALUES(s.id,d->>'partida',qty,(d->>'caducidad')::bigint) RETURNING id INTO batch;
 END IF;
 doc=public.ganpro_finance_document(d||jsonb_build_object('tipo','GASTO','categoria',CASE WHEN s.tipo='ALIMENTO' THEN 'NUTRICION' WHEN s.tipo='MEDICAMENTO' THEN 'SANIDAD' ELSE 'OTRO' END,'descripcion','Compra de insumo: '||s.nombre));
 UPDATE public.movimientos_financieros SET es_inventario=true WHERE id=doc->>'id';
 UPDATE public.insumos_campo SET cantidad=cantidad+qty,valor=valor+cost WHERE id=s.id;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,referencia_id,partida_id) VALUES(s.id,qty,cost,ts,'COMPRA',doc->>'id',batch);
 IF s.suplemento_id IS NOT NULL THEN UPDATE public.suplementos SET stock_kg=s.cantidad+qty WHERE id=s.suplemento_id; END IF;
 RETURN doc||jsonb_build_object('message','Compra, existencias y obligación guardadas juntas');
END $$;
CREATE FUNCTION public.ganpro_supply_consume(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.insumos_campo; qty numeric:=(d->>'cantidad')::numeric; ts bigint:=(d->>'fecha')::bigint; cost numeric; ident text; batch public.insumo_partidas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO s FROM public.insumos_campo WHERE id=d->>'insumo_id';
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF s.id IS NULL OR qty IS NULL OR qty<=0 OR qty<>round(qty,4) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF ts<s.fecha_apertura OR EXISTS(SELECT 1 FROM public.insumo_movimientos WHERE insumo_id=s.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF qty>s.cantidad THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF s.tipo='MEDICAMENTO' OR d->>'partida_id' IS NOT NULL THEN
  SELECT * INTO batch FROM public.insumo_partidas WHERE id=d->>'partida_id' AND insumo_id=s.id;
  IF NOT FOUND OR batch.cantidad<qty THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_STOCK'; END IF;
  IF batch.caducidad IS NULL OR batch.caducidad<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
  UPDATE public.insumo_partidas SET cantidad=cantidad-qty WHERE id=batch.id;
 END IF;
 cost=CASE WHEN qty=s.cantidad THEN s.valor ELSE round(s.valor*qty/nullif(s.cantidad,0),2) END;
 UPDATE public.insumos_campo SET cantidad=cantidad-qty,valor=valor-cost WHERE id=s.id;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,lote_id,potrero_id,partida_id,motivo,referencia_id)
 VALUES(s.id,-qty,-cost,ts,'CONSUMO',d->>'lote_id',d->>'potrero_id',batch.id,d->>'motivo',d->>'referencia_id') RETURNING id INTO ident;
 IF s.suplemento_id IS NOT NULL THEN UPDATE public.suplementos SET stock_kg=s.cantidad-qty WHERE id=s.suplemento_id; END IF;
 RETURN jsonb_build_object('id',ident,'costo',cost,'message','Consumo registrado con costo histórico; no genera otro pago');
END $$;
CREATE FUNCTION public.ganpro_protect_supply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.stock_kg IS DISTINCT FROM OLD.stock_kg AND EXISTS(SELECT 1 FROM public.insumos_campo WHERE suplemento_id=OLD.id)
 AND coalesce(current_setting('ganpro.command',true),'') NOT IN('supply.purchase','supply.consume','nutrition.deliver','health.apply') THEN RAISE EXCEPTION 'GANPRO_MANAGED_STOCK'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_supply BEFORE UPDATE ON public.suplementos FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_supply();
REVOKE ALL ON FUNCTION public.ganpro_supply_open(jsonb),public.ganpro_supply_purchase(jsonb),public.ganpro_supply_consume(jsonb),public.ganpro_protect_supply() FROM PUBLIC;

-- 20261110000029_nutrition_atomic.sql / SHA256 f27df00ccb5d38eb351b59d7fcc4c617956fe2d4c91d456bce55b0fa634c50dd
ALTER TABLE public.operation_logs ADD COLUMN insumo_id text REFERENCES public.insumos_campo(id),ADD COLUMN partida_id text REFERENCES public.insumo_partidas(id);
ALTER TABLE public.potrero_feeding_logs ADD COLUMN lote_id text REFERENCES public.lotes(id);
CREATE FUNCTION public.ganpro_nutrition_formula(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE total numeric; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.raciones WHERE id=d->>'racion_id') OR jsonb_typeof(d->'items')<>'array' OR jsonb_array_length(d->'items')=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT sum((x->>'porcentaje')::numeric) INTO total FROM jsonb_array_elements(d->'items') x;
 IF abs(total-100)>0.001 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'items') x WHERE (x->>'porcentaje')::numeric<=0 OR NOT EXISTS(SELECT 1 FROM public.suplementos WHERE id=x->>'suplemento_id'))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'items') x GROUP BY x->>'suplemento_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 DELETE FROM public.racion_ingredientes WHERE racion_id=d->>'racion_id';
 INSERT INTO public.racion_ingredientes(racion_id,suplemento_id,porcentaje) SELECT d->>'racion_id',x->>'suplemento_id',(x->>'porcentaje')::float8 FROM jsonb_array_elements(d->'items') x;
 RETURN jsonb_build_object('message','Fórmula guardada completa');
END $$;
CREATE FUNCTION public.ganpro_nutrition_deliver(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ts bigint:=(d->>'fecha')::bigint; qty numeric:=(d->>'cantidad_kg')::numeric; item record; ident text; cost numeric:=0; used jsonb; formula jsonb; part_qty numeric; allocated numeric:=0; idx int:=0; ingredients int; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF qty IS NULL OR qty<=0 OR NOT EXISTS(SELECT 1 FROM public.ganpro_animals_at(ts) WHERE lote_id=d->>'lote_id' AND potrero_id=d->>'potrero_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT jsonb_agg(to_jsonb(i)) INTO formula FROM public.racion_ingredientes i WHERE racion_id=d->>'racion_id';
 IF formula IS NULL OR abs((SELECT sum((x->>'porcentaje')::numeric) FROM jsonb_array_elements(formula) x)-100)>0.001 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.potrero_feeding_logs(potrero_id,lote_id,racion_id,cantidad_kg,fecha,notas,snapshot_formula) VALUES(d->>'potrero_id',d->>'lote_id',d->>'racion_id',qty,ts,d->>'notas',formula) RETURNING id INTO ident;
 SELECT count(*) INTO ingredients FROM public.racion_ingredientes WHERE racion_id=d->>'racion_id';
 FOR item IN SELECT i.*,s.id insumo FROM public.racion_ingredientes i LEFT JOIN public.insumos_campo s ON s.suplemento_id=i.suplemento_id WHERE racion_id=d->>'racion_id' ORDER BY i.id LOOP
  IF item.insumo IS NULL THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
  idx=idx+1;part_qty=CASE WHEN idx=ingredients THEN qty-allocated ELSE least(qty-allocated,round(qty*item.porcentaje::numeric/100,4)) END;allocated=allocated+part_qty;
  IF part_qty=0 THEN CONTINUE; END IF;
  used=public.ganpro_supply_consume(jsonb_build_object('insumo_id',item.insumo,'cantidad',part_qty,'fecha',ts,'lote_id',d->>'lote_id','potrero_id',d->>'potrero_id','motivo','Entrega de ración','referencia_id',ident));
  cost=cost+(used->>'costo')::numeric;
 END LOOP;
 UPDATE public.potrero_feeding_logs SET costo_total=cost WHERE id=ident;
 RETURN jsonb_build_object('id',ident,'message','Entrega, costos y descuento de ingredientes guardados juntos');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_nutrition_formula(jsonb),public.ganpro_nutrition_deliver(jsonb) FROM PUBLIC;

-- 20261110000030_health_inventory.sql / SHA256 7fb10a63dce0aae1a533276bca8d0ae3909762ddc696400f5e3a184dbe3bbb93
CREATE OR REPLACE FUNCTION public.ganpro_health_apply(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE animal text; lot text; product public.operations_catalog; ts bigint:=(d->>'fecha')::bigint; BEGIN
 SELECT * INTO product FROM public.operations_catalog WHERE id=d->>'operation_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF d->>'dosis' IS NOT NULL AND ((d->>'dosis')::numeric<=0 OR (d->>'dosis')::numeric='NaN'::numeric) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF ts IS NULL OR ts<=0 OR (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'destino'='animal' THEN
  SELECT id INTO animal FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(d->>'caravana')) AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 ELSIF d->>'destino'='lote' THEN
  SELECT id INTO lot FROM public.lotes WHERE id=d->>'lote_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable,insumo_id,partida_id)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable',d->>'insumo_id',d->>'partida_id');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot;
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_health_apply(jsonb) FROM PUBLIC;

-- 20261110000031_inventory_guard.sql / SHA256 cc2cea3dc5e821db06943c56e70eb77ed36a8f5d81e6c77acc942afcae39a03b
CREATE OR REPLACE FUNCTION public.ganpro_guard_managed_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cmd text:=coalesce(current_setting('ganpro.command',true),''); BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.ledger_version=1 AND cmd NOT IN('stock.movement','finance.document','supply.purchase') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.ledger_version=0 AND NEW.ledger_version=1 AND cmd<>'finance.adopt' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF TG_OP='UPDATE' AND OLD.es_inventario AND NEW.anulado_en IS DISTINCT FROM OLD.anulado_en THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 IF OLD.ledger_version=1 THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF cmd NOT IN('finance.settle','finance.reverse','finance.void','stock.movement','finance.document','supply.purchase') AND
   (to_jsonb(NEW)-ARRAY['server_updated_at','updated_at','dte_estado']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['server_updated_at','updated_at','dte_estado']) THEN
   RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF NEW.ledger_version<>OLD.ledger_version THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_guard_managed_document() FROM PUBLIC;

-- 20261110000032_reproduction.sql / SHA256 f85a642016e2d9320292f7438f371d2eae2ba35fa2eb1952d0b4056313433799
CREATE FUNCTION public.ganpro_repro_cycle(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE mother public.animals; service public.servicios; ts bigint:=(d->>'fecha')::bigint; ident text; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO mother FROM public.animals WHERE id=d->>'madre_id' AND sexo='H' AND categoria IN('Vaca','Vaquillona') AND estado='ACTIVO';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
 SELECT * INTO service FROM public.servicios WHERE id=d->>'servicio_id';
 IF NOT FOUND OR ts<service.fecha_entrada OR ts>coalesce(service.fecha_salida,ts) OR NOT EXISTS(SELECT 1 FROM public.ganpro_animals_at(ts) WHERE id=mother.id AND lote_id=service.lote_id) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF d->>'padre_id' IS NOT NULL AND (NOT (d->>'padre_id'=ANY(service.toros)) OR NOT EXISTS(SELECT 1 FROM public.animals WHERE id=d->>'padre_id' AND sexo='M' AND categoria='Toro')) THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
 INSERT INTO public.repro_ciclos(madre_id,padre_id,servicio_id,fecha_servicio) VALUES(mother.id,d->>'padre_id',service.id,ts) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Ciclo individual vinculado al servicio');
END $$;
CREATE FUNCTION public.ganpro_repro_stage(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cycle public.repro_ciclos; mother public.animals; calf public.animals; ts bigint:=(d->>'fecha')::bigint; weight numeric:=(d->>'peso')::numeric; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO cycle FROM public.repro_ciclos WHERE id=d->>'id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts<coalesce(cycle.fecha_destete,cycle.fecha_parto,cycle.fecha_tacto,cycle.fecha_servicio) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 SELECT * INTO mother FROM public.animals WHERE id=cycle.madre_id;
 IF d->>'etapa'='TACTO' THEN
  IF cycle.estado<>'SERVIDA' OR d->>'resultado' NOT IN('PRENADA','VACIA') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.repro_ciclos SET estado=d->>'resultado',fecha_tacto=ts WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'TACTO',ts,CASE WHEN d->>'resultado'='PRENADA' THEN 'tacto:prenada' ELSE 'tacto:vacia' END);
 ELSIF d->>'etapa'='PARTO' THEN
  IF cycle.estado<>'PRENADA' OR mother.estado<>'ACTIVO' OR weight IS NULL OR weight<=0 OR d->>'sexo' NOT IN('M','H') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  SELECT lote_id,potrero_id INTO mother.lote_id,mother.potrero_id FROM public.ganpro_animals_at(ts) WHERE id=mother.id;
  PERFORM public.ganpro_stock_movement(jsonb_build_object('tipo','NACIMIENTO','fecha',ts,'caravanas',jsonb_build_array(d->>'caravana'),'sexo',d->>'sexo','categoria',CASE WHEN d->>'sexo'='M' THEN 'Ternero' ELSE 'Ternera' END,'kg',weight,'lote_destino_id',mother.lote_id,'potrero_destino_id',mother.potrero_id));
  SELECT * INTO calf FROM public.animals WHERE id_caravana=upper(trim(d->>'caravana'));
  UPDATE public.animals SET madre_id=mother.id,padre_id=cycle.padre_id WHERE id=calf.id;
  UPDATE public.repro_ciclos SET estado='PARIDA',fecha_parto=ts,ternero_id=calf.id WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'PARTO',ts,'Cría: '||calf.id_caravana);
 ELSIF d->>'etapa'='PERDIDA' THEN
  IF cycle.estado NOT IN('SERVIDA','PRENADA','PARIDA') OR (cycle.ternero_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE id=cycle.ternero_id AND estado='ACTIVO')) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.repro_ciclos SET estado='PERDIDA' WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'PERDIDA_REPRODUCTIVA',ts,'Cierre de ciclo por pérdida');
 ELSIF d->>'etapa'='DESTETE' THEN
  IF cycle.estado<>'PARIDA' OR weight IS NULL OR weight<=0 OR weight>9999 THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  SELECT * INTO calf FROM public.animals WHERE id=cycle.ternero_id AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  IF EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=calf.id AND timestamp>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,valor,notas) VALUES(calf.id,'DESTETE',ts,weight,'Madre: '||mother.id_caravana),(calf.id,'PESAJE',ts,weight,'Pesada de destete');
  UPDATE public.animals SET peso_actual=weight WHERE id=calf.id;
  UPDATE public.repro_ciclos SET estado='DESTETADA',fecha_destete=ts,peso_destete=weight WHERE id=cycle.id;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 RETURN jsonb_build_object('message','Etapa, genealogía y stock actualizados juntos');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_repro_cycle(jsonb),public.ganpro_repro_stage(jsonb) FROM PUBLIC;

-- 20261110000033_grazing.sql / SHA256 c0f46d49a9c681956054620c7e9b0f9c9978be93027b151468306e4d5d738c2f
CREATE FUNCTION public.ganpro_grazing_plan(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; start_ bigint:=(d->>'entrada')::bigint; end_ bigint:=(d->>'salida')::bigint; p public.potreros; ev numeric; available numeric; needed numeric; BEGIN
 IF EXISTS(SELECT 1 FROM jsonb_each_text(d) WHERE key IN('forraje_kg_ms_ha','remanente_kg_ms_ha','consumo_ev_dia') AND value !~ '^\d{1,9}(\.\d{1,4})?$') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF start_ IS NULL OR end_<=start_ OR (d->>'forraje_kg_ms_ha')::numeric<=(d->>'remanente_kg_ms_ha')::numeric THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT * INTO p FROM public.potreros WHERE id=d->>'potrero_id' AND hectareas>0;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF EXISTS(SELECT 1 FROM public.planes_pastoreo WHERE (potrero_id=p.id OR lote_id=d->>'lote_id') AND estado<>'COMPLETADO' AND entrada<end_ AND salida>start_) THEN RAISE EXCEPTION 'GANPRO_GRAZING_CONFLICT'; END IF;
 IF EXISTS(SELECT 1 FROM public.planes_pastoreo WHERE potrero_id=p.id AND salida_real IS NOT NULL AND salida_real+descanso_dias*86400000.0>start_) THEN RAISE EXCEPTION 'GANPRO_REST_PERIOD'; END IF;
 IF EXISTS(SELECT 1 FROM public.animals a LEFT JOIN public.categorias_config c ON c.categoria=a.categoria WHERE a.lote_id=d->>'lote_id' AND estado='ACTIVO' AND c.ev IS NULL) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT sum(c.ev) INTO ev FROM public.animals a JOIN public.categorias_config c ON c.categoria=a.categoria WHERE a.lote_id=d->>'lote_id' AND estado='ACTIVO';
 IF ev IS NULL THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
 available=((d->>'forraje_kg_ms_ha')::numeric-(d->>'remanente_kg_ms_ha')::numeric)*p.hectareas;
 needed=ev*(d->>'consumo_ev_dia')::numeric*(end_-start_)/86400000.0;
 IF needed>available OR ev>p.capacidad_ev THEN RAISE EXCEPTION 'GANPRO_FORAGE_CAPACITY'; END IF;
 INSERT INTO public.planes_pastoreo(lote_id,potrero_id,entrada,salida,descanso_dias,forraje_kg_ms_ha,remanente_kg_ms_ha,consumo_ev_dia)
 VALUES(d->>'lote_id',p.id,start_,end_,(d->>'descanso_dias')::int,(d->>'forraje_kg_ms_ha')::numeric,(d->>'remanente_kg_ms_ha')::numeric,(d->>'consumo_ev_dia')::numeric) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Rotación planificada con balance forrajero');
END $$;
CREATE FUNCTION public.ganpro_grazing_stage(d jsonb,finishing boolean) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE plan public.planes_pastoreo; tags jsonb; ids text[]; ts bigint:=(d->>'fecha')::bigint; destination text; ev numeric; plot public.potreros; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO plan FROM public.planes_pastoreo WHERE id=d->>'id';
 IF NOT FOUND OR (finishing AND plan.estado<>'EN_CURSO') OR (NOT finishing AND plan.estado<>'PLANIFICADO') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF ts<coalesce(plan.entrada_real,plan.entrada) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF finishing THEN
  destination=d->>'potrero_destino_id';
  IF destination IS NULL OR destination=plan.potrero_id THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
  IF EXISTS(SELECT 1 FROM public.animals WHERE id=ANY(plan.animales) AND estado='ACTIVO' AND potrero_id IS DISTINCT FROM plan.potrero_id) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  SELECT jsonb_agg(id_caravana),array_agg(id) INTO tags,ids FROM public.animals WHERE id=ANY(plan.animales) AND estado='ACTIVO';
 ELSE
  destination=plan.potrero_id;
  IF ts>=plan.salida THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
  SELECT * INTO plot FROM public.potreros WHERE id=destination;
  SELECT sum(c.ev) INTO ev FROM public.animals a JOIN public.categorias_config c ON c.categoria=a.categoria WHERE a.lote_id=plan.lote_id AND a.estado='ACTIVO';
  IF ev>plot.capacidad_ev OR ev*plan.consumo_ev_dia*(plan.salida-ts)/86400000.0>(plan.forraje_kg_ms_ha-plan.remanente_kg_ms_ha)*plot.hectareas OR (SELECT count(*) FROM public.animals WHERE lote_id=plan.lote_id AND estado='ACTIVO')>plot.capacidad_cabezas THEN RAISE EXCEPTION 'GANPRO_FORAGE_CAPACITY'; END IF;
  IF EXISTS(SELECT 1 FROM public.animals WHERE estado='ACTIVO' AND potrero_id=destination AND lote_id IS DISTINCT FROM plan.lote_id) THEN RAISE EXCEPTION 'GANPRO_GRAZING_CONFLICT'; END IF;
  IF EXISTS(SELECT 1 FROM public.planes_pastoreo WHERE potrero_id=destination AND estado='EN_CURSO') OR EXISTS(SELECT 1 FROM public.planes_pastoreo WHERE potrero_id=destination AND salida_real IS NOT NULL AND salida_real+descanso_dias*86400000.0>ts) THEN RAISE EXCEPTION 'GANPRO_REST_PERIOD'; END IF;
  SELECT jsonb_agg(id_caravana),array_agg(id) INTO tags,ids FROM public.animals WHERE lote_id=plan.lote_id AND estado='ACTIVO';
 END IF;
 IF tags IS NULL THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
 PERFORM public.ganpro_stock_movement(jsonb_build_object('tipo','TRASLADO','fecha',ts,'caravanas',tags,'potrero_destino_id',destination));
 UPDATE public.planes_pastoreo SET estado=CASE WHEN finishing THEN 'COMPLETADO' ELSE 'EN_CURSO' END,
 animales=coalesce(animales,ids),entrada_real=coalesce(entrada_real,ts),salida_real=CASE WHEN finishing THEN ts END WHERE id=plan.id;
 RETURN jsonb_build_object('message',CASE WHEN finishing THEN 'Salida registrada; comienza el descanso' ELSE 'Entrada registrada con traslado del lote' END);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_grazing_plan(jsonb),public.ganpro_grazing_stage(jsonb,boolean) FROM PUBLIC;

-- 20261110000034_inventory_close.sql / SHA256 6daed40e266c0872c6fa51b791e95e56a49ea0e7b341533602df43497510e9be
CREATE UNIQUE INDEX inventory_day_unique ON public.inventario_cierres(((to_timestamp(fecha/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date));
CREATE FUNCTION public.ganpro_inventory_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.animals; price numeric; animals jsonb:='[]'; supplies jsonb; heads int:=0; kg numeric:=0; val numeric:=0; supplies_value numeric;
 ident text; ts bigint:=public.ganpro_now_ms(); previous public.inventario_cierres; result jsonb; income numeric; expense numeric; consumption numeric; sold_kg numeric; bought_kg numeric; reversal_income numeric; reversal_expense numeric; missing_kg boolean; BEGIN
 IF (to_timestamp((d->>'fecha')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_CURRENT_SNAPSHOT'; END IF;
 IF EXISTS(SELECT 1 FROM public.inventario_cierres WHERE (to_timestamp(fecha/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF jsonb_typeof(d->'precios')<>'object' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.suplementos s WHERE stock_kg>0 AND NOT EXISTS(SELECT 1 FROM public.insumos_campo i WHERE i.suplemento_id=s.id)) THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
 FOR a IN SELECT * FROM public.animals WHERE estado='ACTIVO' LOOP
  price=public.ganpro_money(d->'precios'->>a.categoria);
  IF a.peso_actual IS NULL OR a.peso_actual<=0 THEN RAISE EXCEPTION 'GANPRO_MISSING_WEIGHT'; END IF;
  heads=heads+1;kg=kg+a.peso_actual;val=val+round(price*a.peso_actual::numeric,2);
  animals=animals||jsonb_build_array(jsonb_build_object('id',a.id,'categoria',a.categoria,'peso',a.peso_actual,'precio',price,'valor',round(price*a.peso_actual::numeric,2),'lote_id',a.lote_id,'potrero_id',a.potrero_id));
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'),coalesce(sum(valor),0) INTO supplies,supplies_value FROM public.insumos_campo s;
 SELECT * INTO previous FROM public.inventario_cierres ORDER BY fecha DESC LIMIT 1;
 IF FOUND THEN
  -- Receipt timestamps delimit captured operations; saved reports never reprice historical inputs.
  SELECT coalesce(sum(monto) FILTER(WHERE tipo='INGRESO'),0),coalesce(sum(monto) FILTER(WHERE tipo='GASTO' AND NOT es_inventario),0),coalesce(sum(m.kg) FILTER(WHERE categoria='VENTA'),0),coalesce(sum(m.kg) FILTER(WHERE categoria='COMPRA'),0)
  INTO income,expense,sold_kg,bought_kg FROM public.movimientos_financieros m WHERE created_at>previous.fecha AND created_at<=ts AND anulado_en IS NULL;
  SELECT coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='INGRESO'),0),coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='GASTO' AND NOT (next->>'es_inventario')::boolean),0)
  INTO reversal_income,reversal_expense FROM public.command_audit WHERE table_name='movimientos_financieros' AND command_audit.previous->>'anulado_en' IS NULL AND next->>'anulado_en' IS NOT NULL AND extract(epoch FROM created_at)*1000>previous.fecha AND (next->>'created_at')::bigint<=previous.fecha;
  income=income+reversal_income;expense=expense+reversal_expense;
  SELECT EXISTS(SELECT 1 FROM public.movimientos_financieros m WHERE m.created_at>previous.fecha AND m.created_at<=ts AND m.categoria IN('COMPRA','VENTA') AND m.kg IS NULL AND m.anulado_en IS NULL) INTO missing_kg;
  SELECT -coalesce(sum(valor),0) INTO consumption FROM public.insumo_movimientos WHERE origen='CONSUMO' AND registrado_en>previous.fecha AND registrado_en<=ts;
  result=jsonb_build_object('desde',previous.fecha,'ingresos',income,'gastos',expense,'consumos',consumption,'variacion_animales',val-previous.valor_animales,
   'produccion_kg',CASE WHEN missing_kg THEN NULL ELSE sold_kg-bought_kg+kg-previous.kg END,'margen',income-expense-consumption+val-previous.valor_animales);
 END IF;
 INSERT INTO public.inventario_cierres(fecha,cabezas,kg,valor_animales,valor_insumos,animales,insumos,resultado,actor_id)
 VALUES(ts,heads,kg,val,supplies_value,animals,supplies,result,auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Inventario físico y valuación conservados; comparación disponible desde el segundo corte');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_inventory_close(jsonb) FROM PUBLIC;

-- 20261110000035_bank_reconciliation.sql / SHA256 525e19706f330b4eae5b77085d06753211a92e12136e71cf40f39c155a54f170
CREATE FUNCTION public.ganpro_bank_import(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; item jsonb; amount numeric; total numeric:=0; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.cuentas_caja WHERE id=d->>'cuenta_id') OR jsonb_typeof(d->'filas')<>'array' OR jsonb_array_length(d->'filas') NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF (d->>'hasta')::bigint<(d->>'desde')::bigint THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'filas') LOOP
  IF (item->>'monto') !~ '^-?\d{1,12}(\.\d{1,2})?$' OR nullif(trim(item->>'referencia'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  amount=(item->>'monto')::numeric;
  IF amount=0 OR (item->>'fecha')::bigint NOT BETWEEN (d->>'desde')::bigint AND (d->>'hasta')::bigint THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  total=total+amount;
 END LOOP;
 IF (d->>'saldo_inicial')::numeric+total<>(d->>'saldo_final')::numeric THEN RAISE EXCEPTION 'GANPRO_STATEMENT_BALANCE'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'filas') x GROUP BY x->>'referencia' HAVING count(*)>1) OR EXISTS(SELECT 1 FROM public.banco_lineas WHERE cuenta_id=d->>'cuenta_id' AND referencia IN(SELECT value->>'referencia' FROM jsonb_array_elements(d->'filas'))) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_BANK_REF'; END IF;
 INSERT INTO public.banco_extractos(cuenta_id,desde,hasta,saldo_inicial,saldo_final) VALUES(d->>'cuenta_id',(d->>'desde')::bigint,(d->>'hasta')::bigint,(d->>'saldo_inicial')::numeric,(d->>'saldo_final')::numeric) RETURNING id INTO ident;
 INSERT INTO public.banco_lineas(extracto_id,cuenta_id,fecha,referencia,descripcion,monto)
 SELECT ident,d->>'cuenta_id',(x->>'fecha')::bigint,x->>'referencia',x->>'descripcion',(x->>'monto')::numeric FROM jsonb_array_elements(d->'filas') x;
 RETURN jsonb_build_object('id',ident,'message','Extracto importado sin generar cobros ni pagos nuevos');
END $$;
CREATE FUNCTION public.ganpro_bank_match(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE line public.banco_lineas; posting public.asientos_caja; BEGIN
 SELECT * INTO line FROM public.banco_lineas WHERE id=d->>'extracto_id';
 SELECT * INTO posting FROM public.asientos_caja WHERE id=d->>'asiento_id';
 IF line.id IS NULL OR posting.id IS NULL THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF line.asiento_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.banco_lineas WHERE asiento_id=posting.id) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF posting.cuenta_id<>line.cuenta_id OR posting.monto<>line.monto THEN RAISE EXCEPTION 'GANPRO_BANK_MISMATCH'; END IF;
 UPDATE public.banco_lineas SET asiento_id=posting.id WHERE id=line.id;
 RETURN jsonb_build_object('message','Movimiento bancario conciliado con su asiento existente');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_bank_import(jsonb),public.ganpro_bank_match(jsonb) FROM PUBLIC;

-- 20261110000036_scenario_atomic.sql / SHA256 f06ef0af8a56d0ecceb46d88c74196ed734ecc6e43029de7f31c2886d1ec6309
CREATE FUNCTION public.ganpro_scenario_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); line jsonb; BEGIN
 IF nullif(trim(d->>'nombre'),'') IS NULL OR d->>'tipo' NOT IN('negocio','peso','plan','cria') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d ? 'id' THEN
  UPDATE public.escenarios SET nombre=d->>'nombre',tipo=d->>'tipo',lote_id=d->>'lote_id',supuestos=d->'supuestos',resultado=d->'resultado' WHERE id=ident AND estado<>'CERRADO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 ELSE INSERT INTO public.escenarios(id,nombre,tipo,lote_id,supuestos,resultado) VALUES(ident,d->>'nombre',d->>'tipo',d->>'lote_id',d->'supuestos',d->'resultado'); END IF;
 IF d ? 'lineas' THEN
  IF jsonb_typeof(d->'lineas')<>'array' OR jsonb_array_length(d->'lineas')>1000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  DELETE FROM public.escenario_lineas WHERE escenario_id=ident AND movimiento_id IS NULL;
  FOR line IN SELECT value FROM jsonb_array_elements(d->'lineas') LOOP
   IF (line->>'cabezas')::int<=0 OR (line->>'kg')::numeric<0 OR (line->>'precioKg')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   INSERT INTO public.escenario_lineas(escenario_id,mes,tipo,categoria,cabezas,kg,precio_kg,monto)
   VALUES(ident,line->>'mes',line->>'tipo',line->>'categoria',(line->>'cabezas')::int,(line->>'kg')::numeric,(line->>'precioKg')::numeric,(line->>'cabezas')::int*(line->>'kg')::numeric*(line->>'precioKg')::numeric);
  END LOOP;
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Escenario y líneas guardados juntos; operaciones reales conservadas');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_scenario_save(jsonb) FROM PUBLIC;

-- 20261110000037_documents.sql / SHA256 25e64bb759b09ed126af20e24c503515c116a1a81dc386aa15481f5420d13b53
-- Supabase Storage is optional only in the isolated PostgreSQL test scaffold.
DO $$ BEGIN IF to_regclass('storage.buckets') IS NOT NULL THEN
 INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('comprobantes','comprobantes',false,4194304,ARRAY['application/pdf','image/png','image/jpeg']) ON CONFLICT(id) DO NOTHING;
 EXECUTE $p$CREATE POLICY ganpro_document_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='comprobantes' AND public.ganpro_rol() IN('admin','campo') AND (storage.foldername(name))[1]=auth.uid()::text)$p$;
 EXECUTE $p$CREATE POLICY ganpro_document_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='comprobantes' AND public.ganpro_rol() IS NOT NULL AND EXISTS(SELECT 1 FROM public.documentos_comprobantes d WHERE d.path=name))$p$;
 END IF; END $$;
CREATE FUNCTION public.ganpro_document_attach(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE present boolean; ident text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.movimientos_financieros WHERE id=d->>'movimiento_id') THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF d->>'path' NOT LIKE auth.uid()::text||'/%' OR d->>'sha256' !~ '^[a-f0-9]{64}$' OR nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF to_regclass('storage.objects') IS NULL THEN RAISE EXCEPTION 'GANPRO_STORAGE_UNAVAILABLE'; END IF;
 EXECUTE 'SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=''comprobantes'' AND name=$1)' INTO present USING d->>'path';
 IF NOT present THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 INSERT INTO public.documentos_comprobantes(movimiento_id,nombre,path,sha256,actor_id) VALUES(d->>'movimiento_id',d->>'nombre',d->>'path',d->>'sha256',auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Comprobante adjuntado en almacenamiento privado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_document_attach(jsonb) FROM PUBLIC;

-- 20261110000038_extended_dispatcher.sql / SHA256 0a5bb907ebc8a36a00dc34552518f18e8f867bdf56c70f5adc06ac96bd71b96e
CREATE OR REPLACE FUNCTION public.ganpro_command(p_name text,p_key uuid,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cached public.command_receipts; result jsonb; fingerprint text; BEGIN
 PERFORM public.ganpro_lock();
 IF auth.uid() IS NULL OR coalesce(public.ganpro_rol(),'') NOT IN('admin','campo') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF (p_name LIKE 'bank.%' OR p_name='inventory.close') AND public.ganpro_rol()<>'admin' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_key IS NULL OR p_data IS NULL OR octet_length(p_data::text)>4000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 fingerprint=encode(sha256(convert_to(p_name||':'||p_data::text,'UTF8')),'hex');
 SELECT * INTO cached FROM public.command_receipts WHERE id=p_key;
 IF FOUND THEN
  IF cached.actor_id<>auth.uid() OR cached.command<>p_name OR cached.fingerprint<>fingerprint THEN RAISE EXCEPTION 'GANPRO_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN cached.result;
 END IF;
 PERFORM set_config('ganpro.command',p_name,true);PERFORM set_config('ganpro.command_key',p_key::text,true);
 CASE p_name
 WHEN 'supply.open' THEN result=public.ganpro_supply_open(p_data);
 WHEN 'supply.purchase' THEN result=public.ganpro_supply_purchase(p_data);
 WHEN 'supply.consume' THEN result=public.ganpro_supply_consume(p_data);
 WHEN 'nutrition.formula' THEN result=public.ganpro_nutrition_formula(p_data);
 WHEN 'nutrition.deliver' THEN result=public.ganpro_nutrition_deliver(p_data);
 WHEN 'repro.cycle' THEN result=public.ganpro_repro_cycle(p_data);
 WHEN 'repro.stage' THEN result=public.ganpro_repro_stage(p_data);
 WHEN 'grazing.plan' THEN result=public.ganpro_grazing_plan(p_data);
 WHEN 'grazing.start' THEN result=public.ganpro_grazing_stage(p_data,false);
 WHEN 'grazing.finish' THEN result=public.ganpro_grazing_stage(p_data,true);
 WHEN 'inventory.close' THEN result=public.ganpro_inventory_close(p_data);
 WHEN 'bank.import' THEN result=public.ganpro_bank_import(p_data);
 WHEN 'bank.match' THEN result=public.ganpro_bank_match(p_data);
 WHEN 'scenario.save' THEN result=public.ganpro_scenario_save(p_data);
 WHEN 'document.attach' THEN result=public.ganpro_document_attach(p_data);

 WHEN 'stock.save' THEN result=public.ganpro_stock_save(p_data);
 WHEN 'stock.recat' THEN result=public.ganpro_stock_recat(p_data);
 WHEN 'stock.import' THEN result=public.ganpro_stock_import(p_data);
 WHEN 'stock.movement' THEN result=public.ganpro_stock_movement(p_data);
 WHEN 'finance.adopt' THEN result=public.ganpro_finance_adopt(p_data);
 WHEN 'finance.document' THEN result=public.ganpro_finance_document(p_data);
 WHEN 'finance.settle' THEN result=public.ganpro_finance_settle(p_data);
 WHEN 'finance.account' THEN result=public.ganpro_cash_account(p_data);
 WHEN 'finance.transfer' THEN result=public.ganpro_cash_transfer(p_data);
 WHEN 'finance.reverse' THEN result=public.ganpro_cash_reverse(p_data);
 WHEN 'finance.close' THEN result=public.ganpro_cash_close(p_data);
 WHEN 'finance.void' THEN result=public.ganpro_finance_void(p_data);
 WHEN 'map.save' THEN result=public.ganpro_map_save(p_data);
 WHEN 'health.apply' THEN result=public.ganpro_health_apply(p_data);
 WHEN 'batch' THEN result=public.ganpro_apply_batch(p_data);
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END CASE;
 INSERT INTO public.command_receipts(id,actor_id,command,fingerprint,result) VALUES(p_key,auth.uid(),p_name,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_command(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_command(text,uuid,jsonb) TO authenticated;

-- 20261110000039_management_snapshot.sql / SHA256 5e5b475eaeb85cdab98b7ecf5d301a9a49f898fa0099c61c96e24058c33026da
ALTER TABLE public.insumo_movimientos ADD COLUMN registrado_en bigint NOT NULL DEFAULT public.ganpro_now_ms();
CREATE FUNCTION public.ganpro_management_snapshot() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb:='{}'; t text; key_ text; rows_ jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 PERFORM public.ganpro_lock();
 FOR t,key_ IN SELECT * FROM (VALUES('insumos_campo','insumos'),('insumo_partidas','partidas'),('insumo_movimientos','consumos'),('repro_ciclos','ciclos'),('planes_pastoreo','pastoreo'),('inventario_cierres','cierres'),('banco_lineas','bancos'),('banco_extractos','extractos'),('documentos_comprobantes','documentos')) v LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)-''path''-''sha256''),''[]'') FROM public.%I x',t) INTO rows_;
  result=result||jsonb_build_object(key_,rows_);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_management_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_management_snapshot() TO authenticated;
-- New private columns must not be overwritten by an old offline client.
CREATE FUNCTION public.ganpro_protect_domain_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='animals' THEN
 IF TG_OP='UPDATE' AND (NEW.madre_id IS DISTINCT FROM OLD.madre_id OR NEW.padre_id IS DISTINCT FROM OLD.padre_id)
 AND coalesce(current_setting('ganpro.command',true),'')<>'repro.stage' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 IF TG_TABLE_NAME='movimientos_financieros' THEN
 IF TG_OP='UPDATE' AND NEW.es_inventario IS DISTINCT FROM OLD.es_inventario
 AND coalesce(current_setting('ganpro.command',true),'')<>'supply.purchase' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_genealogy BEFORE UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_domain_fields();
CREATE TRIGGER protect_inventory_flag BEFORE UPDATE ON public.movimientos_financieros FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_domain_fields();
REVOKE ALL ON FUNCTION public.ganpro_protect_domain_fields() FROM PUBLIC;

-- 20261110000040_remaining_transactions.sql / SHA256 d234be8ad196614702ea42dfd86e67d6afc66aa1ba4cedd0198466964f02d014
CREATE FUNCTION public.ganpro_config_categories(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; BEGIN
 IF jsonb_typeof(d)<>'array' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
  IF (item->>'ev')::numeric<=0 OR (item->>'edad_recategorizacion_meses')::int<=0 OR (item->>'consumo_sal_g_dia')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF item->>'recategoriza_a' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.categorias_config WHERE categoria=item->>'recategoriza_a') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
  UPDATE public.categorias_config SET ev=(item->>'ev')::float8,recategoriza_a=item->>'recategoriza_a',edad_recategorizacion_meses=(item->>'edad_recategorizacion_meses')::int,consumo_sal_g_dia=(item->>'consumo_sal_g_dia')::float8 WHERE categoria=item->>'categoria';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 END LOOP;
 RETURN jsonb_build_object('message','Categorías actualizadas juntas');
END $$;
CREATE FUNCTION public.ganpro_scenario_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE start_ bigint:=(d->>'desde')::bigint; end_ bigint:=(d->>'hasta')::bigint; result jsonb; inc numeric; buy numeric; direct numeric; used numeric; sold numeric; heads numeric; qty int; BEGIN
 IF start_ IS NULL OR end_ IS NULL OR end_<start_ THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF (to_timestamp(end_/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT coalesce(sum(monto) FILTER(WHERE tipo='INGRESO'),0),coalesce(sum(monto) FILTER(WHERE categoria='COMPRA'),0),coalesce(sum(monto) FILTER(WHERE tipo='GASTO' AND categoria IN('SANIDAD','NUTRICION','ALQUILER','MANO_OBRA')),0),coalesce(sum(kg) FILTER(WHERE categoria='VENTA'),0),coalesce(sum(cabezas) FILTER(WHERE categoria='VENTA'),0),count(*)
 INTO inc,buy,direct,sold,heads,qty FROM public.movimientos_financieros WHERE lote_id=d->>'lote_id' AND fecha BETWEEN start_ AND end_ AND anulado_en IS NULL AND NOT es_inventario;
 SELECT -coalesce(sum(valor),0) INTO used FROM public.insumo_movimientos WHERE lote_id=d->>'lote_id' AND origen='CONSUMO' AND fecha BETWEEN start_ AND end_;
 result=jsonb_build_object('desde',start_,'hasta',end_,'ingreso',inc,'compra',buy,'costosDirectos',direct+used,'margenBruto',inc-buy-direct-used,'cabezasVendidas',heads,'kgVendidos',sold,'precioVentaKg',inc/nullif(sold,0),'movimientos',qty);
 UPDATE public.escenarios SET estado='CERRADO',lote_id=d->>'lote_id',resultado_real=result WHERE id=d->>'id' AND estado<>'CERRADO';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 RETURN jsonb_build_object('message','Escenario cerrado con gastos y consumos reales, sin duplicar compras de insumos');
END $$;
CREATE FUNCTION public.ganpro_protect_scenario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='escenarios' THEN
  IF TG_OP='DELETE' AND (OLD.estado='CERRADO' OR EXISTS(SELECT 1 FROM public.escenario_lineas WHERE escenario_id=OLD.id AND movimiento_id IS NOT NULL)) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 ELSE
  IF TG_OP='UPDATE' AND NEW.movimiento_id IS DISTINCT FROM OLD.movimiento_id AND coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  IF TG_OP='DELETE' AND OLD.movimiento_id IS NOT NULL THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_scenario_delete BEFORE DELETE ON public.escenarios FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_scenario();
CREATE TRIGGER protect_real_line BEFORE UPDATE OR DELETE ON public.escenario_lineas FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_scenario();
REVOKE ALL ON FUNCTION public.ganpro_config_categories(jsonb),public.ganpro_scenario_close(jsonb),public.ganpro_protect_scenario() FROM PUBLIC;

-- 20261110000041_completed_dispatcher.sql / SHA256 21f214c875efd5efb79b2e1799435bb82b9569e70c763bbb6de3a5c56569b664
CREATE OR REPLACE FUNCTION public.ganpro_command(p_name text,p_key uuid,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cached public.command_receipts; result jsonb; fingerprint text; BEGIN
 PERFORM public.ganpro_lock();
 IF auth.uid() IS NULL OR coalesce(public.ganpro_rol(),'') NOT IN('admin','campo') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF (p_name LIKE 'bank.%' OR p_name IN('inventory.close','config.categories')) AND public.ganpro_rol()<>'admin' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_key IS NULL OR p_data IS NULL OR octet_length(p_data::text)>4000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 fingerprint=encode(sha256(convert_to(p_name||':'||p_data::text,'UTF8')),'hex');
 SELECT * INTO cached FROM public.command_receipts WHERE id=p_key;
 IF FOUND THEN
  IF cached.actor_id<>auth.uid() OR cached.command<>p_name OR cached.fingerprint<>fingerprint THEN RAISE EXCEPTION 'GANPRO_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN cached.result;
 END IF;
 PERFORM set_config('ganpro.command',p_name,true);PERFORM set_config('ganpro.command_key',p_key::text,true);
 CASE p_name
 WHEN 'config.categories' THEN result=public.ganpro_config_categories(p_data);
 WHEN 'scenario.close' THEN result=public.ganpro_scenario_close(p_data);
 WHEN 'supply.open' THEN result=public.ganpro_supply_open(p_data);
 WHEN 'supply.purchase' THEN result=public.ganpro_supply_purchase(p_data);
 WHEN 'supply.consume' THEN result=public.ganpro_supply_consume(p_data);
 WHEN 'nutrition.formula' THEN result=public.ganpro_nutrition_formula(p_data);
 WHEN 'nutrition.deliver' THEN result=public.ganpro_nutrition_deliver(p_data);
 WHEN 'repro.cycle' THEN result=public.ganpro_repro_cycle(p_data);
 WHEN 'repro.stage' THEN result=public.ganpro_repro_stage(p_data);
 WHEN 'grazing.plan' THEN result=public.ganpro_grazing_plan(p_data);
 WHEN 'grazing.start' THEN result=public.ganpro_grazing_stage(p_data,false);
 WHEN 'grazing.finish' THEN result=public.ganpro_grazing_stage(p_data,true);
 WHEN 'inventory.close' THEN result=public.ganpro_inventory_close(p_data);
 WHEN 'bank.import' THEN result=public.ganpro_bank_import(p_data);
 WHEN 'bank.match' THEN result=public.ganpro_bank_match(p_data);
 WHEN 'scenario.save' THEN result=public.ganpro_scenario_save(p_data);
 WHEN 'document.attach' THEN result=public.ganpro_document_attach(p_data);

 WHEN 'stock.save' THEN result=public.ganpro_stock_save(p_data);
 WHEN 'stock.recat' THEN result=public.ganpro_stock_recat(p_data);
 WHEN 'stock.import' THEN result=public.ganpro_stock_import(p_data);
 WHEN 'stock.movement' THEN result=public.ganpro_stock_movement(p_data);
 WHEN 'finance.adopt' THEN result=public.ganpro_finance_adopt(p_data);
 WHEN 'finance.document' THEN result=public.ganpro_finance_document(p_data);
 WHEN 'finance.settle' THEN result=public.ganpro_finance_settle(p_data);
 WHEN 'finance.account' THEN result=public.ganpro_cash_account(p_data);
 WHEN 'finance.transfer' THEN result=public.ganpro_cash_transfer(p_data);
 WHEN 'finance.reverse' THEN result=public.ganpro_cash_reverse(p_data);
 WHEN 'finance.close' THEN result=public.ganpro_cash_close(p_data);
 WHEN 'finance.void' THEN result=public.ganpro_finance_void(p_data);
 WHEN 'map.save' THEN result=public.ganpro_map_save(p_data);
 WHEN 'health.apply' THEN result=public.ganpro_health_apply(p_data);
 WHEN 'batch' THEN result=public.ganpro_apply_batch(p_data);
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END CASE;
 INSERT INTO public.command_receipts(id,actor_id,command,fingerprint,result) VALUES(p_key,auth.uid(),p_name,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_command(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_command(text,uuid,jsonb) TO authenticated;

-- 20261110000042_execution_integrity.sql / SHA256 6aec841b842a7788b6622d9ec6351f00848903b95c84e22744bb6232c3b0fef0
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE kind text:=d->>'tipo'; ts bigint:=(d->>'fecha')::bigint; tag text; tags text[];
 a public.animals; ids text[]:='{}'; cat text; sex text; amount jsonb; plan public.escenario_lineas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF kind IS NULL OR kind NOT IN('VENTA','COMPRA','MUERTE','NACIMIENTO','TRASLADO') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'caravanas');
 IF coalesce(cardinality(tags),0)=0 OR cardinality(tags)>1000 OR EXISTS(SELECT 1 FROM unnest(tags) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'lote_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_destino_id')
 OR d->>'potrero_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=d->>'potrero_destino_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF d->>'kg' IS NOT NULL AND (d->>'kg' !~ '^\d{1,9}(\.\d{1,4})?$' OR (d->>'kg')::numeric<=0 OR (d->>'kg')::numeric>9999*cardinality(tags)) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN PERFORM public.ganpro_money(d->>'monto'); END IF;
 IF kind='VENTA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'escenario_linea_id' IS NOT NULL THEN
  SELECT * INTO plan FROM public.escenario_lineas WHERE id=d->>'escenario_linea_id';
  IF NOT FOUND OR plan.movimiento_id IS NOT NULL OR plan.tipo<>kind OR plan.cabezas<>cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 FOREACH tag IN ARRAY tags LOOP
  IF kind IN('COMPRA','NACIMIENTO') THEN
   sex=coalesce(d->>'sexo','H'); cat=coalesce(d->>'categoria',CASE WHEN sex='M' THEN 'Ternero' ELSE 'Ternera' END);
   IF kind='NACIMIENTO' AND cat NOT IN('Ternero','Ternera') THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
   INSERT INTO public.animals(id_caravana,sexo,categoria,estado,fecha_nacimiento,peso_actual,lote_id,potrero_id)
   VALUES(tag,sex,cat,'ACTIVO',CASE WHEN kind='NACIMIENTO' THEN ts END,
   (d->>'kg')::float8/cardinality(tags),d->>'lote_destino_id',d->>'potrero_destino_id') RETURNING * INTO a;
   INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   IF a.peso_actual IS NOT NULL THEN INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(a.id,'PESAJE',a.peso_actual,ts); END IF;
  ELSE
   SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=tag;
   IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF a.fecha_nacimiento>ts OR EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND timestamp>ts) OR EXISTS(SELECT 1 FROM public.animal_movements WHERE animal_id=a.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF kind='TRASLADO' THEN
    IF d->>'lote_destino_id' IS NULL AND d->>'potrero_destino_id' IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
    INSERT INTO public.animal_movements(animal_id,potrero_origen_id,potrero_destino_id,lote_origen_id,lote_destino_id,fecha)
    VALUES(a.id,a.potrero_id,coalesce(d->>'potrero_destino_id',a.potrero_id),a.lote_id,coalesce(d->>'lote_destino_id',a.lote_id),ts);
    UPDATE public.animals SET potrero_id=coalesce(d->>'potrero_destino_id',potrero_id),lote_id=coalesce(d->>'lote_destino_id',lote_id) WHERE id=a.id;
   ELSE
    IF kind='VENTA' AND public.ganpro_animal_withdrawal(a.id,ts) THEN RAISE EXCEPTION 'GANPRO_WITHDRAWAL'; END IF;
    UPDATE public.animals SET estado=CASE WHEN kind='VENTA' THEN 'VENDIDO' ELSE 'MUERTO' END WHERE id=a.id;
    INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   END IF;
  END IF;
  ids=array_append(ids,a.id);
 END LOOP;
 IF plan.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE id=ANY(ids) AND categoria<>plan.categoria) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN
  amount=public.ganpro_finance_document(d||jsonb_build_object('tipo',CASE WHEN kind='VENTA' THEN 'INGRESO' ELSE 'GASTO' END,'categoria',kind,
   'descripcion',coalesce(d->>'notas',kind||' '||cardinality(tags)||' cabezas'),'cabezas',cardinality(tags),'animal_ids',to_jsonb(ids),
   'categoria_animal',(SELECT CASE WHEN count(DISTINCT categoria)=1 THEN min(categoria) END FROM public.animals WHERE id=ANY(ids)),
   'lote_id',(SELECT CASE WHEN count(DISTINCT lote_id)=1 THEN min(lote_id) END FROM public.animals WHERE id=ANY(ids))));
  IF kind='VENTA' THEN UPDATE public.animals SET venta_movimiento_id=amount->>'id' WHERE id=ANY(ids);
  ELSE UPDATE public.animals SET compra_movimiento_id=amount->>'id' WHERE id=ANY(ids); END IF;
  IF plan.id IS NOT NULL THEN UPDATE public.escenario_lineas SET movimiento_id=amount->>'id' WHERE id=plan.id; END IF;
 END IF;
 RETURN jsonb_build_object('message',kind||': '||cardinality(tags)||' animales registrados','id',amount->>'id');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261110000043_fixed_records.sql / SHA256 499a3ceb3b704f27e2b7a492a2cf0bc54e87cde6e8e393ab8048787ea6b88c40
CREATE FUNCTION public.ganpro_protect_feeding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('ganpro.command',true),'')='nutrition.deliver' THEN RETURN coalesce(NEW,OLD); END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.snapshot_formula IS NOT NULL OR NEW.costo_total IS NOT NULL OR EXISTS(SELECT 1 FROM public.racion_ingredientes i JOIN public.insumos_campo s ON s.suplemento_id=i.suplemento_id WHERE i.racion_id=NEW.racion_id) THEN RAISE EXCEPTION 'GANPRO_MANAGED_STOCK'; END IF;
 ELSIF OLD.snapshot_formula IS NOT NULL AND (TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['updated_at','server_updated_at','server_created_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','server_updated_at','server_created_at'])) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_feeding BEFORE INSERT OR UPDATE OR DELETE ON public.potrero_feeding_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_feeding();
REVOKE ALL ON FUNCTION public.ganpro_protect_feeding() FROM PUBLIC;

-- 20261110000044_inventory_receipt_clock.sql / SHA256 331da757fb12df622ce3ecb689d1b392f496c0f929859252571a7326205c201d
-- Logical receipts share the synchronization clock. Transaction-start timestamps can
-- precede a cut despite committing after it; these ticks cannot lose those operations.
ALTER TABLE public.inventario_cierres ADD COLUMN receipt_tick bigint NOT NULL DEFAULT 0;
ALTER TABLE public.command_audit ADD COLUMN recorded_tick bigint NOT NULL DEFAULT 0;
ALTER TABLE public.command_audit ALTER COLUMN recorded_tick SET DEFAULT public.ganpro_next_sync_ms();
ALTER TABLE public.insumo_movimientos ALTER COLUMN registrado_en SET DEFAULT public.ganpro_next_sync_ms();
CREATE OR REPLACE FUNCTION public.ganpro_inventory_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.animals; price numeric; animals jsonb:='[]'; supplies jsonb; heads int:=0; kg numeric:=0; val numeric:=0; supplies_value numeric;
 ident text; ts bigint:=public.ganpro_next_sync_ms(); wall_ms bigint:=(extract(epoch FROM clock_timestamp())*1000)::bigint; previous public.inventario_cierres; result jsonb; income numeric; expense numeric; consumption numeric; sold_kg numeric; bought_kg numeric; reversal_income numeric; reversal_expense numeric; missing_kg boolean; BEGIN
 IF (to_timestamp((d->>'fecha')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_CURRENT_SNAPSHOT'; END IF;
 IF EXISTS(SELECT 1 FROM public.inventario_cierres WHERE (to_timestamp(fecha/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF jsonb_typeof(d->'precios')<>'object' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.suplementos s WHERE stock_kg>0 AND NOT EXISTS(SELECT 1 FROM public.insumos_campo i WHERE i.suplemento_id=s.id)) THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
 FOR a IN SELECT * FROM public.animals WHERE estado='ACTIVO' LOOP
  price=public.ganpro_money(d->'precios'->>a.categoria);
  IF a.peso_actual IS NULL OR a.peso_actual<=0 THEN RAISE EXCEPTION 'GANPRO_MISSING_WEIGHT'; END IF;
  heads=heads+1;kg=kg+a.peso_actual;val=val+round(price*a.peso_actual::numeric,2);
  animals=animals||jsonb_build_array(jsonb_build_object('id',a.id,'categoria',a.categoria,'peso',a.peso_actual,'precio',price,'valor',round(price*a.peso_actual::numeric,2),'lote_id',a.lote_id,'potrero_id',a.potrero_id));
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'),coalesce(sum(valor),0) INTO supplies,supplies_value FROM public.insumos_campo s;
 SELECT * INTO previous FROM public.inventario_cierres ORDER BY fecha DESC LIMIT 1;
 IF FOUND THEN
  -- Receipt timestamps delimit captured operations; saved reports never reprice historical inputs.
  SELECT coalesce(sum(monto) FILTER(WHERE tipo='INGRESO'),0),coalesce(sum(monto) FILTER(WHERE tipo='GASTO' AND NOT es_inventario),0),coalesce(sum(m.kg) FILTER(WHERE categoria='VENTA'),0),coalesce(sum(m.kg) FILTER(WHERE categoria='COMPRA'),0)
  INTO income,expense,sold_kg,bought_kg FROM public.movimientos_financieros m WHERE m.server_created_at>previous.receipt_tick AND m.server_created_at<=ts AND anulado_en IS NULL;
  SELECT coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='INGRESO'),0),coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='GASTO' AND NOT (next->>'es_inventario')::boolean),0)
  INTO reversal_income,reversal_expense FROM public.command_audit JOIN public.movimientos_financieros original_doc ON original_doc.id=command_audit.record_id WHERE table_name='movimientos_financieros' AND command_audit.previous->>'anulado_en' IS NULL AND next->>'anulado_en' IS NOT NULL AND command_audit.recorded_tick>previous.receipt_tick AND command_audit.recorded_tick<=ts AND original_doc.server_created_at<=previous.receipt_tick;
  income=income+reversal_income;expense=expense+reversal_expense;
  SELECT EXISTS(SELECT 1 FROM public.movimientos_financieros m WHERE m.server_created_at>previous.receipt_tick AND m.server_created_at<=ts AND m.categoria IN('COMPRA','VENTA') AND m.kg IS NULL AND m.anulado_en IS NULL) INTO missing_kg;
  SELECT -coalesce(sum(valor),0) INTO consumption FROM public.insumo_movimientos WHERE origen='CONSUMO' AND registrado_en>previous.receipt_tick AND registrado_en<=ts;
  result=jsonb_build_object('desde',previous.fecha,'ingresos',income,'gastos',expense,'consumos',consumption,'variacion_animales',val-previous.valor_animales,
   'produccion_kg',CASE WHEN missing_kg THEN NULL ELSE sold_kg-bought_kg+kg-previous.kg END,'margen',income-expense-consumption+val-previous.valor_animales);
 END IF;
 INSERT INTO public.inventario_cierres(fecha,receipt_tick,cabezas,kg,valor_animales,valor_insumos,animales,insumos,resultado,actor_id)
 VALUES(wall_ms,ts,heads,kg,val,supplies_value,animals,supplies,result,auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Inventario físico y valuación conservados; comparación disponible desde el segundo corte');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_inventory_close(jsonb) FROM PUBLIC;

-- 20261111000045_historical_visual_tags.sql / SHA256 2ae08968f4f4524f739553395948c080d11c626674767fc4366aa720dafedc20
DROP INDEX IF EXISTS public.animals_visual_identity;
CREATE UNIQUE INDEX animals_visual_identity ON public.animals(upper(trim(id_caravana))) WHERE estado NOT IN('VENDIDO','MUERTO');
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE kind text:=d->>'tipo'; ts bigint:=(d->>'fecha')::bigint; tag text; tags text[];
 a public.animals; ids text[]:='{}'; cat text; sex text; amount jsonb; plan public.escenario_lineas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF kind IS NULL OR kind NOT IN('VENTA','COMPRA','MUERTE','NACIMIENTO','TRASLADO') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'caravanas');
 IF coalesce(cardinality(tags),0)=0 OR cardinality(tags)>1000 OR EXISTS(SELECT 1 FROM unnest(tags) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'lote_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_destino_id')
 OR d->>'potrero_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=d->>'potrero_destino_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF d->>'kg' IS NOT NULL AND (d->>'kg' !~ '^\d{1,9}(\.\d{1,4})?$' OR (d->>'kg')::numeric<=0 OR (d->>'kg')::numeric>9999*cardinality(tags)) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN PERFORM public.ganpro_money(d->>'monto'); END IF;
 IF kind='VENTA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'escenario_linea_id' IS NOT NULL THEN
  SELECT * INTO plan FROM public.escenario_lineas WHERE id=d->>'escenario_linea_id';
  IF NOT FOUND OR plan.movimiento_id IS NOT NULL OR plan.tipo<>kind OR plan.cabezas<>cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 FOREACH tag IN ARRAY tags LOOP
  IF kind IN('COMPRA','NACIMIENTO') THEN
   sex=coalesce(d->>'sexo','H'); cat=coalesce(d->>'categoria',CASE WHEN sex='M' THEN 'Ternero' ELSE 'Ternera' END);
   IF kind='NACIMIENTO' AND cat NOT IN('Ternero','Ternera') THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
   INSERT INTO public.animals(id_caravana,sexo,categoria,estado,fecha_nacimiento,peso_actual,lote_id,potrero_id)
   VALUES(tag,sex,cat,'ACTIVO',CASE WHEN kind='NACIMIENTO' THEN ts END,
   (d->>'kg')::float8/cardinality(tags),d->>'lote_destino_id',d->>'potrero_destino_id') RETURNING * INTO a;
   INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   IF a.peso_actual IS NOT NULL THEN INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(a.id,'PESAJE',a.peso_actual,ts); END IF;
  ELSE
   SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=tag AND estado='ACTIVO';
   IF NOT FOUND THEN
    IF EXISTS(SELECT 1 FROM public.animals WHERE upper(trim(id_caravana))=tag) THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
    RAISE EXCEPTION 'GANPRO_NOT_FOUND';
   END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF a.fecha_nacimiento>ts OR EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND timestamp>ts) OR EXISTS(SELECT 1 FROM public.animal_movements WHERE animal_id=a.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF kind='TRASLADO' THEN
    IF d->>'lote_destino_id' IS NULL AND d->>'potrero_destino_id' IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
    INSERT INTO public.animal_movements(animal_id,potrero_origen_id,potrero_destino_id,lote_origen_id,lote_destino_id,fecha)
    VALUES(a.id,a.potrero_id,coalesce(d->>'potrero_destino_id',a.potrero_id),a.lote_id,coalesce(d->>'lote_destino_id',a.lote_id),ts);
    UPDATE public.animals SET potrero_id=coalesce(d->>'potrero_destino_id',potrero_id),lote_id=coalesce(d->>'lote_destino_id',lote_id) WHERE id=a.id;
   ELSE
    IF kind='VENTA' AND public.ganpro_animal_withdrawal(a.id,ts) THEN RAISE EXCEPTION 'GANPRO_WITHDRAWAL'; END IF;
    UPDATE public.animals SET estado=CASE WHEN kind='VENTA' THEN 'VENDIDO' ELSE 'MUERTO' END WHERE id=a.id;
    INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   END IF;
  END IF;
  ids=array_append(ids,a.id);
 END LOOP;
 IF plan.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE id=ANY(ids) AND categoria<>plan.categoria) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN
  amount=public.ganpro_finance_document(d||jsonb_build_object('tipo',CASE WHEN kind='VENTA' THEN 'INGRESO' ELSE 'GASTO' END,'categoria',kind,
   'descripcion',coalesce(d->>'notas',kind||' '||cardinality(tags)||' cabezas'),'cabezas',cardinality(tags),'animal_ids',to_jsonb(ids),
   'categoria_animal',(SELECT CASE WHEN count(DISTINCT categoria)=1 THEN min(categoria) END FROM public.animals WHERE id=ANY(ids)),
   'lote_id',(SELECT CASE WHEN count(DISTINCT lote_id)=1 THEN min(lote_id) END FROM public.animals WHERE id=ANY(ids))));
  IF kind='VENTA' THEN UPDATE public.animals SET venta_movimiento_id=amount->>'id' WHERE id=ANY(ids);
  ELSE UPDATE public.animals SET compra_movimiento_id=amount->>'id' WHERE id=ANY(ids); END IF;
  IF plan.id IS NOT NULL THEN UPDATE public.escenario_lineas SET movimiento_id=amount->>'id' WHERE id=plan.id; END IF;
 END IF;
 RETURN jsonb_build_object('message',kind||': '||cardinality(tags)||' animales registrados','id',amount->>'id');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261111000046_unambiguous_tag_lookups.sql / SHA256 89cea030a7279dce80478e836f4cf23e75a71fb3536e00eea039377215d2e043
CREATE OR REPLACE FUNCTION public.ganpro_stock_import(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; a public.animals; aid text; bid text; nuevos int:=0; pesadas int:=0; ts bigint; BEGIN
 IF jsonb_typeof(d->'filas')<>'array' OR jsonb_array_length(d->'filas')>2000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'filas') x WHERE nullif(x->>'caravana','') IS NOT NULL GROUP BY upper(trim(x->>'caravana')) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'filas') x WHERE nullif(x->>'rfid','') IS NOT NULL GROUP BY trim(x->>'rfid') HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_TAG'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'filas') LOOP
  aid=NULL; bid=NULL;
  SELECT id INTO aid FROM public.animals WHERE trim(rfid)=nullif(trim(item->>'rfid'),'');
  SELECT id INTO bid FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(item->>'caravana')) AND estado NOT IN('VENDIDO','MUERTO');
  IF aid IS NOT NULL AND bid IS NOT NULL AND aid<>bid THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  aid=coalesce(aid,bid); ts=coalesce((item->>'fecha')::bigint,public.ganpro_now_ms());
  IF ts>public.ganpro_now_ms()+86400000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF aid IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(item->>'caravana'))) THEN RAISE EXCEPTION 'GANPRO_REUSED_TAG_REVIEW'; END IF;
   aid=gen_random_uuid()::text;
   INSERT INTO public.animals(id,id_caravana,rfid,sexo,categoria,raza,peso_actual,lote_id,potrero_id)
   VALUES(aid,coalesce(nullif(item->>'caravana',''),'RFID-'||(item->>'rfid')),nullif(item->>'rfid',''),
    coalesce(item->>'sexo',d->>'sexo'),coalesce(item->>'categoria',d->>'categoria'),item->>'raza',(item->>'peso')::float8,d->>'lote_id',d->>'potrero_id');
   nuevos=nuevos+1;
  ELSE
   SELECT * INTO a FROM public.animals WHERE id=aid;
   IF nullif(item->>'rfid','') IS NOT NULL AND a.rfid IS NOT NULL AND trim(a.rfid)<>trim(item->>'rfid') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=aid AND tipo='PESAJE' AND timestamp>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF item->>'peso' IS NOT NULL THEN UPDATE public.animals SET peso_actual=(item->>'peso')::float8 WHERE id=aid; END IF;
  END IF;
  IF item->>'peso' IS NOT NULL THEN
   INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(aid,'PESAJE',(item->>'peso')::float8,ts); pesadas=pesadas+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('message',nuevos||' animales nuevos, '||pesadas||' pesadas registradas');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_import(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.ganpro_repro_stage(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cycle public.repro_ciclos; mother public.animals; calf public.animals; ts bigint:=(d->>'fecha')::bigint; weight numeric:=(d->>'peso')::numeric; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO cycle FROM public.repro_ciclos WHERE id=d->>'id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts<coalesce(cycle.fecha_destete,cycle.fecha_parto,cycle.fecha_tacto,cycle.fecha_servicio) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 SELECT * INTO mother FROM public.animals WHERE id=cycle.madre_id;
 IF d->>'etapa'='TACTO' THEN
  IF cycle.estado<>'SERVIDA' OR d->>'resultado' NOT IN('PRENADA','VACIA') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.repro_ciclos SET estado=d->>'resultado',fecha_tacto=ts WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'TACTO',ts,CASE WHEN d->>'resultado'='PRENADA' THEN 'tacto:prenada' ELSE 'tacto:vacia' END);
 ELSIF d->>'etapa'='PARTO' THEN
  IF cycle.estado<>'PRENADA' OR mother.estado<>'ACTIVO' OR weight IS NULL OR weight<=0 OR d->>'sexo' NOT IN('M','H') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  SELECT lote_id,potrero_id INTO mother.lote_id,mother.potrero_id FROM public.ganpro_animals_at(ts) WHERE id=mother.id;
  PERFORM public.ganpro_stock_movement(jsonb_build_object('tipo','NACIMIENTO','fecha',ts,'caravanas',jsonb_build_array(d->>'caravana'),'sexo',d->>'sexo','categoria',CASE WHEN d->>'sexo'='M' THEN 'Ternero' ELSE 'Ternera' END,'kg',weight,'lote_destino_id',mother.lote_id,'potrero_destino_id',mother.potrero_id));
  SELECT * INTO calf FROM public.animals WHERE id_caravana=upper(trim(d->>'caravana')) AND estado='ACTIVO';
  UPDATE public.animals SET madre_id=mother.id,padre_id=cycle.padre_id WHERE id=calf.id;
  UPDATE public.repro_ciclos SET estado='PARIDA',fecha_parto=ts,ternero_id=calf.id WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'PARTO',ts,'Cría: '||calf.id_caravana);
 ELSIF d->>'etapa'='PERDIDA' THEN
  IF cycle.estado NOT IN('SERVIDA','PRENADA','PARIDA') OR (cycle.ternero_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE id=cycle.ternero_id AND estado='ACTIVO')) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.repro_ciclos SET estado='PERDIDA' WHERE id=cycle.id;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(mother.id,'PERDIDA_REPRODUCTIVA',ts,'Cierre de ciclo por pérdida');
 ELSIF d->>'etapa'='DESTETE' THEN
  IF cycle.estado<>'PARIDA' OR weight IS NULL OR weight<=0 OR weight>9999 THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  SELECT * INTO calf FROM public.animals WHERE id=cycle.ternero_id AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  IF EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=calf.id AND timestamp>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,valor,notas) VALUES(calf.id,'DESTETE',ts,weight,'Madre: '||mother.id_caravana),(calf.id,'PESAJE',ts,weight,'Pesada de destete');
  UPDATE public.animals SET peso_actual=weight WHERE id=calf.id;
  UPDATE public.repro_ciclos SET estado='DESTETADA',fecha_destete=ts,peso_destete=weight WHERE id=cycle.id;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 RETURN jsonb_build_object('message','Etapa, genealogía y stock actualizados juntos');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_repro_stage(jsonb) FROM PUBLIC;

-- 20261111000047_reactivation_identity_guard.sql / SHA256 afc87ee5a7438ec22a610aae191ea530d708263455917dabee6dbd3de1785b29
CREATE OR REPLACE FUNCTION public.ganpro_finance_void(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; a public.animals; ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'id' AND ledger_version=1 AND anulado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 PERFORM public.ganpro_assert_open(coalesce(doc.adopcion_fecha,doc.fecha));
 IF doc.categoria IN('VENTA','COMPRA') AND coalesce(cardinality(doc.animal_ids),0)=0 THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 IF ts<coalesce(doc.adopcion_fecha,doc.fecha) OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=doc.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF public.ganpro_paid(doc.id)<>0 OR nullif(trim(d->>'motivo'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 FOREACH ident IN ARRAY coalesce(doc.animal_ids,'{}') LOOP
  SELECT * INTO a FROM public.animals WHERE id=ident;
  IF NOT FOUND OR (doc.categoria='VENTA' AND (a.estado<>'VENDIDO' OR a.venta_movimiento_id IS DISTINCT FROM doc.id)) OR (doc.categoria='COMPRA' AND (a.estado<>'ACTIVO' OR a.compra_movimiento_id IS DISTINCT FROM doc.id)) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF doc.categoria='VENTA' AND EXISTS(SELECT 1 FROM public.animals other WHERE other.id<>a.id AND upper(trim(other.id_caravana))=upper(trim(a.id_caravana)) AND other.estado NOT IN('VENDIDO','MUERTO')) THEN RAISE EXCEPTION 'GANPRO_TAG_REUSE_CONFLICT'; END IF;
  IF doc.categoria='COMPRA' THEN
   -- Retain identity and history: an annulled purchase is an exit, not a DELETE.
   UPDATE public.animals SET estado='DESCARTE',compra_movimiento_id=NULL WHERE id=a.id;
  ELSE UPDATE public.animals SET estado='ACTIVO',venta_movimiento_id=NULL WHERE id=a.id; END IF;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,valor,notas) VALUES(a.id,'ANULACION',ts,CASE WHEN doc.categoria='VENTA' THEN 1 ELSE -1 END,'Reversión de comprobante '||doc.id||': '||(d->>'motivo'));
 END LOOP;
 UPDATE public.movimientos_financieros SET anulado_en=ts WHERE id=doc.id;
 UPDATE public.escenario_lineas SET movimiento_id=NULL WHERE movimiento_id=doc.id;
 RETURN jsonb_build_object('message','Comprobante anulado con historial');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_void(jsonb) FROM PUBLIC;

-- Refrescar el catálogo de PostgREST una vez confirmada la transacción.
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Los tres deben devolver true después de una ejecución completa.
SELECT
 to_regprocedure('public.ganpro_ledger_snapshot(text)') IS NOT NULL AS finanzas_instaladas,
 to_regprocedure('public.ganpro_management_snapshot()') IS NOT NULL AS gestion_instalada,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventario_cierres' AND column_name='receipt_tick') AS ultima_migracion_instalada;
