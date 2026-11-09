BEGIN;
CREATE FUNCTION public.ganpro_money(v text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF v IS NULL OR v !~ '^\d{1,12}(\.\d{1,2})?$' OR v::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 RETURN v::numeric(16,2);
END $$;
CREATE OR REPLACE FUNCTION public.ganpro_assert_open(p_date bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_date IS NULL OR p_date<=0 OR (to_timestamp(p_date/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>
 (clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.cierres_caja WHERE hasta>=p_date) THEN RAISE EXCEPTION 'GANPRO_CLOSED_PERIOD'; END IF;
END $$;
CREATE FUNCTION public.ganpro_paid(p_id text,p_until bigint DEFAULT 9223372036854775807) RETURNS numeric LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT saldo_previo_conciliado FROM public.movimientos_financieros WHERE id=p_id AND coalesce(adopcion_fecha,fecha)<p_until),0)+abs(coalesce((SELECT sum(monto) FROM public.asientos_caja WHERE movimiento_id=p_id AND fecha<p_until),0))
$$;
CREATE FUNCTION public.ganpro_finance_settle(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; account public.cuentas_caja; amount numeric:=public.ganpro_money(d->>'monto'); ts bigint:=(d->>'fecha')::bigint; ident text; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'movimiento_id' AND ledger_version=1 AND anulado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF ts<coalesce(doc.adopcion_fecha,doc.fecha) OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=doc.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 SELECT * INTO account FROM public.cuentas_caja WHERE id=d->>'cuenta_id';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF ts<account.fecha_apertura THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF amount>round(doc.monto::numeric,2)-public.ganpro_paid(doc.id) THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_BALANCE'; END IF;
 INSERT INTO public.asientos_caja(cuenta_id,movimiento_id,monto,fecha,actor_id)
 VALUES(account.id,doc.id,CASE WHEN doc.tipo='INGRESO' THEN amount ELSE -amount END,ts,auth.uid()) RETURNING id INTO ident;
 UPDATE public.movimientos_financieros SET cobrado=public.ganpro_paid(doc.id)>=round(doc.monto::numeric,2),fecha_cobro=ts WHERE id=doc.id;
 RETURN jsonb_build_object('id',ident,'message','Cobro / pago registrado');
END $$;
CREATE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL OR nullif(trim(d->>'contraparte'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]')))) RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_money(text),public.ganpro_paid(text,bigint),public.ganpro_finance_settle(jsonb),public.ganpro_finance_document(jsonb) FROM PUBLIC;
COMMIT;
