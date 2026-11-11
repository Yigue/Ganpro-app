BEGIN;
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE kind text:=d->>'tipo'; ts bigint:=(d->>'fecha')::bigint; tag text; tags text[];
 a public.animals; ids text[]:='{}'; cat text; sex text; amount jsonb; plan public.escenario_lineas; BEGIN
 PERFORM public.ganpro_assert_open(ts);
 IF kind IS NULL OR kind NOT IN('VENTA','COMPRA','MUERTE','NACIMIENTO','TRASLADO') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT array_agg(upper(trim(value))) INTO tags FROM jsonb_array_elements_text(d->'caravanas');
 IF coalesce(cardinality(tags),0)=0 OR cardinality(tags)>1000 OR EXISTS(SELECT 1 FROM unnest(tags) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'lote_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=d->>'lote_destino_id')
 OR d->>'potrero_destino_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=d->>'potrero_destino_id') THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF d->>'kg' IS NOT NULL AND (d->>'kg' !~ '^\d{1,9}(\.\d{1,4})?$' OR (d->>'kg')::numeric<=0 OR (d->>'kg')::numeric>9999*cardinality(tags)) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN PERFORM public.ganpro_money(d->>'monto'); END IF;
 IF kind='VENTA' AND (d->>'kg' IS NULL OR (d->>'kg')::numeric<=0) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d->>'escenario_linea_id' IS NOT NULL THEN
  SELECT * INTO plan FROM public.escenario_lineas WHERE id=d->>'escenario_linea_id';
  IF NOT FOUND OR plan.movimiento_id IS NOT NULL OR plan.tipo<>kind OR plan.cabezas<>cardinality(tags) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 END IF;
 FOREACH tag IN ARRAY tags LOOP
  IF kind IN('COMPRA','NACIMIENTO') THEN
   sex=coalesce(d->>'sexo','H'); cat=coalesce(d->>'categoria',CASE WHEN sex='M' THEN 'Ternero' ELSE 'Ternera' END);
   IF kind='NACIMIENTO' AND cat NOT IN('Ternero','Ternera') THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
   INSERT INTO public.animals(id_caravana,sexo,categoria,estado,fecha_nacimiento,peso_actual,lote_id,potrero_id)
   VALUES(tag,sex,cat,'ACTIVO',CASE WHEN kind='NACIMIENTO' THEN ts END,
   (d->>'kg')::float8/cardinality(tags),d->>'lote_destino_id',d->>'potrero_destino_id') RETURNING * INTO a;
   INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   IF a.peso_actual IS NOT NULL THEN INSERT INTO public.eventos(animal_id,tipo,valor,timestamp) VALUES(a.id,'PESAJE',a.peso_actual,ts); END IF;
  ELSE
   SELECT * INTO a FROM public.animals WHERE upper(trim(id_caravana))=tag;
   IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
   IF a.estado<>'ACTIVO' THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
   IF a.fecha_nacimiento>ts OR EXISTS(SELECT 1 FROM public.eventos WHERE animal_id=a.id AND timestamp>ts) OR EXISTS(SELECT 1 FROM public.animal_movements WHERE animal_id=a.id AND fecha>ts) THEN RAISE EXCEPTION 'GANPRO_DATE_ORDER'; END IF;
   IF kind='TRASLADO' THEN
    IF d->>'lote_destino_id' IS NULL AND d->>'potrero_destino_id' IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
    INSERT INTO public.animal_movements(animal_id,potrero_origen_id,potrero_destino_id,lote_origen_id,lote_destino_id,fecha)
    VALUES(a.id,a.potrero_id,coalesce(d->>'potrero_destino_id',a.potrero_id),a.lote_id,coalesce(d->>'lote_destino_id',a.lote_id),ts);
    UPDATE public.animals SET potrero_id=coalesce(d->>'potrero_destino_id',potrero_id),lote_id=coalesce(d->>'lote_destino_id',lote_id) WHERE id=a.id;
   ELSE
    IF kind='VENTA' AND public.ganpro_animal_withdrawal(a.id,ts) THEN RAISE EXCEPTION 'GANPRO_WITHDRAWAL'; END IF;
    UPDATE public.animals SET estado=CASE WHEN kind='VENTA' THEN 'VENDIDO' ELSE 'MUERTO' END WHERE id=a.id;
    INSERT INTO public.eventos(animal_id,tipo,timestamp,notas,dte_numero) VALUES(a.id,kind,ts,d->>'notas',d->>'dte_numero');
   END IF;
  END IF;
  ids=array_append(ids,a.id);
 END LOOP;
 IF plan.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.animals WHERE id=ANY(ids) AND categoria<>plan.categoria) THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 IF kind IN('VENTA','COMPRA') THEN
  amount=public.ganpro_finance_document(d||jsonb_build_object('tipo',CASE WHEN kind='VENTA' THEN 'INGRESO' ELSE 'GASTO' END,'categoria',kind,
   'descripcion',coalesce(d->>'notas',kind||' '||cardinality(tags)||' cabezas'),'cabezas',cardinality(tags),'animal_ids',to_jsonb(ids),
   'categoria_animal',(SELECT CASE WHEN count(DISTINCT categoria)=1 THEN min(categoria) END FROM public.animals WHERE id=ANY(ids)),
   'lote_id',(SELECT CASE WHEN count(DISTINCT lote_id)=1 THEN min(lote_id) END FROM public.animals WHERE id=ANY(ids))));
  IF kind='VENTA' THEN UPDATE public.animals SET venta_movimiento_id=amount->>'id' WHERE id=ANY(ids);
  ELSE UPDATE public.animals SET compra_movimiento_id=amount->>'id' WHERE id=ANY(ids); END IF;
  IF plan.id IS NOT NULL THEN UPDATE public.escenario_lineas SET movimiento_id=amount->>'id' WHERE id=plan.id; END IF;
 END IF;
 RETURN jsonb_build_object('message',kind||': '||cardinality(tags)||' animales registrados','id',amount->>'id');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement(jsonb) FROM PUBLIC;
COMMIT;
