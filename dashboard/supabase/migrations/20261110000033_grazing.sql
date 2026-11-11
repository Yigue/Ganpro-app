BEGIN;
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
COMMIT;
