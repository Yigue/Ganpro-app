BEGIN;
CREATE FUNCTION public.ganpro_supply_open(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; qty numeric:=(d->>'cantidad')::numeric; val numeric:=(d->>'valor_inicial')::numeric; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' OR d->>'valor_inicial' !~ '^\d{1,12}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF EXISTS(SELECT 1 FROM public.insumos_campo WHERE suplemento_id=d->>'suplemento_id' OR operation_id=d->>'operation_id') THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF qty IS NULL OR val IS NULL OR qty<>round(qty,4) OR val<>round(val,2) OR qty<0 OR val<0 OR (qty=0 AND val<>0) OR nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'tipo'='ALIMENTO' AND NOT EXISTS(SELECT 1 FROM public.suplementos WHERE id=d->>'suplemento_id' AND coalesce(stock_kg,0)=qty) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 INSERT INTO public.insumos_campo(nombre,tipo,unidad,suplemento_id,operation_id,cantidad,valor,fecha_apertura)
 VALUES(d->>'nombre',d->>'tipo',d->>'unidad',d->>'suplemento_id',d->>'operation_id',qty,val,ts) RETURNING id INTO ident;
 IF d->>'tipo'='MEDICAMENTO' AND qty>0 THEN
  IF d->>'partida' IS NULL OR d->>'caducidad' IS NULL OR (d->>'caducidad')::bigint<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
  INSERT INTO public.insumo_partidas(insumo_id,nombre,cantidad,caducidad) VALUES(ident,d->>'partida',qty,(d->>'caducidad')::bigint);
 END IF;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,motivo) VALUES(ident,qty,val,ts,'APERTURA','Inventario inicial declarado; no genera caja');
 RETURN jsonb_build_object('id',ident,'message','Insumo incorporado con apertura sin generar caja');
END $$;
CREATE FUNCTION public.ganpro_supply_purchase(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.insumos_campo; qty numeric:=(d->>'cantidad')::numeric; cost numeric:=public.ganpro_money(d->>'monto'); ts bigint:=(d->>'fecha')::bigint; doc jsonb; batch text; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO s FROM public.insumos_campo WHERE id=d->>'insumo_id';
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF s.id IS NULL OR qty IS NULL OR qty<=0 OR qty<>round(qty,4) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF ts<s.fecha_apertura OR EXISTS(SELECT 1 FROM public.insumo_movimientos WHERE insumo_id=s.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF s.tipo='MEDICAMENTO' AND (nullif(trim(d->>'partida'),'') IS NULL OR d->>'caducidad' IS NULL) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF (d->>'caducidad')::bigint<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
 IF d->>'partida' IS NOT NULL THEN
  INSERT INTO public.insumo_partidas(insumo_id,nombre,cantidad,caducidad) VALUES(s.id,d->>'partida',qty,(d->>'caducidad')::bigint) RETURNING id INTO batch;
 END IF;
 doc=public.ganpro_finance_document(d||jsonb_build_object('tipo','GASTO','categoria',CASE WHEN s.tipo='ALIMENTO' THEN 'NUTRICION' WHEN s.tipo='MEDICAMENTO' THEN 'SANIDAD' ELSE 'OTRO' END,'descripcion','Compra de insumo: '||s.nombre));
 UPDATE public.movimientos_financieros SET es_inventario=true WHERE id=doc->>'id';
 UPDATE public.insumos_campo SET cantidad=cantidad+qty,valor=valor+cost WHERE id=s.id;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,referencia_id,partida_id) VALUES(s.id,qty,cost,ts,'COMPRA',doc->>'id',batch);
 IF s.suplemento_id IS NOT NULL THEN UPDATE public.suplementos SET stock_kg=s.cantidad+qty WHERE id=s.suplemento_id; END IF;
 RETURN doc||jsonb_build_object('message','Compra, existencias y obligación guardadas juntas');
END $$;
CREATE FUNCTION public.ganpro_supply_consume(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE s public.insumos_campo; qty numeric:=(d->>'cantidad')::numeric; ts bigint:=(d->>'fecha')::bigint; cost numeric; ident text; batch public.insumo_partidas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO s FROM public.insumos_campo WHERE id=d->>'insumo_id';
 IF d->>'cantidad' !~ '^\d{1,9}(\.\d{1,4})?$' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF s.id IS NULL OR qty IS NULL OR qty<=0 OR qty<>round(qty,4) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF ts<s.fecha_apertura OR EXISTS(SELECT 1 FROM public.insumo_movimientos WHERE insumo_id=s.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF qty>s.cantidad THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF s.tipo='MEDICAMENTO' OR d->>'partida_id' IS NOT NULL THEN
  SELECT * INTO batch FROM public.insumo_partidas WHERE id=d->>'partida_id' AND insumo_id=s.id;
  IF NOT FOUND OR batch.cantidad<qty THEN RAISE EXCEPTION 'GANPRO_INSUFFICIENT_STOCK'; END IF;
  IF batch.caducidad IS NULL OR batch.caducidad<ts THEN RAISE EXCEPTION 'GANPRO_EXPIRED_BATCH'; END IF;
  UPDATE public.insumo_partidas SET cantidad=cantidad-qty WHERE id=batch.id;
 END IF;
 cost=CASE WHEN qty=s.cantidad THEN s.valor ELSE round(s.valor*qty/nullif(s.cantidad,0),2) END;
 UPDATE public.insumos_campo SET cantidad=cantidad-qty,valor=valor-cost WHERE id=s.id;
 INSERT INTO public.insumo_movimientos(insumo_id,cantidad,valor,fecha,origen,lote_id,potrero_id,partida_id,motivo,referencia_id)
 VALUES(s.id,-qty,-cost,ts,'CONSUMO',d->>'lote_id',d->>'potrero_id',batch.id,d->>'motivo',d->>'referencia_id') RETURNING id INTO ident;
 IF s.suplemento_id IS NOT NULL THEN UPDATE public.suplementos SET stock_kg=s.cantidad-qty WHERE id=s.suplemento_id; END IF;
 RETURN jsonb_build_object('id',ident,'costo',cost,'message','Consumo registrado con costo histórico; no genera otro pago');
END $$;
CREATE FUNCTION public.ganpro_protect_supply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.stock_kg IS DISTINCT FROM OLD.stock_kg AND EXISTS(SELECT 1 FROM public.insumos_campo WHERE suplemento_id=OLD.id)
 AND coalesce(current_setting('ganpro.command',true),'') NOT IN('supply.purchase','supply.consume','nutrition.deliver','health.apply') THEN RAISE EXCEPTION 'GANPRO_MANAGED_STOCK'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_supply BEFORE UPDATE ON public.suplementos FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_supply();
REVOKE ALL ON FUNCTION public.ganpro_supply_open(jsonb),public.ganpro_supply_purchase(jsonb),public.ganpro_supply_consume(jsonb),public.ganpro_protect_supply() FROM PUBLIC;
COMMIT;
