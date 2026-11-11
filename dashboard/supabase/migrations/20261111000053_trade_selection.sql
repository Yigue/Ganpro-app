BEGIN;
ALTER FUNCTION public.ganpro_stock_movement(jsonb) RENAME TO ganpro_stock_movement_v50;
CREATE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tags jsonb; ids text[]; n int; price numeric; total numeric; details jsonb; BEGIN
 IF d ? 'animal_ids' THEN
  IF jsonb_typeof(d->'animal_ids')<>'array' THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT array_agg(value) INTO ids FROM jsonb_array_elements_text(d->'animal_ids');
  IF coalesce(cardinality(ids),0)=0 OR cardinality(ids)>1000 OR EXISTS(SELECT 1 FROM unnest(ids) x GROUP BY x HAVING count(*)>1) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT jsonb_agg(id_caravana) INTO tags FROM public.animals WHERE id=ANY(ids) AND estado='ACTIVO';
  IF coalesce(jsonb_array_length(tags),0)<>cardinality(ids) THEN RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL'; END IF;
  d=d||jsonb_build_object('caravanas',tags);
 ELSIF d->>'tipo' IN('COMPRA','NACIMIENTO') AND coalesce(jsonb_array_length(d->'caravanas'),0)=0 THEN
  n=(d->>'cantidad')::int;
  IF n IS NULL OR n NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  SELECT jsonb_agg('SIN-CARAVANA-'||gen_random_uuid()::text) INTO tags FROM generate_series(1,n);
  d=d||jsonb_build_object('caravanas',tags);
 END IF;
 n=jsonb_array_length(d->'caravanas');
 IF d->>'tipo' IN('VENTA','COMPRA') AND d->>'modalidad_precio' IS NOT NULL THEN
  price=public.ganpro_money(d->>'precio_unitario');
  IF d->>'modalidad_precio'='KG' THEN
   IF d->>'kg' IS NULL OR (d->>'kg')::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   total=round((d->>'kg')::numeric*price,2);
  ELSIF d->>'modalidad_precio'='CABEZA' THEN total=price*n;
  ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF d->>'tipo'='COMPRA' THEN details=jsonb_build_array(jsonb_build_object('categoria',d->>'categoria','cabezas',n));
  ELSE SELECT jsonb_agg(to_jsonb(x)) INTO details FROM(SELECT categoria,count(*) cabezas FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' GROUP BY categoria) x; END IF;
  d=d||jsonb_build_object('monto',total::text,'detalle_categorias',details);
 END IF;
 RETURN public.ganpro_stock_movement_v50(d);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement_v50(jsonb),public.ganpro_stock_movement(jsonb) FROM PUBLIC;
COMMIT;
