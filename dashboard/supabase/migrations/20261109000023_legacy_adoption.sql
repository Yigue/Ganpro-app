BEGIN;
CREATE FUNCTION public.ganpro_finance_adopt(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; ts bigint:=(d->>'fecha')::bigint; paid numeric; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'id' AND ledger_version=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF ts<doc.fecha OR nullif(trim(d->>'contraparte'),'') IS NULL OR d->>'conciliado' !~ '^\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 paid=(d->>'conciliado')::numeric;
 IF paid>round(doc.monto::numeric,2) OR doc.monto<=0 THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_BALANCE'; END IF;
 IF (d->>'vencimiento')::bigint<doc.fecha THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 UPDATE public.movimientos_financieros SET ledger_version=1,adopcion_fecha=ts,saldo_previo_conciliado=paid,
 contraparte=d->>'contraparte',vencimiento=(d->>'vencimiento')::bigint,cobrado=paid>=round(monto::numeric,2) WHERE id=doc.id;
 RETURN jsonb_build_object('id',doc.id,'message','Movimiento conciliado sin duplicar comprobantes ni crear caja');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_adopt(jsonb) FROM PUBLIC;
COMMIT;
