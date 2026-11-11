-- GANPRO: base con migraciones 01–47 completas. Sin seeds ni datos demo.
-- Ejecutar TODO junto. No usar en una base con actualizaciones parciales.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $preflight$
BEGIN
 IF to_regprocedure('public.ganpro_stock_save(jsonb)') IS NULL
 OR to_regprocedure('public.ganpro_finance_void(jsonb)') IS NULL
 OR position('GANPRO_TAG_REUSE_CONFLICT' IN pg_get_functiondef(to_regprocedure('public.ganpro_finance_void(jsonb)')))=0
 OR to_regclass('public.inventario_cierres') IS NULL THEN
  RAISE EXCEPTION 'Se requieren las migraciones 01–47 completas. No se modificó nada.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='animals' AND column_name='visual_pendiente') THEN
  RAISE EXCEPTION 'Stock ya contiene cambios 48+. Revisar migraciones aplicadas; no se modificó nada.';
 END IF;
END
$preflight$;

-- 20261111000048_generic_stock.sql / SHA256 41ed23b77d15785da12cab989e0e9bf1a225b2142b838987ee944a8b62bdc0a8
ALTER TABLE public.animals ADD COLUMN visual_pendiente boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.ganpro_pending_visual(a public.animals) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT a.visual_pendiente OR a.id_caravana ~* '^SIN-CARAVANA-[a-z0-9-]{12,64}$' OR (a.rfid IS NOT NULL AND a.id_caravana IN(a.rfid,'RFID-'||a.rfid))
$$;
CREATE FUNCTION public.ganpro_stamp_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.visual_pendiente=NEW.id_caravana ~* '^SIN-CARAVANA-[a-z0-9-]{12,64}$' OR coalesce(NEW.id_caravana IN(NEW.rfid,'RFID-'||NEW.rfid),false);
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_identity BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_stamp_identity();
ALTER FUNCTION public.ganpro_stock_save(jsonb) RENAME TO ganpro_stock_save_v47;
CREATE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE previous public.animals; visual text:=nullif(trim(d->>'id_caravana'),''); result jsonb; BEGIN
 IF d->>'id' IS NOT NULL THEN SELECT * INTO previous FROM public.animals WHERE id=d->>'id'; END IF;
 IF visual IS NULL THEN
  IF previous.id IS NOT NULL AND NOT public.ganpro_pending_visual(previous) AND previous.id_caravana IS DISTINCT FROM d->>'rfid' THEN RAISE EXCEPTION 'GANPRO_VISUAL_REQUIRED'; END IF;
  visual=coalesce(previous.id_caravana,'SIN-CARAVANA-'||gen_random_uuid()::text);
 ELSIF visual ~* '^SIN-CARAVANA-' AND visual IS DISTINCT FROM previous.id_caravana THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 result=public.ganpro_stock_save_v47(d||jsonb_build_object('id_caravana',visual));
 IF previous.id IS NOT NULL AND (upper(trim(previous.id_caravana))<>upper(trim(visual)) OR previous.rfid IS DISTINCT FROM nullif(d->>'rfid','')) THEN
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(previous.id,'IDENTIFICACION',public.ganpro_now_ms(),'Identificación actualizada conservando la ficha y su historial');
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.ganpro_stock_generic(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE n int:=(d->>'cantidad')::int; i int; BEGIN
 IF n IS NULL OR n NOT BETWEEN 1 AND 500 OR d ? 'id' OR d ? 'rfid' OR d ? 'id_caravana' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR i IN 1..n LOOP PERFORM public.ganpro_stock_save(d-'cantidad'); END LOOP;
 RETURN jsonb_build_object('message',n||' animales sin caravana incorporados al stock inicial');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_save_v47(jsonb),public.ganpro_stock_save(jsonb),public.ganpro_stock_generic(jsonb),public.ganpro_pending_visual(public.animals),public.ganpro_stamp_identity() FROM PUBLIC;

-- 20261111000049_stock_readings.sql / SHA256 3c2a56fd3ca6cb6f8c59f710a64a50883dc2d1031cef5a4cbf70e09465b7d54f
CREATE FUNCTION public.ganpro_stock_readings(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE r jsonb; a public.animals; eid text; visual text; data_ jsonb; ts bigint; created_ int:=0; linked_ int:=0; known_ int:=0; result jsonb; BEGIN
 IF jsonb_typeof(d->'lecturas')<>'array' OR jsonb_array_length(d->'lecturas') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'lecturas') x GROUP BY upper(trim(x->>'rfid')) HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_TAG'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(d->'lecturas') LOOP
  a=NULL;eid=upper(trim(r->>'rfid'));visual=nullif(trim(r->>'visual'),'');ts=(r->>'captured_at')::bigint;
  IF eid IS NULL OR eid !~ '^[A-Z0-9-]{6,24}$' OR ts IS NULL OR ts<=0 OR ts>public.ganpro_now_ms()+60000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT * INTO a FROM public.animals WHERE trim(rfid)=eid;
  IF a.id IS NULL THEN SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=eid AND rfid IS NULL AND estado='ACTIVO'; END IF;
  IF a.id IS NOT NULL THEN
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF r->>'animal_id' IS NOT NULL AND r->>'animal_id'<>a.id THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   known_=known_+1;
  ELSIF r->>'animal_id' IS NOT NULL THEN
   SELECT * INTO a FROM public.animals WHERE id=r->>'animal_id' AND estado='ACTIVO' AND rfid IS NULL;
   IF NOT FOUND OR NOT public.ganpro_pending_visual(a) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   linked_=linked_+1;
  ELSE
   IF visual IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE upper(trim(id_caravana))=upper(visual) AND estado NOT IN('VENDIDO','MUERTO')) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   created_=created_+1;
  END IF;
  IF a.id IS NOT NULL THEN
   IF r ? 'expected_version' AND (r->>'expected_version')::bigint<>a.server_updated_at THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   IF NOT r ? 'expected_version' AND (r->>'animal_id' IS NOT NULL OR r->>'peso' IS NOT NULL OR visual IS NOT NULL) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
   IF r->>'peso' IS NOT NULL AND EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND tipo='PESAJE' AND timestamp>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   data_=to_jsonb(a)||jsonb_build_object('expected_version',a.server_updated_at,'rfid',eid,'id_caravana',coalesce(visual,a.id_caravana),'peso_actual',a.peso_actual);
  ELSE
   data_=(d-'lecturas')||jsonb_build_object('rfid',eid,'id_caravana',visual,'peso_actual',NULL);
  END IF;
  IF a.fecha_nacimiento>ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
  result=public.ganpro_stock_save(data_);
  IF r->>'peso' IS NOT NULL THEN
   IF (r->>'peso')::numeric<=0 OR (r->>'peso')::numeric>9999 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   UPDATE public.animals SET peso_actual=(r->>'peso')::numeric WHERE id=result->>'id';
   INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(result->>'id','PESAJE',(r->>'peso')::numeric,ts);
  END IF;
 END LOOP;
 RETURN jsonb_build_object('message',created_||' nuevos · '||linked_||' vinculados a pendientes · '||known_||' ya registrados. Sesión confirmada completa.');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_readings(jsonb) FROM PUBLIC;

-- 20261111000050_stock_intake_dispatcher.sql / SHA256 3a4af3daccdec24dfe8c28c71f5612942b784367d20678fe4fc39f6c3145b2c7
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
 WHEN 'stock.generic' THEN result=public.ganpro_stock_generic(p_data);
 WHEN 'stock.readings' THEN result=public.ganpro_stock_readings(p_data);
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

-- 20261111000051_commercial_details.sql / SHA256 d329debe4765d22638a079e919e60bafb78c72d524f5c19eb3198493d9469bdf
ALTER TABLE public.movimientos_financieros ADD COLUMN modalidad_precio text CHECK(modalidad_precio IN('KG','CABEZA')),
 ADD COLUMN precio_unitario numeric(16,2),ADD COLUMN detalle_categorias jsonb;
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
 IF kind='VENTA' AND coalesce(d->>'modalidad_precio','KG')<>'CABEZA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
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

-- 20261111000052_optional_trade_metadata.sql / SHA256 ead580e7c3084166add7a3f37f9c3113f86e10e295ef0ac636ea964b7e54593e
CREATE OR REPLACE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids,modalidad_precio,precio_unitario,detalle_categorias)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]'))),d->>'modalidad_precio',(d->>'precio_unitario')::numeric,d->'detalle_categorias') RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_document(jsonb) FROM PUBLIC;

-- 20261111000053_trade_selection.sql / SHA256 2c3326d6e9a50de4d29892de9aaf90b5688fe91565ceb386a6693d22e30f7825
ALTER FUNCTION public.ganpro_stock_movement(jsonb) RENAME TO ganpro_stock_movement_v50;
CREATE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tags jsonb; ids text[]; n int; price numeric; total numeric; details jsonb; BEGIN
 IF d ? 'animal_ids' THEN
  IF jsonb_typeof(d->'animal_ids')<>'array' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT array_agg(value) INTO ids FROM jsonb_array_elements_text(d->'animal_ids');
  IF coalesce(cardinality(ids),0)=0 OR cardinality(ids)>1000 OR EXISTS(SELECT 1 FROM unnest(ids) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT jsonb_agg(id_caravana) INTO tags FROM public.animals WHERE id=ANY(ids) AND estado='ACTIVO';
  IF coalesce(jsonb_array_length(tags),0)<>cardinality(ids) THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  d=d||jsonb_build_object('caravanas',tags);
 ELSIF d->>'tipo' IN('COMPRA','NACIMIENTO') AND coalesce(jsonb_array_length(d->'caravanas'),0)=0 THEN
  n=(d->>'cantidad')::int;
  IF n IS NULL OR n NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT jsonb_agg('SIN-CARAVANA-'||gen_random_uuid()::text) INTO tags FROM generate_series(1,n);
  d=d||jsonb_build_object('caravanas',tags);
 END IF;
 n=jsonb_array_length(d->'caravanas');
 IF d->>'tipo' IN('VENTA','COMPRA') AND d->>'modalidad_precio' IS NOT NULL THEN
  price=public.ganpro_money(d->>'precio_unitario');
  IF d->>'modalidad_precio'='KG' THEN
   IF d->>'kg' IS NULL OR (d->>'kg')::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   total=round((d->>'kg')::numeric*price,2);
  ELSIF d->>'modalidad_precio'='CABEZA' THEN total=price*n;
  ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF d->>'tipo'='COMPRA' THEN details=jsonb_build_array(jsonb_build_object('categoria',d->>'categoria','cabezas',n));
  ELSE SELECT jsonb_agg(to_jsonb(x)) INTO details FROM(SELECT categoria,count(*) cabezas FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' GROUP BY categoria) x; END IF;
  d=d||jsonb_build_object('monto',total::text,'detalle_categorias',details);
 END IF;
 RETURN public.ganpro_stock_movement_v50(d);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement_v50(jsonb),public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261111000054_calendar_status.sql / SHA256 dc2476efc8e933e58663ba7bc2042d9140a630306af4d5c8094f0a8b21e1d7e1
CREATE FUNCTION public.ganpro_schedule_status(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF d->>'estado' NOT IN('PENDIENTE','CANCELADO') THEN RAISE EXCEPTION 'GANPRO_SCHEDULE_APPLICATION'; END IF;
 UPDATE public.scheduled_operations SET estado=d->>'estado' WHERE id=d->>'id' AND estado<>'COMPLETADO';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 RETURN jsonb_build_object('message',CASE WHEN d->>'estado'='CANCELADO' THEN 'Programación cancelada' ELSE 'Programación pendiente' END);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_schedule_status(jsonb) FROM PUBLIC;

-- 20261111000055_whole_herd_schedule.sql / SHA256 ac77a29dac3880494df193742f48b8cbe1bf11149c313fb6dba61c92f35e1cff
CREATE OR REPLACE FUNCTION public.ganpro_capture_recipients() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; unit_cost numeric; used jsonb; supply public.insumos_campo; BEGIN
 INSERT INTO public.aplicacion_animales(aplicacion_id,animal_id)
 SELECT NEW.id,a.id FROM public.ganpro_animals_at(NEW.fecha_aplicacion) a
 WHERE (NEW.animal_id IS NOT NULL AND a.id=NEW.animal_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NOT NULL AND a.lote_id=NEW.lote_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NULL);
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
 ELSIF d->>'destino'='rodeo' THEN NULL;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable,insumo_id,partida_id)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable',d->>'insumo_id',d->>'partida_id');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot AND estado='PENDIENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_capture_recipients(),public.ganpro_health_apply(jsonb) FROM PUBLIC;

-- 20261111000056_operation_dispatcher.sql / SHA256 42a53bdec6649d1092568b5845023493beedc1a43afdcacabceba81a77f8e50f
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
 WHEN 'health.schedule-status' THEN result=public.ganpro_schedule_status(p_data);
 WHEN 'stock.generic' THEN result=public.ganpro_stock_generic(p_data);
 WHEN 'stock.readings' THEN result=public.ganpro_stock_readings(p_data);
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

NOTIFY pgrst, 'reload schema';
COMMIT;
