BEGIN;
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
COMMIT;
