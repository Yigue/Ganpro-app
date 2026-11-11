BEGIN;
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
COMMIT;
