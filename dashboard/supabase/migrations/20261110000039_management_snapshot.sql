BEGIN;
ALTER TABLE public.insumo_movimientos ADD COLUMN registrado_en bigint NOT NULL DEFAULT public.ganpro_now_ms();
CREATE FUNCTION public.ganpro_management_snapshot() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb:='{}'; t text; key_ text; rows_ jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 PERFORM public.ganpro_lock();
 FOR t,key_ IN SELECT * FROM (VALUES('insumos_campo','insumos'),('insumo_partidas','partidas'),('insumo_movimientos','consumos'),('repro_ciclos','ciclos'),('planes_pastoreo','pastoreo'),('inventario_cierres','cierres'),('banco_lineas','bancos'),('banco_extractos','extractos'),('documentos_comprobantes','documentos')) v LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)-''path''-''sha256''),''[]'') FROM public.%I x',t) INTO rows_;
  result=result||jsonb_build_object(key_,rows_);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_management_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_management_snapshot() TO authenticated;
-- New private columns must not be overwritten by an old offline client.
CREATE FUNCTION public.ganpro_protect_domain_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='animals' THEN
 IF TG_OP='UPDATE' AND (NEW.madre_id IS DISTINCT FROM OLD.madre_id OR NEW.padre_id IS DISTINCT FROM OLD.padre_id)
 AND coalesce(current_setting('ganpro.command',true),'')<>'repro.stage' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 IF TG_TABLE_NAME='movimientos_financieros' THEN
 IF TG_OP='UPDATE' AND NEW.es_inventario IS DISTINCT FROM OLD.es_inventario
 AND coalesce(current_setting('ganpro.command',true),'')<>'supply.purchase' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_genealogy BEFORE UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_domain_fields();
CREATE TRIGGER protect_inventory_flag BEFORE UPDATE ON public.movimientos_financieros FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_domain_fields();
REVOKE ALL ON FUNCTION public.ganpro_protect_domain_fields() FROM PUBLIC;
COMMIT;
