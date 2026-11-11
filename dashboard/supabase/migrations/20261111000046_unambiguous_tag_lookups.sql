BEGIN;
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
COMMIT;
