BEGIN;
CREATE FUNCTION public.ganpro_scenario_save(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ident text:=coalesce(d->>'id',gen_random_uuid()::text); line jsonb; BEGIN
 IF nullif(trim(d->>'nombre'),'') IS NULL OR d->>'tipo' NOT IN('negocio','peso','plan','cria') THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF d ? 'id' THEN
  UPDATE public.escenarios SET nombre=d->>'nombre',tipo=d->>'tipo',lote_id=d->>'lote_id',supuestos=d->'supuestos',resultado=d->'resultado' WHERE id=ident AND estado<>'CERRADO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_CONFLICT'; END IF;
 ELSE INSERT INTO public.escenarios(id,nombre,tipo,lote_id,supuestos,resultado) VALUES(ident,d->>'nombre',d->>'tipo',d->>'lote_id',d->'supuestos',d->'resultado'); END IF;
 IF d ? 'lineas' THEN
  IF jsonb_typeof(d->'lineas')<>'array' OR jsonb_array_length(d->'lineas')>1000 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
  DELETE FROM public.escenario_lineas WHERE escenario_id=ident AND movimiento_id IS NULL;
  FOR line IN SELECT value FROM jsonb_array_elements(d->'lineas') LOOP
   IF (line->>'cabezas')::int<=0 OR (line->>'kg')::numeric<0 OR (line->>'precioKg')::numeric<0 THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
   INSERT INTO public.escenario_lineas(escenario_id,mes,tipo,categoria,cabezas,kg,precio_kg,monto)
   VALUES(ident,line->>'mes',line->>'tipo',line->>'categoria',(line->>'cabezas')::int,(line->>'kg')::numeric,(line->>'precioKg')::numeric,(line->>'cabezas')::int*(line->>'kg')::numeric*(line->>'precioKg')::numeric);
  END LOOP;
 END IF;
 RETURN jsonb_build_object('id',ident,'message','Escenario y líneas guardados juntos; operaciones reales conservadas');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_scenario_save(jsonb) FROM PUBLIC;
COMMIT;
