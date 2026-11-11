BEGIN;
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
COMMIT;
