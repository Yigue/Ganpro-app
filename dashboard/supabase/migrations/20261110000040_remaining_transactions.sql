BEGIN;
CREATE FUNCTION public.ganpro_config_categories(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; BEGIN
 IF jsonb_typeof(d)<>'array' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(d) LOOP
  IF (item->>'ev')::numeric<=0 OR (item->>'edad_recategorizacion_meses')::int<=0 OR (item->>'consumo_sal_g_dia')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF item->>'recategoriza_a' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.categorias_config WHERE categoria=item->>'recategoriza_a') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
  UPDATE public.categorias_config SET ev=(item->>'ev')::float8,recategoriza_a=item->>'recategoriza_a',edad_recategorizacion_meses=(item->>'edad_recategorizacion_meses')::int,consumo_sal_g_dia=(item->>'consumo_sal_g_dia')::float8 WHERE categoria=item->>'categoria';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 END LOOP;
 RETURN jsonb_build_object('message','Categorías actualizadas juntas');
END $$;
CREATE FUNCTION public.ganpro_scenario_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE start_ bigint:=(d->>'desde')::bigint; end_ bigint:=(d->>'hasta')::bigint; result jsonb; inc numeric; buy numeric; direct numeric; used numeric; sold numeric; heads numeric; qty int; BEGIN
 IF start_ IS NULL OR end_ IS NULL OR end_<start_ THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF (to_timestamp(end_/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT coalesce(sum(monto) FILTER(WHERE tipo='INGRESO'),0),coalesce(sum(monto) FILTER(WHERE categoria='COMPRA'),0),coalesce(sum(monto) FILTER(WHERE tipo='GASTO' AND categoria IN('SANIDAD','NUTRICION','ALQUILER','MANO_OBRA')),0),coalesce(sum(kg) FILTER(WHERE categoria='VENTA'),0),coalesce(sum(cabezas) FILTER(WHERE categoria='VENTA'),0),count(*)
 INTO inc,buy,direct,sold,heads,qty FROM public.movimientos_financieros WHERE lote_id=d->>'lote_id' AND fecha BETWEEN start_ AND end_ AND anulado_en IS NULL AND NOT es_inventario;
 SELECT -coalesce(sum(valor),0) INTO used FROM public.insumo_movimientos WHERE lote_id=d->>'lote_id' AND origen='CONSUMO' AND fecha BETWEEN start_ AND end_;
 result=jsonb_build_object('desde',start_,'hasta',end_,'ingreso',inc,'compra',buy,'costosDirectos',direct+used,'margenBruto',inc-buy-direct-used,'cabezasVendidas',heads,'kgVendidos',sold,'precioVentaKg',inc/nullif(sold,0),'movimientos',qty);
 UPDATE public.escenarios SET estado='CERRADO',lote_id=d->>'lote_id',resultado_real=result WHERE id=d->>'id' AND estado<>'CERRADO';
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 RETURN jsonb_build_object('message','Escenario cerrado con gastos y consumos reales, sin duplicar compras de insumos');
END $$;
CREATE FUNCTION public.ganpro_protect_scenario() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='escenarios' THEN
  IF TG_OP='DELETE' AND (OLD.estado='CERRADO' OR EXISTS(SELECT 1 FROM public.escenario_lineas WHERE escenario_id=OLD.id AND movimiento_id IS NOT NULL)) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 ELSE
  IF TG_OP='UPDATE' AND NEW.movimiento_id IS DISTINCT FROM OLD.movimiento_id AND coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void') THEN RAISE EXCEPTION 'GANPRO_FORBIDDEN'; END IF;
  IF TG_OP='DELETE' AND OLD.movimiento_id IS NOT NULL THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_scenario_delete BEFORE DELETE ON public.escenarios FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_scenario();
CREATE TRIGGER protect_real_line BEFORE UPDATE OR DELETE ON public.escenario_lineas FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_scenario();
REVOKE ALL ON FUNCTION public.ganpro_config_categories(jsonb),public.ganpro_scenario_close(jsonb),public.ganpro_protect_scenario() FROM PUBLIC;
COMMIT;
