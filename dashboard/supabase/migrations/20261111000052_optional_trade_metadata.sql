BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_finance_document(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text; ts bigint:=(d->>'fecha')::bigint; amount numeric:=public.ganpro_money(d->>'monto'); BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF d->>'tipo' NOT IN('GASTO','INGRESO') OR nullif(trim(d->>'categoria'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF coalesce((d->>'vencimiento')::bigint,ts)<ts THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF d->>'categoria' IN('VENTA','COMPRA') AND current_setting('ganpro.command',true)<>'stock.movement' THEN RAISE EXCEPTION 'GANPRO_PLAN_REQUIRES_STOCK'; END IF;
 IF d->>'lote_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 INSERT INTO public.movimientos_financieros(tipo,categoria,lote_id,monto,fecha,descripcion,comprobante,dte_numero,cabezas,kg,categoria_animal,renspa_destino,dte_estado,cobrado,ledger_version,vencimiento,contraparte,centro_costo,animal_ids,modalidad_precio,precio_unitario,detalle_categorias)
 VALUES(d->>'tipo',d->>'categoria',d->>'lote_id',amount,ts,d->>'descripcion',d->>'comprobante',d->>'dte_numero',(d->>'cabezas')::int,(d->>'kg')::float8,d->>'categoria_animal',d->>'renspa_destino',CASE WHEN d->>'dte_numero' IS NOT NULL THEN 'EMITIDO' END,false,1,
 coalesce((d->>'vencimiento')::bigint,ts),d->>'contraparte',d->>'centro_costo',ARRAY(SELECT jsonb_array_elements_text(coalesce(d->'animal_ids','[]'))),d->>'modalidad_precio',(d->>'precio_unitario')::numeric,d->'detalle_categorias') RETURNING id INTO ident;
 IF d->>'pagado' IS NOT NULL THEN
  PERFORM public.ganpro_finance_settle(jsonb_build_object('movimiento_id',ident,'cuenta_id',d->>'cuenta_id','monto',d->>'pagado','fecha',ts));
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Comprobante registrado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_document(jsonb) FROM PUBLIC;
COMMIT;
