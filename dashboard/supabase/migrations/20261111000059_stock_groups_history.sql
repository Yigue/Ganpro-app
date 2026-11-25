BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE previous public.animals; visual text:=nullif(trim(d->>'id_caravana'),''); result jsonb; BEGIN
 IF d->>'id' IS NOT NULL THEN SELECT * INTO previous FROM public.animals WHERE id=d->>'id'; END IF;
 IF visual IS NULL THEN
  IF previous.id IS NOT NULL AND NOT public.ganpro_pending_visual(previous) AND previous.id_caravana IS DISTINCT FROM d->>'rfid' THEN RAISE EXCEPTION 'GANPRO_VISUAL_REQUIRED'; END IF;
  visual=coalesce(previous.id_caravana,'SIN-CARAVANA-'||gen_random_uuid()::text);
 ELSIF visual ~* '^SIN-CARAVANA-' AND visual IS DISTINCT FROM previous.id_caravana THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 result=public.ganpro_stock_save_v47(d||jsonb_build_object('id_caravana',visual));
 IF previous.id IS NOT NULL AND (upper(trim(previous.id_caravana))<>upper(trim(visual)) OR previous.rfid IS DISTINCT FROM nullif(d->>'rfid','')) THEN
  INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(previous.id,'IDENTIFICACION',public.ganpro_now_ms(),'Identificación actualizada conservando la ficha y su historial');
 END IF;
 IF previous.id IS NOT NULL AND previous.categoria IS DISTINCT FROM d->>'categoria' THEN INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(previous.id,'RECATEGORIZACION',public.ganpro_now_ms(),previous.categoria||' → '||(d->>'categoria')); END IF;
 IF previous.id IS NULL THEN INSERT INTO public.eventos(animal_id,tipo,timestamp,notas) VALUES(result->>'id','ALTA_INICIAL',public.ganpro_now_ms(),'Alta de stock inicial; no es una compra ni un nacimiento'); END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.ganpro_lot_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); old_ public.lotes; name_ text:=nullif(trim(d->>'nombre'),''); BEGIN
 IF name_ IS NULL OR length(name_)>200 OR length(d->>'descripcion')>1000 OR (d->>'hectareas')::numeric<0 OR (d->>'costo_alquiler_ha')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.lotes WHERE lower(trim(nombre))=lower(name_) AND id<>ident) THEN RAISE EXCEPTION 'GANPRO_DUPLICATE_LOT'; END IF;
 SELECT * INTO old_ FROM public.lotes WHERE id=ident;
 IF FOUND THEN
  IF (d->>'expected_version')::bigint IS DISTINCT FROM old_.server_updated_at THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
  UPDATE public.lotes SET nombre=name_,descripcion=d->>'descripcion',ubicacion=d->>'ubicacion',hectareas=(d->>'hectareas')::float8,costo_alquiler_ha=(d->>'costo_alquiler_ha')::float8 WHERE id=ident;
 ELSE
  IF d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
  INSERT INTO public.lotes(id,nombre,descripcion,ubicacion,hectareas,costo_alquiler_ha) VALUES(ident,name_,d->>'descripcion',d->>'ubicacion',(d->>'hectareas')::float8,(d->>'costo_alquiler_ha')::float8);
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Lote ganadero guardado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_lot_save(jsonb),public.ganpro_stock_save(jsonb) FROM PUBLIC;
COMMIT;
