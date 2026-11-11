BEGIN;
-- Reconstruct membership from recorded transfers, using the origin for the first future transfer.
CREATE FUNCTION public.ganpro_animals_at(ts bigint) RETURNS TABLE(id text,lote_id text,potrero_id text)
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT a.id,
 CASE WHEN past.id IS NOT NULL THEN past.lote_destino_id WHEN future.id IS NOT NULL THEN future.lote_origen_id ELSE a.lote_id END,
 CASE WHEN past.id IS NOT NULL THEN past.potrero_destino_id WHEN future.id IS NOT NULL THEN future.potrero_origen_id ELSE a.potrero_id END
 FROM public.animals a
 LEFT JOIN LATERAL(SELECT * FROM public.animal_movements m WHERE m.animal_id=a.id AND fecha<=ts ORDER BY fecha DESC,created_at DESC LIMIT 1) past ON true
 LEFT JOIN LATERAL(SELECT * FROM public.animal_movements m WHERE m.animal_id=a.id AND fecha>ts ORDER BY fecha,created_at LIMIT 1) future ON true
 LEFT JOIN LATERAL(SELECT tipo,valor FROM public.eventos e WHERE e.animal_id=a.id AND timestamp<=ts AND tipo IN('COMPRA','NACIMIENTO','VENTA','MUERTE','ANULACION') ORDER BY timestamp DESC,created_at DESC LIMIT 1) life ON true
 WHERE coalesce((SELECT min(timestamp) FROM public.eventos WHERE animal_id=a.id AND tipo IN('COMPRA','NACIMIENTO')),a.created_at)<=ts
 AND CASE WHEN life.tipo IN('VENTA','MUERTE') THEN false WHEN life.tipo='ANULACION' THEN life.valor>0
 WHEN life.tipo IN('COMPRA','NACIMIENTO') THEN true ELSE a.estado='ACTIVO' OR a.updated_at>ts END
$$;
CREATE FUNCTION public.ganpro_capture_recipients() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int; unit_cost numeric; used jsonb; supply public.insumos_campo; BEGIN
 INSERT INTO public.aplicacion_animales(aplicacion_id,animal_id)
 SELECT NEW.id,a.id FROM public.ganpro_animals_at(NEW.fecha_aplicacion) a
 WHERE (NEW.animal_id IS NOT NULL AND a.id=NEW.animal_id) OR (NEW.animal_id IS NULL AND NEW.lote_id IS NOT NULL AND a.lote_id=NEW.lote_id);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 SELECT costo_unitario INTO unit_cost FROM public.operations_catalog WHERE id=NEW.operation_id;
 IF NEW.insumo_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.insumos_campo WHERE operation_id=NEW.operation_id) THEN
  SELECT * INTO supply FROM public.insumos_campo WHERE id=NEW.insumo_id AND operation_id=NEW.operation_id AND tipo='MEDICAMENTO';
  IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_UNMANAGED_SUPPLY'; END IF;
  used=public.ganpro_supply_consume(jsonb_build_object('insumo_id',supply.id,'cantidad',coalesce(NEW.dosis,1)*n,'fecha',NEW.fecha_aplicacion,'lote_id',NEW.lote_id,'partida_id',NEW.partida_id,'motivo','Aplicación sanitaria','referencia_id',NEW.id));
  unit_cost=(used->>'costo')::numeric/nullif(coalesce(NEW.dosis,1)*n,0);
 END IF;
 UPDATE public.operation_logs SET receptores_fijados=true,cantidad_animales=n,costo_total=unit_cost*coalesce(NEW.dosis,1)*n WHERE id=NEW.id;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_recipients AFTER INSERT ON public.operation_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_capture_recipients();
CREATE FUNCTION public.ganpro_animal_withdrawal(ident text,ts bigint) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.operation_logs l WHERE fecha_aplicacion<=ts AND fecha_fin_carencia>ts AND
 (EXISTS(SELECT 1 FROM public.aplicacion_animales r WHERE r.aplicacion_id=l.id AND animal_id=ident)
 OR (NOT l.receptores_fijados AND (l.animal_id=ident OR EXISTS(SELECT 1 FROM public.ganpro_animals_at(l.fecha_aplicacion) a WHERE a.id=ident AND a.lote_id=l.lote_id)))))
$$;
-- Prevent the mobile v3 push or REST from rewriting a fixed treatment's recipients, dose or costs.
CREATE FUNCTION public.ganpro_protect_treatment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF OLD.receptores_fijados AND (TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['updated_at','server_created_at','server_updated_at','synced_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','server_created_at','server_updated_at','synced_at'])) THEN RAISE EXCEPTION 'GANPRO_REVERSAL_REQUIRED'; END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER protect_treatment BEFORE UPDATE OR DELETE ON public.operation_logs FOR EACH ROW EXECUTE FUNCTION public.ganpro_protect_treatment();
REVOKE ALL ON FUNCTION public.ganpro_animals_at(bigint),public.ganpro_capture_recipients(),public.ganpro_animal_withdrawal(text,bigint),public.ganpro_protect_treatment() FROM PUBLIC;
COMMIT;
