BEGIN;
CREATE FUNCTION public.ganpro_guard_managed_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cmd text:=coalesce(current_setting('ganpro.command',true),''); BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.ledger_version=1 AND cmd NOT IN('stock.movement','finance.document') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.ledger_version=0 AND NEW.ledger_version=1 AND cmd<>'finance.adopt' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF OLD.ledger_version=1 THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF cmd NOT IN('finance.settle','finance.reverse','finance.void','stock.movement','finance.document') AND
   (to_jsonb(NEW)-ARRAY['server_updated_at','updated_at','dte_estado']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['server_updated_at','updated_at','dte_estado']) THEN
   RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF NEW.ledger_version<>OLD.ledger_version THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER ganpro_managed_document BEFORE INSERT OR UPDATE OR DELETE ON public.movimientos_financieros FOR EACH ROW EXECUTE FUNCTION public.ganpro_guard_managed_document();
CREATE FUNCTION public.ganpro_guard_document_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (TG_OP='INSERT' AND (NEW.venta_movimiento_id IS NOT NULL OR NEW.compra_movimiento_id IS NOT NULL)) OR
 (TG_OP='UPDATE' AND (NEW.venta_movimiento_id IS DISTINCT FROM OLD.venta_movimiento_id OR NEW.compra_movimiento_id IS DISTINCT FROM OLD.compra_movimiento_id)) THEN
  IF coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_document_links BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_guard_document_links();
REVOKE ALL ON FUNCTION public.ganpro_guard_managed_document(),public.ganpro_guard_document_links() FROM PUBLIC;
COMMIT;
