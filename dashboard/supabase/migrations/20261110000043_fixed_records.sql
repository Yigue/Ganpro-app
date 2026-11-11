BEGIN;
CREATE FUNCTION public.ganpro_protect_feeding() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(current_setting('ganpro.command',true),'')='nutrition.deliver' THEN RETURN coalesce(NEW,OLD); END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.snapshot_formula IS NOT NULL OR NEW.costo_total IS NOT NULL OR EXISTS(SELECT 1 FROM public.racion_ingredientes i JOIN public.insumos_campo s ON s.suplemento_id=i.suplemento_id WHERE i.racion_id=NEW.racion_id) THEN RAISE EXCEPTION 'GANPRO_MANAGED_STOCK'; END IF;
 ELSIF OLD.snapshot_formula IS NOT NULL AND (TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['updated_at','server_updated_at','server_created_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','server_updated_at','server_created_at'])) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_feeding BEFORE INSERT OR UPDATE OR DELETE ON public.potrero_feeding_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_feeding();
REVOKE ALL ON FUNCTION public.ganpro_protect_feeding() FROM PUBLIC;
COMMIT;
