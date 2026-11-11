BEGIN;
ALTER TABLE public.operation_logs ADD COLUMN receptores_fijados boolean NOT NULL DEFAULT false,
 ADD COLUMN cantidad_animales int, ADD COLUMN costo_total numeric(16,2);
CREATE TABLE public.aplicacion_animales(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, aplicacion_id text NOT NULL REFERENCES public.operation_logs(id) ON DELETE RESTRICT,
 animal_id text NOT NULL REFERENCES public.animals(id) ON DELETE RESTRICT, UNIQUE(aplicacion_id,animal_id)
);
CREATE TABLE public.insumos_campo(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,nombre text NOT NULL,
 tipo text NOT NULL CHECK(tipo IN('ALIMENTO','MEDICAMENTO','OTRO')),unidad text NOT NULL CHECK(unidad IN('KG','DOSIS','UNIDAD','ML')),
 suplemento_id text UNIQUE REFERENCES public.suplementos(id),operation_id text UNIQUE REFERENCES public.operations_catalog(id),
 cantidad numeric(18,4) NOT NULL CHECK(cantidad>=0),valor numeric(16,2) NOT NULL CHECK(valor>=0),fecha_apertura bigint NOT NULL,
 CHECK((tipo='ALIMENTO' AND unidad='KG' AND suplemento_id IS NOT NULL) OR (tipo<>'ALIMENTO' AND suplemento_id IS NULL))
);
CREATE TABLE public.insumo_partidas(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,insumo_id text NOT NULL REFERENCES public.insumos_campo(id),
 nombre text NOT NULL,cantidad numeric(18,4) NOT NULL CHECK(cantidad>=0),caducidad bigint,UNIQUE(insumo_id,nombre)
);
CREATE TABLE public.insumo_movimientos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,insumo_id text NOT NULL REFERENCES public.insumos_campo(id),
 cantidad numeric(18,4) NOT NULL,valor numeric(16,2) NOT NULL,fecha bigint NOT NULL,
 origen text NOT NULL CHECK(origen IN('APERTURA','COMPRA','CONSUMO')),referencia_id text,
 lote_id text REFERENCES public.lotes(id),potrero_id text REFERENCES public.potreros(id),partida_id text REFERENCES public.insumo_partidas(id),motivo text
);
ALTER TABLE public.movimientos_financieros ADD COLUMN es_inventario boolean NOT NULL DEFAULT false;
ALTER TABLE public.potrero_feeding_logs ADD COLUMN costo_total numeric(16,2),ADD COLUMN snapshot_formula jsonb;
ALTER TABLE public.animals ADD COLUMN madre_id text REFERENCES public.animals(id),ADD COLUMN padre_id text REFERENCES public.animals(id);
CREATE TABLE public.repro_ciclos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,madre_id text NOT NULL REFERENCES public.animals(id),padre_id text REFERENCES public.animals(id),
 servicio_id text NOT NULL REFERENCES public.servicios(id),fecha_servicio bigint NOT NULL,
 estado text NOT NULL DEFAULT 'SERVIDA' CHECK(estado IN('SERVIDA','PRENADA','VACIA','PARIDA','DESTETADA','PERDIDA')),
 fecha_tacto bigint,fecha_parto bigint,ternero_id text UNIQUE REFERENCES public.animals(id),fecha_destete bigint,peso_destete numeric(10,2)
);
CREATE UNIQUE INDEX repro_cycle_open ON public.repro_ciclos(madre_id) WHERE estado NOT IN('VACIA','DESTETADA','PERDIDA');
CREATE TABLE public.planes_pastoreo(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,lote_id text NOT NULL REFERENCES public.lotes(id),potrero_id text NOT NULL REFERENCES public.potreros(id),
 entrada bigint NOT NULL,salida bigint NOT NULL CHECK(salida>entrada),descanso_dias int NOT NULL CHECK(descanso_dias BETWEEN 1 AND 365),
 forraje_kg_ms_ha numeric(12,2) NOT NULL CHECK(forraje_kg_ms_ha>0),remanente_kg_ms_ha numeric(12,2) NOT NULL CHECK(remanente_kg_ms_ha>=0),
 consumo_ev_dia numeric(10,2) NOT NULL CHECK(consumo_ev_dia>0),
 estado text NOT NULL DEFAULT 'PLANIFICADO' CHECK(estado IN('PLANIFICADO','EN_CURSO','COMPLETADO')),animales text[],entrada_real bigint,salida_real bigint
);
CREATE TABLE public.inventario_cierres(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,fecha bigint NOT NULL UNIQUE,cabezas int NOT NULL,kg numeric(18,2) NOT NULL,
 valor_animales numeric(18,2) NOT NULL,valor_insumos numeric(18,2) NOT NULL,animales jsonb NOT NULL,insumos jsonb NOT NULL,
 resultado jsonb,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.banco_extractos(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id),desde bigint NOT NULL,hasta bigint NOT NULL,
 saldo_inicial numeric(16,2) NOT NULL,saldo_final numeric(16,2) NOT NULL,CHECK(hasta>=desde)
);
CREATE TABLE public.banco_lineas(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,extracto_id text NOT NULL REFERENCES public.banco_extractos(id),cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id),
 fecha bigint NOT NULL,referencia text NOT NULL,descripcion text NOT NULL,monto numeric(16,2) NOT NULL CHECK(monto<>0),
 asiento_id text UNIQUE REFERENCES public.asientos_caja(id),UNIQUE(cuenta_id,referencia)
);
CREATE TABLE public.documentos_comprobantes(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,movimiento_id text NOT NULL REFERENCES public.movimientos_financieros(id),
 nombre text NOT NULL,path text NOT NULL UNIQUE,sha256 text NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['aplicacion_animales','insumos_campo','insumo_partidas','insumo_movimientos','repro_ciclos','planes_pastoreo','inventario_cierres','banco_extractos','banco_lineas','documentos_comprobantes'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (public.ganpro_rol() IS NOT NULL)',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('CREATE TRIGGER ganpro_lock_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.ganpro_lock_statement()',t);
  EXECUTE format('CREATE TRIGGER ganpro_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ganpro_audit_row()',t);
 END LOOP;
END $$;
CREATE INDEX ON public.aplicacion_animales(animal_id);
CREATE INDEX ON public.insumo_movimientos(fecha,lote_id);
COMMIT;
