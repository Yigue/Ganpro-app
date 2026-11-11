BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_health_apply(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE animal text; lot text; product public.operations_catalog; ts bigint:=(d->>'fecha')::bigint; BEGIN
 SELECT * INTO product FROM public.operations_catalog WHERE id=d->>'operation_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF d->>'dosis' IS NOT NULL AND ((d->>'dosis')::numeric<=0 OR (d->>'dosis')::numeric='NaN'::numeric) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF ts IS NULL OR ts<=0 OR (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'destino'='animal' THEN
  SELECT id INTO animal FROM public.animals WHERE upper(trim(id_caravana))=upper(trim(d->>'caravana')) AND estado='ACTIVO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 ELSIF d->>'destino'='lote' THEN
  SELECT id INTO lot FROM public.lotes WHERE id=d->>'lote_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable,insumo_id,partida_id)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable',d->>'insumo_id',d->>'partida_id');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot;
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_health_apply(jsonb) FROM PUBLIC;
COMMIT;
