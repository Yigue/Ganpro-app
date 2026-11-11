BEGIN;
ALTER TABLE public.animals ADD COLUMN visual_pendiente boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.ganpro_pending_visual(a public.animals) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT a.visual_pendiente OR a.id_caravana ~* '^SIN-CARAVANA-[a-z0-9-]{12,64}$' OR (a.rfid IS NOT NULL AND a.id_caravana IN(a.rfid,'RFID-'||a.rfid))
$$;
CREATE FUNCTION public.ganpro_stamp_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.visual_pendiente=NEW.id_caravana ~* '^SIN-CARAVANA-[a-z0-9-]{12,64}$' OR coalesce(NEW.id_caravana IN(NEW.rfid,'RFID-'||NEW.rfid),false);
 RETURN NEW;
END $$;
CREATE TRIGGER stamp_identity BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_stamp_identity();
ALTER FUNCTION public.ganpro_stock_save(jsonb) RENAME TO ganpro_stock_save_v47;
CREATE FUNCTION public.ganpro_stock_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
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
 RETURN result;
END $$;
CREATE FUNCTION public.ganpro_stock_generic(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE n int:=(d->>'cantidad')::int; i int; BEGIN
 IF n IS NULL OR n NOT BETWEEN 1 AND 500 OR d ? 'id' OR d ? 'rfid' OR d ? 'id_caravana' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR i IN 1..n LOOP PERFORM public.ganpro_stock_save(d-'cantidad'); END LOOP;
 RETURN jsonb_build_object('message',n||' animales sin caravana incorporados al stock inicial');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_save_v47(jsonb),public.ganpro_stock_save(jsonb),public.ganpro_stock_generic(jsonb),public.ganpro_pending_visual(public.animals),public.ganpro_stamp_identity() FROM PUBLIC;
COMMIT;
