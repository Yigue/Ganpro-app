BEGIN;
CREATE UNIQUE INDEX inventory_day_unique ON public.inventario_cierres(((to_timestamp(fecha/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date));
CREATE FUNCTION public.ganpro_inventory_close(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.animals; price numeric; animals jsonb:='[]'; supplies jsonb; heads int:=0; kg numeric:=0; val numeric:=0; supplies_value numeric;
 ident text; ts bigint:=public.ganpro_now_ms(); previous public.inventario_cierres; result jsonb; income numeric; expense numeric; consumption numeric; sold_kg numeric; bought_kg numeric; reversal_income numeric; reversal_expense numeric; missing_kg boolean; BEGIN
 IF (to_timestamp((d->>'fecha')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_CURRENT_SNAPSHOT'; END IF;
 IF EXISTS(SELECT 1 FROM public.inventario_cierres WHERE (to_timestamp(fecha/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date=(clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF jsonb_typeof(d->'precios')<>'object' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.suplementos s WHERE stock_kg>0 AND NOT EXISTS(SELECT 1 FROM public.insumos_campo i WHERE i.suplemento_id=s.id)) THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
 FOR a IN SELECT * FROM public.animals WHERE estado='ACTIVO' LOOP
  price=public.ganpro_money(d->'precios'->>a.categoria);
  IF a.peso_actual IS NULL OR a.peso_actual<=0 THEN RAISE EXCEPTION 'GANPRO_MISSING_WEIGHT'; END IF;
  heads=heads+1;kg=kg+a.peso_actual;val=val+round(price*a.peso_actual::numeric,2);
  animals=animals||jsonb_build_array(jsonb_build_object('id',a.id,'categoria',a.categoria,'peso',a.peso_actual,'precio',price,'valor',round(price*a.peso_actual::numeric,2),'lote_id',a.lote_id,'potrero_id',a.potrero_id));
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'),coalesce(sum(valor),0) INTO supplies,supplies_value FROM public.insumos_campo s;
 SELECT * INTO previous FROM public.inventario_cierres ORDER BY fecha DESC LIMIT 1;
 IF FOUND THEN
  -- Receipt timestamps delimit captured operations; saved reports never reprice historical inputs.
  SELECT coalesce(sum(monto) FILTER(WHERE tipo='INGRESO'),0),coalesce(sum(monto) FILTER(WHERE tipo='GASTO' AND NOT es_inventario),0),coalesce(sum(m.kg) FILTER(WHERE categoria='VENTA'),0),coalesce(sum(m.kg) FILTER(WHERE categoria='COMPRA'),0)
  INTO income,expense,sold_kg,bought_kg FROM public.movimientos_financieros m WHERE created_at>previous.fecha AND created_at<=ts AND anulado_en IS NULL;
  SELECT coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='INGRESO'),0),coalesce(sum(-(next->>'monto')::numeric) FILTER(WHERE next->>'tipo'='GASTO' AND NOT (next->>'es_inventario')::boolean),0)
  INTO reversal_income,reversal_expense FROM public.command_audit WHERE table_name='movimientos_financieros' AND command_audit.previous->>'anulado_en' IS NULL AND next->>'anulado_en' IS NOT NULL AND extract(epoch FROM created_at)*1000>previous.fecha AND (next->>'created_at')::bigint<=previous.fecha;
  income=income+reversal_income;expense=expense+reversal_expense;
  SELECT EXISTS(SELECT 1 FROM public.movimientos_financieros m WHERE m.created_at>previous.fecha AND m.created_at<=ts AND m.categoria IN('COMPRA','VENTA') AND m.kg IS NULL AND m.anulado_en IS NULL) INTO missing_kg;
  SELECT -coalesce(sum(valor),0) INTO consumption FROM public.insumo_movimientos WHERE origen='CONSUMO' AND registrado_en>previous.fecha AND registrado_en<=ts;
  result=jsonb_build_object('desde',previous.fecha,'ingresos',income,'gastos',expense,'consumos',consumption,'variacion_animales',val-previous.valor_animales,
   'produccion_kg',CASE WHEN missing_kg THEN NULL ELSE sold_kg-bought_kg+kg-previous.kg END,'margen',income-expense-consumption+val-previous.valor_animales);
 END IF;
 INSERT INTO public.inventario_cierres(fecha,cabezas,kg,valor_animales,valor_insumos,animales,insumos,resultado,actor_id)
 VALUES(ts,heads,kg,val,supplies_value,animals,supplies,result,auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Inventario físico y valuación conservados; comparación disponible desde el segundo corte');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_inventory_close(jsonb) FROM PUBLIC;
COMMIT;
