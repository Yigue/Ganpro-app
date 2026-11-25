BEGIN;
ALTER TABLE public.movimientos_financieros
 ADD COLUMN desbaste_pct numeric(5,2) CHECK(desbaste_pct BETWEEN 0 AND 20),
 ADD COLUMN kg_facturados numeric(16,2) CHECK(kg_facturados>0),
 ADD COLUMN plazo_dias int CHECK(plazo_dias BETWEEN 0 AND 365),
 ADD COLUMN metodo_pago text CHECK(metodo_pago IN('A_CONVENIR','TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO')),
 ADD COLUMN condiciones text CHECK(length(condiciones)<=1000);
CREATE OR REPLACE FUNCTION public.ganpro_stock_movement(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE tags jsonb; ids text[]; n int; price numeric; total numeric; details jsonb; shrink numeric:=coalesce((d->>'desbaste_pct')::numeric,0); billed numeric; days_ int:=(d->>'plazo_dias')::int; due_ bigint; BEGIN
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
 IF nullif(d->>'categoria_filtro','') IS NOT NULL AND d->>'tipo' NOT IN('COMPRA','NACIMIENTO') AND EXISTS(SELECT 1 FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' AND categoria<>d->>'categoria_filtro') THEN RAISE EXCEPTION 'GANPRO_CATEGORY_SELECTION'; END IF;
 IF shrink<0 OR shrink>20 OR shrink='NaN'::numeric OR (days_ IS NOT NULL AND days_ NOT BETWEEN 0 AND 365) OR length(d->>'condiciones')>1000 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
 IF days_ IS NOT NULL AND d->>'tipo' IN('VENTA','COMPRA') THEN
  due_=(extract(epoch FROM (((to_timestamp((d->>'fecha')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+days_+1)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'))*1000)::bigint-1;
  IF d->>'vencimiento' IS NOT NULL AND (to_timestamp((d->>'vencimiento')::bigint/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date<>(to_timestamp(due_/1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
  d=d||jsonb_build_object('vencimiento',due_);
 END IF;
 IF d->>'tipo' IN('VENTA','COMPRA') AND d->>'modalidad_precio' IS NOT NULL THEN
  price=public.ganpro_money(d->>'precio_unitario');
  IF d->>'modalidad_precio'='KG' THEN
   IF d->>'kg' IS NULL OR (d->>'kg')::numeric<=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   billed=round((d->>'kg')::numeric*(1-shrink/100),2);
   IF billed<=0 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
   total=round(billed*price,2);
  ELSIF d->>'modalidad_precio'='CABEZA' THEN
   IF shrink<>0 THEN RAISE EXCEPTION 'GANPRO_TRADE_TERMS'; END IF;
   total=price*n;
  ELSE RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  IF d->>'tipo'='COMPRA' THEN details=jsonb_build_array(jsonb_build_object('categoria',d->>'categoria','cabezas',n));
  ELSE SELECT jsonb_agg(to_jsonb(x)) INTO details FROM(SELECT categoria,count(*) cabezas FROM public.animals WHERE upper(trim(id_caravana)) IN(SELECT upper(trim(value)) FROM jsonb_array_elements_text(d->'caravanas')) AND estado='ACTIVO' GROUP BY categoria) x; END IF;
  d=d||jsonb_build_object('monto',total::text,'detalle_categorias',details,'kg_facturados',billed,'desbaste_pct',shrink);
 END IF;
 RETURN public.ganpro_stock_movement_v50(d);
END $$;
REVOKE ALL ON FUNCTION public.ganpro_stock_movement_v50(jsonb),public.ganpro_stock_movement(jsonb) FROM PUBLIC;
COMMIT;
