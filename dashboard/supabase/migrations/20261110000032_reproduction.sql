BEGIN;
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
COMMIT;
