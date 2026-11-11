BEGIN;
CREATE TABLE public.sync_push_receipts(fingerprint text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.sync_push_receipts ENABLE ROW LEVEL SECURITY;
ALTER FUNCTION public.ganpro_sync_push(jsonb,bigint) RENAME TO ganpro_sync_push_v3;
ALTER FUNCTION public.ganpro_sync_pull(bigint) RENAME TO ganpro_sync_pull_v3;
REVOKE ALL ON FUNCTION public.ganpro_sync_push_v3(jsonb,bigint),public.ganpro_sync_pull_v3(bigint) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.ganpro_sync_pull(p_last_pulled_at bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; tick bigint; BEGIN
 PERFORM public.ganpro_lock();
 result=public.ganpro_sync_pull_v3(p_last_pulled_at);
 tick=public.ganpro_next_sync_ms();
 RETURN result||jsonb_build_object('timestamp',tick);
END $$;
CREATE FUNCTION public.ganpro_sync_push(p_changes jsonb,p_last_pulled_at bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; group_ jsonb; changes jsonb:='{}'; row_ jsonb; list_ jsonb; kind text;
 conflict boolean; v_fingerprint text:=encode(sha256(convert_to(p_changes::text||':'||p_last_pulled_at::text,'UTF8')),'hex'); BEGIN
 PERFORM public.ganpro_lock();
 IF jsonb_typeof(p_changes)<>'object' OR p_last_pulled_at<0 OR octet_length(p_changes::text)>4000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.sync_push_receipts WHERE sync_push_receipts.fingerprint=v_fingerprint) THEN RETURN; END IF;
 PERFORM set_config('ganpro.command','sync',true);
 FOR t,group_ IN SELECT key,value FROM jsonb_each(p_changes) LOOP
  IF t<>ALL(public.ganpro_sync_tables()) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  FOREACH kind IN ARRAY ARRAY['created','updated','deleted'] LOOP
   list_=coalesce(group_->kind,'[]');
   IF jsonb_typeof(list_)<>'array' OR jsonb_array_length(list_)>10000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   IF kind='deleted' THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id IN(SELECT jsonb_array_elements_text($1)) AND server_updated_at>$2)',t) INTO conflict USING list_,p_last_pulled_at;
   ELSE
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I x JOIN jsonb_array_elements($1) e ON x.id=e->>''id'' WHERE $3 OR x.server_updated_at>$2)',t) INTO conflict USING list_,p_last_pulled_at,kind='created';
   END IF;
   IF conflict THEN RAISE EXCEPTION 'GANPRO_CONFLICT' USING ERRCODE='40001'; END IF;
   IF kind<>'deleted' THEN
    SELECT coalesce(jsonb_agg(value-ARRAY['venta_movimiento_id','compra_movimiento_id','ledger_version','animal_ids','map_version','perimetro_m','server_updated_at','server_created_at']),'[]') INTO list_ FROM jsonb_array_elements(list_);
   END IF;
   changes=jsonb_set(changes,ARRAY[t],coalesce(changes->t,'{}')||jsonb_build_object(kind,list_));
  END LOOP;
 END LOOP;
 PERFORM public.ganpro_sync_push_v3(changes,p_last_pulled_at);
 IF p_changes<>'{}' THEN INSERT INTO public.sync_push_receipts VALUES(v_fingerprint,now()); END IF;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_sync_push(jsonb,bigint),public.ganpro_sync_pull(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ganpro_sync_push(jsonb,bigint),public.ganpro_sync_pull(bigint) TO service_role;
COMMIT;
