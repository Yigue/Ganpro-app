BEGIN;
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
COMMIT;
