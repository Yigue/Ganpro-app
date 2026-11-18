BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_capture_recipients() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; unit_cost numeric; used jsonb; supply public.insumos_campo; BEGIN
 INSERT INTO public.aplicacion_animales(aplicacion_id,animal_id)
 SELECT NEW.id,a.id FROM public.ganpro_animals_at(NEW.fecha_aplicacion) a
 WHERE (NEW.animal_id IS NOT NULL AND a.id=NEW.animal_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NOT NULL AND a.lote_id=NEW.lote_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NULL);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT costo_unitario INTO unit_cost FROM public.operations_catalog WHERE id=NEW.operation_id;
 IF NEW.insumo_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.insumos_campo WHERE operation_id=NEW.operation_id) THEN
  SELECT * INTO supply FROM public.insumos_campo WHERE id=NEW.insumo_id AND operation_id=NEW.operation_id AND tipo='MEDICAMENTO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
  used=public.ganpro_supply_consume(jsonb_build_object('insumo_id',supply.id,'cantidad',coalesce(NEW.dosis,1)*n,'fecha',NEW.fecha_aplicacion,'lote_id',NEW.lote_id,'partida_id',NEW.partida_id,'motivo','Aplicación sanitaria','referencia_id',NEW.id));
  unit_cost=(used->>'costo')::numeric/nullif(coalesce(NEW.dosis,1)*n,0);
 END IF;
 UPDATE public.operation_logs SET receptores_fijados=true,cantidad_animales=n,costo_total=unit_cost*coalesce(NEW.dosis,1)*n WHERE id=NEW.id;
 RETURN NEW;
END $$;
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
 ELSIF d->>'destino'='rodeo' THEN NULL;
 ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.operation_logs(animal_id,lote_id,operation_id,fecha_aplicacion,fecha_fin_carencia,dosis,producto_lote,acta_numero,responsable,insumo_id,partida_id)
 VALUES(animal,lot,product.id,ts,CASE WHEN product.dias_carencia>0 THEN ts+(product.dias_carencia*86400000)::bigint END,(d->>'dosis')::float8,d->>'producto_lote',d->>'acta_numero',d->>'responsable',d->>'insumo_id',d->>'partida_id');
 IF d->>'scheduled_id' IS NOT NULL THEN
  UPDATE public.scheduled_operations SET estado='COMPLETADO' WHERE id=d->>'scheduled_id' AND operation_id=product.id AND lote_id IS NOT DISTINCT FROM lot AND estado='PENDIENTE';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('message','Aplicación y calendario guardados');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_capture_recipients(),public.ganpro_health_apply(jsonb) FROM PUBLIC;
COMMIT;
