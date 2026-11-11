BEGIN;
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
COMMIT;
