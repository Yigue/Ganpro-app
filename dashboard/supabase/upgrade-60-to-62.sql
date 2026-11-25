-- GANPRO: base 01–60 completas. Ejecutar TODO junto; sin seed ni reset.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $preflight$ BEGIN
 IF to_regprocedure('public.ganpro_stock_capabilities()') IS NULL OR to_regprocedure('public.ganpro_lot_save(jsonb)') IS NULL
 OR to_regprocedure('public.ganpro_paid(text,bigint)') IS NULL OR to_regprocedure('public.ganpro_animals_at(bigint)') IS NULL
 OR to_regprocedure('public.ganpro_finance_settle_v56(jsonb)') IS NULL OR to_regclass('public.asientos_caja') IS NULL THEN
  RAISE EXCEPTION 'Se requieren las migraciones 01–60 completas. No se modificó nada.';
 END IF;
 IF to_regprocedure('public.ganpro_treasury_snapshot(bigint)') IS NOT NULL OR to_regprocedure('public.ganpro_service_create(jsonb)') IS NOT NULL OR to_regprocedure('public.ganpro_analysis_capabilities()') IS NOT NULL THEN
  RAISE EXCEPTION 'Ya existen cambios 61+. Revisar migraciones aplicadas; no se modificó nada.';
 END IF;
END $preflight$;

-- 20261124000061_treasury_snapshot.sql / SHA256 087b1dcc3f30c99ebece94797407215bfc23b4684ca0c62bc8dc848afdabc57b
CREATE FUNCTION public.ganpro_treasury_snapshot(p_as_of bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cash numeric; docs jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 p_as_of=coalesce(p_as_of,(extract(epoch FROM clock_timestamp())*1000)::bigint);
 IF p_as_of<0 OR p_as_of>(extract(epoch FROM clock_timestamp())*1000)::bigint THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 SELECT coalesce(sum(c.saldo_inicial+coalesce((SELECT sum(a.monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND a.fecha<=p_as_of),0)),0)
 INTO cash FROM public.cuentas_caja c WHERE c.fecha_apertura<=p_as_of;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,
 'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'pendiente',(amount-paid)::text) ORDER BY vencimiento,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,p_as_of+1) paid FROM public.movimientos_financieros m
 WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<=p_as_of AND (anulado_en IS NULL OR anulado_en>p_as_of)) q;
 RETURN jsonb_build_object('as_of',p_as_of,'saldo',cash::text,'documentos',docs);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_treasury_snapshot(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_treasury_snapshot(bigint) TO authenticated;

-- 20261124000062_service_command.sql / SHA256 ea0928a850702763366062a9a1d2318ecf7cd0f455da3d8a158ebf867eb3a13a
CREATE FUNCTION public.ganpro_service_create(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tags text[]; bulls text[]; mothers int; ident text; ts bigint:=(d->>'fecha_entrada')::bigint; finish bigint:=(d->>'fecha_salida')::bigint; BEGIN
 IF nullif(trim(d->>'temporada'),'') IS NULL OR ts IS NULL OR ts<=0 OR finish<ts THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'toros');
 IF coalesce(cardinality(tags),0)=0 OR EXISTS(SELECT 1 FROM unnest(tags) tag GROUP BY tag HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(id) INTO bulls FROM public.animals WHERE upper(trim(id_caravana))=ANY(tags) AND sexo='M' AND categoria='Toro' AND estado='ACTIVO';
 IF cardinality(bulls) IS DISTINCT FROM cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
 IF d->>'vientres' IS NOT NULL THEN
  mothers=(d->>'vientres')::int;IF mothers<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 ELSE
  SELECT count(*) INTO mothers FROM public.ganpro_animals_at(ts) h JOIN public.animals a ON a.id=h.id WHERE h.lote_id=d->>'lote_id' AND a.sexo='H' AND a.categoria IN('Vaca','Vaquillona');
  IF mothers=0 THEN mothers=NULL; END IF;
 END IF;
 INSERT INTO public.servicios(temporada,lote_id,toros,vientres,fecha_entrada,fecha_salida,notas)
 VALUES(trim(d->>'temporada'),d->>'lote_id',bulls,mothers,ts,finish,d->>'notas') RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Servicio registrado sin duplicar reenvíos');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_service_create(jsonb) FROM PUBLIC;
CREATE FUNCTION public.ganpro_paddock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); old_ public.potreros; BEGIN
 IF nullif(trim(d->>'nombre'),'') IS NULL OR length(d->>'nombre')>200 OR (d->>'hectareas')::float8<0 OR (d->>'capacidad_ev')::float8<0
 OR (d->>'hectareas')::float8 IN('NaN'::float8,'Infinity'::float8) OR (d->>'capacidad_ev')::float8 IN('NaN'::float8,'Infinity'::float8) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT * INTO old_ FROM public.potreros WHERE id=ident;
 IF FOUND THEN
  IF old_.server_updated_at IS DISTINCT FROM (d->>'expected_version')::bigint THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.potreros SET map_version=map_version+1,nombre=trim(d->>'nombre'),hectareas=(d->>'hectareas')::float8,recurso_forrajero=d->>'recurso_forrajero',capacidad_ev=(d->>'capacidad_ev')::float8 WHERE id=ident;
 ELSE
  IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
  INSERT INTO public.potreros(id,nombre,hectareas,recurso_forrajero,capacidad_ev) VALUES(ident,trim(d->>'nombre'),(d->>'hectareas')::float8,d->>'recurso_forrajero',(d->>'capacidad_ev')::float8);
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Potrero guardado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_paddock_save(jsonb) FROM PUBLIC;
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
 WHEN 'config.paddock' THEN result=public.ganpro_paddock_save(p_data);
 WHEN 'repro.service' THEN result=public.ganpro_service_create(p_data);
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
CREATE FUNCTION public.ganpro_analysis_capabilities() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 RETURN jsonb_build_object('version',62,'service',position('WHEN ''repro.service''' IN pg_get_functiondef('public.ganpro_command(text,uuid,jsonb)'::regprocedure))>0,
 'paddock',to_regprocedure('public.ganpro_paddock_save(jsonb)') IS NOT NULL,'treasury',to_regprocedure('public.ganpro_treasury_snapshot(bigint)') IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_analysis_capabilities() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_analysis_capabilities() TO authenticated;
DO $audit$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['servicios','revisacion_toros','raciones','suplementos','operations_catalog','scheduled_operations','etapas_protocolo','precios_mercado'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||t)::regclass AND tgname='ganpro_audit') THEN
   EXECUTE format('CREATE TRIGGER ganpro_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ganpro_audit_row()',t);
  END IF;
 END LOOP;
END $audit$;
NOTIFY pgrst, 'reload schema';

NOTIFY pgrst, 'reload schema';
COMMIT;
