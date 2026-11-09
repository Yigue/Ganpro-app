BEGIN;
CREATE FUNCTION public.ganpro_ledger_snapshot(p_month text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE start_ms bigint; end_ms bigint; cutoff bigint; accounts jsonb; docs jsonb; entries jsonb; totals jsonb; legacy jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 start_ms=extract(epoch FROM ((p_month||'-01')::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 end_ms=extract(epoch FROM (((p_month||'-01')::date+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 cutoff=least(end_ms,extract(epoch FROM (((clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'saldo',saldo::text,'fecha_apertura',fecha_apertura) ORDER BY nombre),'[]') INTO accounts
 FROM(SELECT c.*,c.saldo_inicial+coalesce((SELECT sum(monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND fecha<end_ms),0) saldo FROM public.cuentas_caja c WHERE fecha_apertura<end_ms) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'pendiente',(amount-paid)::text) ORDER BY fecha DESC,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'cuenta_id',cuenta_id,'movimiento_id',movimiento_id,'transferencia_id',transferencia_id,'reversa_de',reversa_de,'monto',a.monto::text,'fecha',a.fecha,'motivo',a.motivo) ORDER BY a.fecha DESC,a.created_at DESC),'[]') INTO entries FROM public.asientos_caja a WHERE a.fecha<end_ms;
 SELECT jsonb_build_object(
  'saldo',coalesce((SELECT sum((v->>'saldo')::numeric) FROM jsonb_array_elements(accounts) v),0)::text,
  'por_cobrar',coalesce(sum(amount-paid) FILTER(WHERE tipo='INGRESO'),0)::text,
  'por_pagar',coalesce(sum(amount-paid) FILTER(WHERE tipo='GASTO'),0)::text,
  'cobros_vencidos',coalesce(sum(amount-paid) FILTER(WHERE tipo='INGRESO' AND vencimiento<cutoff),0)::text,
  'pagos_vencidos',coalesce(sum(amount-paid) FILTER(WHERE tipo='GASTO' AND vencimiento<cutoff),0)::text
 ) INTO totals FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT totals||jsonb_build_object('cobros',coalesce(sum(monto) FILTER(WHERE monto>0),0)::text,'pagos',(-coalesce(sum(monto) FILTER(WHERE monto<0),0))::text,'flujo',coalesce(sum(monto),0)::text) INTO totals FROM public.asientos_caja WHERE fecha>=start_ms AND fecha<end_ms AND transferencia_id IS NULL;
 SELECT jsonb_build_object('cantidad',count(*),'monto',coalesce(sum(monto::numeric),0)::text,'filas',(SELECT coalesce(jsonb_agg(x),'[]') FROM (SELECT id,tipo,descripcion,fecha,monto::text FROM public.movimientos_financieros WHERE ledger_version=0 ORDER BY fecha DESC LIMIT 100) x)) INTO legacy FROM public.movimientos_financieros WHERE ledger_version=0;
 RETURN jsonb_build_object('mes',p_month,'cuentas',accounts,'documentos',docs,'asientos',entries,'totales',totals,'anteriores',legacy);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_ledger_snapshot(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ganpro_ledger_snapshot(text) TO authenticated;
COMMIT;
