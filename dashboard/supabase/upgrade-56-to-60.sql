-- GANPRO: base con migraciones 01–56 completas. Ejecutar TODO junto.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $preflight$
BEGIN
 IF to_regprocedure('public.ganpro_schedule_status(jsonb)') IS NULL OR to_regprocedure('public.ganpro_stock_movement_v50(jsonb)') IS NULL OR to_regprocedure('public.ganpro_stock_save_v47(jsonb)') IS NULL THEN RAISE EXCEPTION 'Se requieren las migraciones 01–56 completas. No se modificó nada.'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movimientos_financieros' AND column_name='desbaste_pct') OR to_regprocedure('public.ganpro_stock_capabilities()') IS NOT NULL THEN RAISE EXCEPTION 'Ya hay cambios 57+. Revisar migraciones aplicadas antes de continuar.'; END IF;
END
$preflight$;

-- 20261111000057_trade_conditions.sql / SHA256 ded53d6267b96528d066ddb79bbd03cb24554a8de23f9e0938ab28b9c3688bae
ALTER TABLE public.movimientos_financieros
 ADD COLUMN desbaste_pct numeric(5,2) CHECK(desbaste_pct BETWEEN 0 AND 20),
 ADD COLUMN kg_facturados numeric(16,2) CHECK(kg_facturados>0),
 ADD COLUMN plazo_dias int CHECK(plazo_dias BETWEEN 0 AND 365),
 ADD COLUMN metodo_pago text CHECK(metodo_pago IN('A_CONVENIR','TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO')),
 ADD COLUMN condiciones text CHECK(length(condiciones)<=1000);
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tags jsonb; ids text[]; n int; price numeric; total numeric; details jsonb; shrink numeric:=coalesce((d->>'desbaste_pct')::numeric,0); billed numeric; days_ int:=(d->>'plazo_dias')::int; due_ bigint; BEGIN
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
 IF nullif(d->>'categoria_filtro','') IS NOT NULL AND d->>'tipo' NOT IN('COMPRA','NACIMIENTO') AND EXISTS(SELECT 1 FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' AND categoria<>d->>'categoria_filtro') THEN RAISE EXCEPTION 'GANPRO_CATEGORY_SELECTION'; END IF;
 IF shrink<0 OR shrink>20 OR shrink='NaN'::numeric OR (days_ IS NOT NULL AND days_ NOT BETWEEN 0 AND 365) OR length(d->>'condiciones')>1000 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
 IF days_ IS NOT NULL AND d->>'tipo' IN('VENTA','COMPRA') THEN
  due_=(extract(epoch FROM (((to_timestamp((d->>'fecha')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+days_+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000)::bigint-1;
  IF d->>'vencimiento' IS NOT NULL AND (to_timestamp((d->>'vencimiento')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(to_timestamp(due_/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
  d=d||jsonb_build_object('vencimiento',due_);
 END IF;
 IF d->>'tipo' IN('VENTA','COMPRA') AND d->>'modalidad_precio' IS NOT NULL THEN
  price=public.ganpro_money(d->>'precio_unitario');
  IF d->>'modalidad_precio'='KG' THEN
   IF d->>'kg' IS NULL OR (d->>'kg')::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   billed=round((d->>'kg')::numeric*(1-shrink/100),2);
   IF billed<=0 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
   total=round(billed*price,2);
  ELSIF d->>'modalidad_precio'='CABEZA' THEN
   IF shrink<>0 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
   total=price*n;
  ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF d->>'tipo'='COMPRA' THEN details=jsonb_build_array(jsonb_build_object('categoria',d->>'categoria','cabezas',n));
  ELSE SELECT jsonb_agg(to_jsonb(x)) INTO details FROM(SELECT categoria,count(*) cabezas FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' GROUP BY categoria) x; END IF;
  d=d||jsonb_build_object('monto',total::text,'detalle_categorias',details,'kg_facturados',billed,'desbaste_pct',shrink);
 END IF;
 RETURN public.ganpro_stock_movement_v50(d);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement_v50(jsonb),public.ganpro_stock_movement(jsonb) FROM PUBLIC;

-- 20261111000058_payment_conditions.sql / SHA256 aa264cc89b48c858d61e870cb8e8e6796ed711df9649c411553f34c2be8a6dc4
ALTER TABLE public.asientos_caja ADD COLUMN metodo_pago text CHECK(metodo_pago IN('TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO'));
ALTER FUNCTION public.ganpro_finance_settle(jsonb) RENAME TO ganpro_finance_settle_v56;
CREATE FUNCTION public.ganpro_finance_settle(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result jsonb; method_ text:=nullif(d->>'metodo_pago','A_CONVENIR'); BEGIN
 IF method_ IS NOT NULL AND method_ NOT IN('TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO') THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
 result=public.ganpro_finance_settle_v56(d);
 UPDATE public.asientos_caja SET metodo_pago=method_ WHERE id=result->>'id';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_settle_v56(jsonb),public.ganpro_finance_settle(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids,modalidad_precio,precio_unitario,detalle_categorias,desbaste_pct,kg_facturados,plazo_dias,metodo_pago,condiciones)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]'))),d->>'modalidad_precio',(d->>'precio_unitario')::numeric,d->'detalle_categorias',(d->>'desbaste_pct')::numeric,(d->>'kg_facturados')::numeric,(d->>'plazo_dias')::int,d->>'metodo_pago',d->>'condiciones') RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts,'metodo_pago',d->>'metodo_pago'));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_document(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ganpro_ledger_snapshot(p_month text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE start_ms bigint; end_ms bigint; cutoff bigint; accounts jsonb; docs jsonb; entries jsonb; totals jsonb; legacy jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 start_ms=extract(epoch FROM ((p_month||'-01')::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 end_ms=extract(epoch FROM (((p_month||'-01')::date+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 cutoff=least(end_ms,extract(epoch FROM (((clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'saldo',saldo::text,'fecha_apertura',fecha_apertura) ORDER BY nombre),'[]') INTO accounts
 FROM(SELECT c.*,c.saldo_inicial+coalesce((SELECT sum(monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND fecha<end_ms),0) saldo FROM public.cuentas_caja c WHERE fecha_apertura<end_ms) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'metodo_pago',q.metodo_pago,'plazo_dias',q.plazo_dias,'condiciones',q.condiciones,'pendiente',(amount-paid)::text) ORDER BY fecha DESC,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'cuenta_id',cuenta_id,'movimiento_id',movimiento_id,'transferencia_id',transferencia_id,'reversa_de',reversa_de,'monto',a.monto::text,'fecha',a.fecha,'motivo',a.motivo,'metodo_pago',a.metodo_pago) ORDER BY a.fecha DESC,a.created_at DESC),'[]') INTO entries FROM public.asientos_caja a WHERE a.fecha<end_ms;
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



-- 20261111000059_stock_groups_history.sql / SHA256 a5c22c71c8e0a48f8e2315a2f633b415b37ea0927bef0d9bb1587f3c19f35838
CREATE OR REPLACE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
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
 IF previous.id IS NOT NULL AND previous.categoria IS DISTINCT FROM d->>'categoria' THEN INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(previous.id,'RECATEGORIZACION',public.ganpro_now_ms(),previous.categoria||' → '||(d->>'categoria')); END IF;
 IF previous.id IS NULL THEN INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(result->>'id','ALTA_INICIAL',public.ganpro_now_ms(),'Alta de stock inicial; no es una compra ni un nacimiento'); END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.ganpro_lot_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); old_ public.lotes; name_ text:=nullif(trim(d->>'nombre'),''); BEGIN
 IF name_ IS NULL OR length(name_)>200 OR length(d->>'descripcion')>1000 OR (d->>'hectareas')::numeric<0 OR (d->>'costo_alquiler_ha')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.lotes WHERE lower(trim(nombre))=lower(name_) AND id<>ident) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_LOT'; END IF;
 SELECT * INTO old_ FROM public.lotes WHERE id=ident;
 IF FOUND THEN
  IF (d->>'expected_version')::bigint IS DISTINCT FROM old_.server_updated_at THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.lotes SET nombre=name_,descripcion=d->>'descripcion',ubicacion=d->>'ubicacion',hectareas=(d->>'hectareas')::float8,costo_alquiler_ha=(d->>'costo_alquiler_ha')::float8 WHERE id=ident;
 ELSE
  IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
  INSERT INTO public.lotes(id,nombre,descripcion,ubicacion,hectareas,costo_alquiler_ha) VALUES(ident,name_,d->>'descripcion',d->>'ubicacion',(d->>'hectareas')::float8,(d->>'costo_alquiler_ha')::float8);
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Lote ganadero guardado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_lot_save(jsonb),public.ganpro_stock_save(jsonb) FROM PUBLIC;

-- 20261111000060_stock_contract.sql / SHA256 f8bbb0446acb4c844fbe1aba9ba1226b67defe9be515dfcc060c4452b0bb5451
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
 WHEN 'stock.lot-save' THEN result=public.ganpro_lot_save(p_data);
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
CREATE FUNCTION public.ganpro_stock_capabilities() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE dispatcher text; stock_ text; BEGIN
 IF auth.uid() IS NULL OR coalesce(public.ganpro_rol(),'') NOT IN('admin','campo','asesor') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 SELECT pg_get_functiondef('public.ganpro_command(text,uuid,jsonb)'::regprocedure) INTO dispatcher;
 SELECT pg_get_functiondef('public.ganpro_stock_movement(jsonb)'::regprocedure) INTO stock_;
 RETURN jsonb_build_object('version',60,'intake',position('WHEN ''stock.generic''' IN dispatcher)>0 AND to_regprocedure('public.ganpro_stock_generic(jsonb)') IS NOT NULL,'movement',position('jsonb_array_elements_text(d->''animal_ids'')' IN stock_)>0 AND position('desbaste_pct' IN stock_)>0 AND to_regprocedure('public.ganpro_finance_settle_v56(jsonb)') IS NOT NULL AND position('kg_facturados' IN pg_get_functiondef('public.ganpro_finance_document(jsonb)'::regprocedure))>0,'lots',position('WHEN ''stock.lot-save''' IN dispatcher)>0 AND to_regprocedure('public.ganpro_lot_save(jsonb)') IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_capabilities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_stock_capabilities() TO authenticated;
NOTIFY pgrst, 'reload schema';

NOTIFY pgrst, 'reload schema';
COMMIT;
