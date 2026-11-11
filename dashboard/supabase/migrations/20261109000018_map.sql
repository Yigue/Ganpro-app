BEGIN;
CREATE FUNCTION public.ganpro_map_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); p public.potreros; measured jsonb; BEGIN
 SELECT * INTO p FROM public.potreros WHERE id=ident;
 IF FOUND AND ((d->>'expected_version')::int IS DISTINCT FROM p.map_version) THEN RAISE EXCEPTION 'GANPRO_MAP_CONFLICT'; END IF;
 IF NOT FOUND AND d ? 'id' THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 measured=public.ganpro_measure_polygon(d->'geometry');
 IF p.id IS NULL THEN INSERT INTO public.potreros(id,nombre) VALUES(ident,d->>'nombre'); END IF;
 UPDATE public.potreros SET nombre=d->>'nombre',geo_json=(d->'geometry')::text,
 hectareas=(measured->>'hectareas')::float8,perimetro_m=(measured->>'perimetro_m')::numeric,
 tipo_potrero=coalesce(d->>'tipo_potrero','CAMPO_NATURAL'),recurso_forrajero=d->>'recurso_forrajero',
 capacidad_ev=(d->>'capacidad_ev')::float8,capacidad_cabezas=(d->>'capacidad_cabezas')::int,
 estado_forraje=coalesce(d->>'estado_forraje','REGULAR'),agua=(d->>'agua')::boolean,
 sombra=(d->>'sombra')::boolean,notas=d->>'notas',map_version=map_version+1 WHERE id=ident;
 RETURN measured||jsonb_build_object('id',ident,'message','Potrero guardado');
END $$;
CREATE FUNCTION public.ganpro_protect_map() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE measured jsonb; shape jsonb; BEGIN
 IF NEW.geo_json IS NOT NULL AND (TG_OP='INSERT' OR NEW.geo_json IS DISTINCT FROM OLD.geo_json OR NEW.hectareas IS DISTINCT FROM OLD.hectareas) THEN
  shape=NEW.geo_json::jsonb;
  IF shape->>'type'='Feature' THEN shape=shape->'geometry'; END IF;
  IF shape->>'type'='FeatureCollection' AND jsonb_array_length(shape->'features')=1 THEN shape=shape->'features'->0->'geometry'; END IF;
  measured=public.ganpro_measure_polygon(shape);
  NEW.hectareas=(measured->>'hectareas')::float8;NEW.perimetro_m=(measured->>'perimetro_m')::numeric;
 END IF;
 IF TG_OP='UPDATE' AND current_setting('ganpro.command',true) IS DISTINCT FROM 'map.save' AND to_jsonb(NEW)-ARRAY['updated_at','server_updated_at','server_created_at','map_version'] IS DISTINCT FROM to_jsonb(OLD)-ARRAY['updated_at','server_updated_at','server_created_at','map_version'] THEN NEW.map_version=OLD.map_version+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_protect_map BEFORE INSERT OR UPDATE ON public.potreros FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_map();
REVOKE ALL ON FUNCTION public.ganpro_map_save(jsonb),public.ganpro_protect_map() FROM PUBLIC;
COMMIT;
