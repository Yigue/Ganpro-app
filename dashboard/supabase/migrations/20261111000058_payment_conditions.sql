BEGIN;
ALTER TABLE public.asientos_caja ADD COLUMN metodo_pago text CHECK(metodo_pago IN('TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO'));
ALTER FUNCTION public.ganpro_finance_settle(jsonb) RENAME TO ganpro_finance_settle_v56;
CREATE FUNCTION public.ganpro_finance_settle(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE result jsonb; method_ text:=nullif(d->>'metodo_pago','A_CONVENIR'); BEGIN
 IF method_ IS NOT NULL AND method_ NOT IN('TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO') THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
 result=public.ganpro_finance_settle_v56(d);
 UPDATE public.asientos_caja SET metodo_pago=method_ WHERE id=result->>'id';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_settle_v56(jsonb),public.ganpro_finance_settle(jsonb) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids,modalidad_precio,precio_unitario,detalle_categorias,desbaste_pct,kg_facturados,plazo_dias,metodo_pago,condiciones)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]'))),d->>'modalidad_precio',(d->>'precio_unitario')::numeric,d->'detalle_categorias',(d->>'desbaste_pct')::numeric,(d->>'kg_facturados')::numeric,(d->>'plazo_dias')::int,d->>'metodo_pago',d->>'condiciones') RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts,'metodo_pago',d->>'metodo_pago'));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_document(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ganpro_ledger_snapshot(p_month text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE start_ms bigint; end_ms bigint; cutoff bigint; accounts jsonb; docs jsonb; entries jsonb; totals jsonb; legacy jsonb; BEGIN
 IF auth.uid() IS NULL OR public.ganpro_rol() IS NULL THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
 IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 PERFORM public.ganpro_lock();
 start_ms=extract(epoch FROM ((p_month||'-01')::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 end_ms=extract(epoch FROM (((p_month||'-01')::date+interval '1 month')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000;
 cutoff=least(end_ms,extract(epoch FROM (((clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'saldo',saldo::text,'fecha_apertura',fecha_apertura) ORDER BY nombre),'[]') INTO accounts
 FROM(SELECT c.*,c.saldo_inicial+coalesce((SELECT sum(monto) FROM public.asientos_caja a WHERE a.cuenta_id=c.id AND fecha<end_ms),0) saldo FROM public.cuentas_caja c WHERE fecha_apertura<end_ms) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'tipo',tipo,'categoria',categoria,'fecha',fecha,'vencimiento',vencimiento,'contraparte',contraparte,'descripcion',descripcion,'comprobante',comprobante,'monto',amount::text,'pagado',paid::text,'metodo_pago',q.metodo_pago,'plazo_dias',q.plazo_dias,'condiciones',q.condiciones,'pendiente',(amount-paid)::text) ORDER BY fecha DESC,id),'[]') INTO docs
 FROM(SELECT m.*,round(m.monto::numeric,2) amount,public.ganpro_paid(m.id,end_ms) paid FROM public.movimientos_financieros m WHERE ledger_version=1 AND coalesce(adopcion_fecha,fecha)<end_ms AND (anulado_en IS NULL OR anulado_en>=end_ms)) q;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'cuenta_id',cuenta_id,'movimiento_id',movimiento_id,'transferencia_id',transferencia_id,'reversa_de',reversa_de,'monto',a.monto::text,'fecha',a.fecha,'motivo',a.motivo,'metodo_pago',a.metodo_pago) ORDER BY a.fecha DESC,a.created_at DESC),'[]') INTO entries FROM public.asientos_caja a WHERE a.fecha<end_ms;
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
