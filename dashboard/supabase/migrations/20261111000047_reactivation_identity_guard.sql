BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_finance_void(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE doc public.movimientos_financieros; a public.animals; ident text; ts bigint:=(d->>'fecha')::bigint; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 SELECT * INTO doc FROM public.movimientos_financieros WHERE id=d->>'id' AND ledger_version=1 AND anulado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 PERFORM public.ganpro_assert_open(coalesce(doc.adopcion_fecha,doc.fecha));
 IF doc.categoria IN('VENTA','COMPRA') AND coalesce(cardinality(doc.animal_ids),0)=0 THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 IF ts<coalesce(doc.adopcion_fecha,doc.fecha) OR EXISTS(SELECT 1 FROM public.asientos_caja WHERE movimiento_id=doc.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
 IF public.ganpro_paid(doc.id)<>0 OR nullif(trim(d->>'motivo'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 FOREACH ident IN ARRAY coalesce(doc.animal_ids,'{}') LOOP
  SELECT * INTO a FROM public.animals WHERE id=ident;
  IF NOT FOUND OR (doc.categoria='VENTA' AND (a.estado<>'VENDIDO' OR a.venta_movimiento_id IS DISTINCT FROM doc.id)) OR (doc.categoria='COMPRA' AND (a.estado<>'ACTIVO' OR a.compra_movimiento_id IS DISTINCT FROM doc.id)) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
  IF doc.categoria='VENTA' AND EXISTS(SELECT 1 FROM public.animals other WHERE other.id<>a.id AND upper(trim(other.id_caravana))=upper(trim(a.id_caravana)) AND other.estado NOT IN('VENDIDO','MUERTO')) THEN RAISE EXCEPTION 'GANPRO_TAG_REUSE_CONFLICT'; END IF;
  IF doc.categoria='COMPRA' THEN
   -- Retain identity and history: an annulled purchase is an exit, not a DELETE.
   UPDATE public.animals SET estado='DESCARTE',compra_movimiento_id=NULL WHERE id=a.id;
  ELSE UPDATE public.animals SET estado='ACTIVO',venta_movimiento_id=NULL WHERE id=a.id; END IF;
  INSERT INTO public.eventos(animal_id,tipo,timestamp,valor,notas) VALUES(a.id,'ANULACION',ts,CASE WHEN doc.categoria='VENTA' THEN 1 ELSE -1 END,'Reversión de comprobante '||doc.id||': '||(d->>'motivo'));
 END LOOP;
 UPDATE public.movimientos_financieros SET anulado_en=ts WHERE id=doc.id;
 UPDATE public.escenario_lineas SET movimiento_id=NULL WHERE movimiento_id=doc.id;
 RETURN jsonb_build_object('message','Comprobante anulado con historial');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_finance_void(jsonb) FROM PUBLIC;
COMMIT;
