BEGIN;
CREATE FUNCTION public.ganpro_lock() RETURNS void LANGUAGE sql AS $$ SELECT pg_advisory_xact_lock(20261109,1) $$;
CREATE FUNCTION public.ganpro_lock_statement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.ganpro_lock(); RETURN NULL; END $$;
CREATE FUNCTION public.ganpro_audit_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.command_audit(actor_id,source,table_name,record_id,previous,next,command_key)
 VALUES(auth.uid(),coalesce(nullif(current_setting('ganpro.command',true),''),'sync-or-rest'),TG_TABLE_NAME,
 coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id',to_jsonb(NEW)->>'categoria',to_jsonb(OLD)->>'categoria'),
 CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD)-'server_created_at'-'server_updated_at' ELSE NULL END,
 CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW)-'server_created_at'-'server_updated_at' ELSE NULL END,
 nullif(current_setting('ganpro.command_key',true),''));
 RETURN coalesce(NEW,OLD);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['animals','animal_movements','eventos','operation_logs','movimientos_financieros','potreros','lotes','cuentas_caja','asientos_caja','cierres_caja'] LOOP
  EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  EXECUTE format('CREATE TRIGGER ganpro_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ganpro_audit_row()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.ganpro_assert_open(p_date bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_date IS NULL OR p_date<=0 OR p_date>public.ganpro_now_ms()+86400000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.cierres_caja WHERE hasta>=p_date) THEN RAISE EXCEPTION 'GANPRO_CLOSED_PERIOD'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_lock(),public.ganpro_lock_statement(),public.ganpro_audit_row(),public.ganpro_assert_open(bigint) FROM PUBLIC;
-- User RPC helpers call this with owner privileges; authenticated REST is still protected by RLS.
COMMIT;
