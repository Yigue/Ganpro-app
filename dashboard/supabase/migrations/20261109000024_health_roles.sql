BEGIN;
CREATE FUNCTION public.ganpro_health_apply(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE animal text; lot text; product public.operations_catalog; ts bigint:=(d->>'fecha')::bigint; BEGIN
 SELECT * INTO product FROM public.operations_catalog WHERE id=d->>'operation_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts IS NULL OR ts<=0 OR (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'destino'='animal' THEN
  SELECT id INTO animal FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(d->>'caravana')) AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 ELSIF d->>'destino'='lote' THEN
  SELECT id INTO lot FROM public.lotes WHERE id=d->>'lote_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot;
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_crear_perfil() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(20261109,2);
 INSERT INTO public.perfiles(id,email,nombre,rol) VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'nombre',split_part(NEW.email,'@',1)),CASE WHEN EXISTS(SELECT 1 FROM public.perfiles) THEN 'asesor' ELSE 'admin' END);
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_lock_profiles BEFORE INSERT OR UPDATE OR DELETE ON public.perfiles FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement();
CREATE FUNCTION public.ganpro_last_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.rol='admin' AND (TG_OP='DELETE' OR NEW.rol<>'admin') AND (SELECT count(*) FROM public.perfiles WHERE rol='admin')<=1 THEN RAISE EXCEPTION 'GANPRO_LAST_ADMIN'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER ganpro_last_admin BEFORE UPDATE OR DELETE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.ganpro_last_admin();
REVOKE ALL ON FUNCTION public.ganpro_health_apply(jsonb),public.ganpro_last_admin() FROM PUBLIC;
COMMIT;
