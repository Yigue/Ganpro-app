BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_guard_managed_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cmd text:=coalesce(current_setting('ganpro.command',true),''); BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.ledger_version=1 AND cmd NOT IN('stock.movement','finance.document','supply.purchase') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND OLD.ledger_version=0 AND NEW.ledger_version=1 AND cmd<>'finance.adopt' THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF TG_OP='UPDATE' AND OLD.es_inventario AND NEW.anulado_en IS DISTINCT FROM OLD.anulado_en THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 IF OLD.ledger_version=1 THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF cmd NOT IN('finance.settle','finance.reverse','finance.void','stock.movement','finance.document','supply.purchase') AND
   (to_jsonb(NEW)-ARRAY['server_updated_at','updated_at','dte_estado']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['server_updated_at','updated_at','dte_estado']) THEN
   RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF NEW.ledger_version<>OLD.ledger_version THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_guard_managed_document() FROM PUBLIC;
COMMIT;
