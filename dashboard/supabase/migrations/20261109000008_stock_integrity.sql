BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.animals GROUP BY upper(trim(id_caravana)) HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM public.animals WHERE nullif(trim(rfid),'') IS NOT NULL GROUP BY trim(rfid) HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Reconcile duplicate visual/RFID identities before migrating; no data was merged';
 END IF;
END $$;
CREATE UNIQUE INDEX animals_visual_identity ON public.animals(upper(trim(id_caravana)));
CREATE UNIQUE INDEX animals_rfid_identity ON public.animals(trim(rfid)) WHERE nullif(trim(rfid),'') IS NOT NULL;
CREATE FUNCTION public.ganpro_validate_animal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_sex text; BEGIN
 IF nullif(trim(NEW.id_caravana),'') IS NULL OR NEW.sexo NOT IN('M','H') OR NEW.estado NOT IN('ACTIVO','VENDIDO','MUERTO','DESCARTE')
 OR (NEW.peso_actual IS NOT NULL AND (NEW.peso_actual<=0 OR NEW.peso_actual>9999 OR NEW.peso_actual='NaN'::float8)) THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 SELECT sexo INTO expected_sex FROM public.categorias_config WHERE categoria=NEW.categoria;
 IF NOT FOUND THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF expected_sex IS NOT NULL AND expected_sex<>NEW.sexo THEN RAISE EXCEPTION 'GANPRO_SEX_CATEGORY'; END IF;
 IF coalesce(current_setting('ganpro.command',true),'')<>'sync' AND (NEW.lote_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes WHERE id=NEW.lote_id)
 OR NEW.potrero_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros WHERE id=NEW.potrero_id)) THEN RAISE EXCEPTION 'GANPRO_INVALID_REFERENCE'; END IF;
 IF TG_OP='UPDATE' AND NEW.estado<>OLD.estado AND coalesce(current_setting('ganpro.command',true),'') NOT IN('stock.movement','finance.void','sync') THEN
  RAISE EXCEPTION 'GANPRO_INACTIVE_ANIMAL';
 END IF;
 NEW.id_caravana=upper(trim(NEW.id_caravana)); NEW.rfid=nullif(trim(NEW.rfid),'');
 RETURN NEW;
END $$;
CREATE TRIGGER ganpro_validate_animal BEFORE INSERT OR UPDATE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.ganpro_validate_animal();
-- NOT VALID preserves pre-existing orphans for explicit reconciliation while protecting all new writes.
ALTER TABLE public.animals ADD CONSTRAINT animal_lot_ref FOREIGN KEY(lote_id) REFERENCES public.lotes(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.animals ADD CONSTRAINT animal_paddock_ref FOREIGN KEY(potrero_id) REFERENCES public.potreros(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.eventos ADD CONSTRAINT event_animal_ref FOREIGN KEY(animal_id) REFERENCES public.animals(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
ALTER TABLE public.animal_movements ADD CONSTRAINT movement_animal_ref FOREIGN KEY(animal_id) REFERENCES public.animals(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
REVOKE ALL ON FUNCTION public.ganpro_validate_animal() FROM PUBLIC;
COMMIT;
