BEGIN;
CREATE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.animals; previous public.animals; ident text:=coalesce(nullif(d->>'id',''),gen_random_uuid()::text); ts bigint:=public.ganpro_now_ms(); BEGIN
 SELECT * INTO previous FROM public.animals WHERE id=ident;
 IF FOUND THEN
  IF NOT d ? 'expected_version' OR previous.server_updated_at<>(d->>'expected_version')::bigint THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  IF coalesce(d->>'estado',previous.estado)<>previous.estado THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  UPDATE public.animals SET id_caravana=d->>'id_caravana',rfid=nullif(d->>'rfid',''),sexo=d->>'sexo',categoria=d->>'categoria',
   raza=nullif(d->>'raza',''),fecha_nacimiento=(d->>'fecha_nacimiento')::bigint,peso_actual=(d->>'peso_actual')::float8,
   lote_id=nullif(d->>'lote_id',''),potrero_id=nullif(d->>'potrero_id','') WHERE id=ident RETURNING * INTO a;
 ELSE
  IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
  INSERT INTO public.animals(id,id_caravana,rfid,sexo,categoria,raza,fecha_nacimiento,peso_actual,lote_id,potrero_id)
  VALUES(ident,d->>'id_caravana',nullif(d->>'rfid',''),d->>'sexo',d->>'categoria',nullif(d->>'raza',''),(d->>'fecha_nacimiento')::bigint,
   (d->>'peso_actual')::float8,nullif(d->>'lote_id',''),nullif(d->>'potrero_id','')) RETURNING * INTO a;
 END IF;
 IF a.fecha_nacimiento>ts THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF previous.id IS NOT NULL AND (a.lote_id IS DISTINCT FROM previous.lote_id OR a.potrero_id IS DISTINCT FROM previous.potrero_id) THEN
  IF previous.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  INSERT INTO public.animal_movements(animal_id,lote_origen_id,lote_destino_id,potrero_origen_id,potrero_destino_id,fecha)
  VALUES(ident,previous.lote_id,a.lote_id,previous.potrero_id,a.potrero_id,ts);
 END IF;
 IF a.peso_actual IS NOT NULL AND a.peso_actual IS DISTINCT FROM previous.peso_actual THEN
  INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(ident,'PESAJE',a.peso_actual,ts);
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Animal guardado');
END $$;
CREATE FUNCTION public.ganpro_stock_recat(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; a public.animals; cfg public.categorias_config; BEGIN
 IF jsonb_array_length(d)>1000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
  SELECT * INTO a FROM public.animals WHERE id=item->>'id' AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  SELECT * INTO cfg FROM public.categorias_config WHERE categoria=a.categoria;
  IF cfg.recategoriza_a IS DISTINCT FROM item->>'categoria' OR a.fecha_nacimiento IS NULL
   OR (public.ganpro_now_ms()-a.fecha_nacimiento)/86400000.0/30.4375<cfg.edad_recategorizacion_meses THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.animals SET categoria=cfg.recategoriza_a WHERE id=a.id;
  INSERT INTO public.eventos(animal_id,tipo,notas,timestamp) VALUES(a.id,'RECATEGORIZACION',a.categoria||' → '||cfg.recategoriza_a,public.ganpro_now_ms());
 END LOOP;
 RETURN jsonb_build_object('message','Recategorización guardada');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_save(jsonb),public.ganpro_stock_recat(jsonb) FROM PUBLIC;
COMMIT;
