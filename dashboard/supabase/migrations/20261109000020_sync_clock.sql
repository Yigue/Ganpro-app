BEGIN;
CREATE TABLE public.sync_clock(id int PRIMARY KEY CHECK(id=1),last_ms bigint NOT NULL);
INSERT INTO public.sync_clock VALUES(1,0);
ALTER TABLE public.sync_clock ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.ganpro_next_sync_ms() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tick bigint; BEGIN
 PERFORM public.ganpro_lock();
 UPDATE public.sync_clock SET last_ms=greatest(public.ganpro_now_ms(),last_ms+1) WHERE id=1 RETURNING last_ms INTO tick;
 RETURN tick;
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_sync_stamp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tick bigint:=public.ganpro_next_sync_ms(); BEGIN
 IF TG_OP='INSERT' THEN
  NEW.server_created_at=tick;NEW.created_at=coalesce(NEW.created_at,tick);NEW.updated_at=coalesce(NEW.updated_at,tick);
  DELETE FROM public.sync_tombstones WHERE table_name=TG_TABLE_NAME AND record_id=NEW.id;
 ELSE NEW.server_created_at=OLD.server_created_at;
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN NEW.updated_at=public.ganpro_now_ms(); END IF;
 END IF;
 NEW.server_updated_at=tick;RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_sync_tombstone() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.sync_tombstones(table_name,record_id,deleted_at) VALUES(TG_TABLE_NAME,OLD.id,public.ganpro_next_sync_ms())
 ON CONFLICT(table_name,record_id) DO UPDATE SET deleted_at=EXCLUDED.deleted_at;RETURN OLD;
END $$;
DO $$ DECLARE t text; maximum bigint; BEGIN
 FOREACH t IN ARRAY public.ganpro_sync_tables()||ARRAY['servicios','revisacion_toros','racion_ingredientes','sigsa_stock','escenarios','escenario_lineas'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=('public.'||t)::regclass AND tgname='ganpro_lock_write') THEN
   EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  END IF;
  EXECUTE format('SELECT coalesce(max(server_updated_at),0) FROM public.%I',t) INTO maximum;
  UPDATE public.sync_clock SET last_ms=greatest(last_ms,maximum) WHERE id=1;
 END LOOP;
 SELECT coalesce(max(deleted_at),0) INTO maximum FROM public.sync_tombstones;
 UPDATE public.sync_clock SET last_ms=greatest(last_ms,maximum) WHERE id=1;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_next_sync_ms() FROM PUBLIC;
COMMIT;
