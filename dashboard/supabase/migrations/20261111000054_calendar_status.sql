BEGIN;
CREATE FUNCTION public.ganpro_schedule_status(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF d->>'estado' NOT IN('PENDIENTE','CANCELADO') THEN RAISE EXCEPTION 'GANPRO_SCHEDULE_APPLICATION'; END IF;
 UPDATE public.scheduled_operations SET estado=d->>'estado' WHERE id=d->>'id' AND estado<>'COMPLETADO';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 RETURN jsonb_build_object('message',CASE WHEN d->>'estado'='CANCELADO' THEN 'Programación cancelada' ELSE 'Programación pendiente' END);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_schedule_status(jsonb) FROM PUBLIC;
COMMIT;
