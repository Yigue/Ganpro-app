BEGIN;
CREATE FUNCTION public.ganpro_treasury_snapshot(p_as_of bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cash numeric; docs jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 p_as_of=coalesce(p_as_of,(extract(epoch FROM clock_timestamp())*1000)::bigint);
 IF p_as_of<0 OR p_as_of>(extract(epoch FROM clock_timestamp())*1000)::bigint THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 SELECT coalesce(sum(c.saldo_inicial+coalesce((SELECT sum(a.monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND a.fecha<=p_as_of),0)),0)
 INTO cash FROM public.cuentas_caja c WHERE c.fecha_apertura<=p_as_of;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,
 'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'pendiente',(amount-paid)::text) ORDER BY vencimiento,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,p_as_of+1) paid FROM public.movimientos_financieros m
 WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<=p_as_of AND (anulado_en IS NULL OR anulado_en>p_as_of)) q;
 RETURN jsonb_build_object('as_of',p_as_of,'saldo',cash::text,'documentos',docs);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_treasury_snapshot(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_treasury_snapshot(bigint) TO authenticated;
COMMIT;
