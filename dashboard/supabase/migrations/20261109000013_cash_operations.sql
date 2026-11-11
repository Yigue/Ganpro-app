BEGIN;
CREATE FUNCTION public.ganpro_cash_account(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF nullif(trim(d->>'nombre'),'') IS NULL OR d->>'saldo_inicial' !~ '^-?\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.cuentas_caja(nombre,saldo_inicial,fecha_apertura) VALUES(trim(d->>'nombre'),(d->>'saldo_inicial')::numeric,ts) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Cuenta abierta');
END $$;
CREATE FUNCTION public.ganpro_cash_transfer(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident uuid:=gen_random_uuid(); ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'origen_id'=d->>'destino_id' OR (SELECT count(*) FROM public.cuentas_caja WHERE id IN(d->>'origen_id',d->>'destino_id'))<>2 THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF EXISTS(SELECT 1 FROM public.cuentas_caja WHERE id IN(d->>'origen_id',d->>'destino_id') AND fecha_apertura>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,transferencia_id,monto,fecha,actor_id) VALUES
 (d->>'origen_id',ident,-amount,ts,auth.uid()),(d->>'destino_id',ident,amount,ts,auth.uid());
 RETURN jsonb_build_object('id',ident,'message','Transferencia registrada');
END $$;
CREATE FUNCTION public.ganpro_cash_reverse(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE original public.asientos_caja; ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO original FROM public.asientos_caja WHERE id=d->>'id';
 IF NOT FOUND OR original.reversa_de IS NOT NULL OR original.transferencia_id IS NOT NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 PERFORM public.ganpro_assert_open(original.fecha);
 IF ts<original.fecha OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=original.movimiento_id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF EXISTS(SELECT 1 FROM public.asientos_caja WHERE reversa_de=original.id) THEN RAISE EXCEPTION 'GANPRO_ALREADY_REVERSED'; END IF;
 IF nullif(trim(d->>'motivo'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,movimiento_id,reversa_de,monto,fecha,motivo,actor_id)
 VALUES(original.cuenta_id,original.movimiento_id,original.id,-original.monto,ts,d->>'motivo',auth.uid()) RETURNING id INTO ident;
 UPDATE public.movimientos_financieros SET cobrado=false WHERE id=original.movimiento_id;
 RETURN jsonb_build_object('id',ident,'message','Cobro / pago revertido');
END $$;
CREATE FUNCTION public.ganpro_cash_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ts bigint:=(d->>'fecha')::bigint; last_ms bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF (to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>=(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 last_ms=extract(epoch FROM (((to_timestamp(ts/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000-1;
 INSERT INTO public.cierres_caja(hasta,actor_id) VALUES(last_ms,auth.uid());
 RETURN jsonb_build_object('message','Período cerrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_cash_account(jsonb),public.ganpro_cash_transfer(jsonb),public.ganpro_cash_reverse(jsonb),public.ganpro_cash_close(jsonb) FROM PUBLIC;
COMMIT;
