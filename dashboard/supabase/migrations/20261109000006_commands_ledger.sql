BEGIN;
-- Ganpro is a shared establishment (id=1), not an organization model from another application.
CREATE TABLE public.command_receipts (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 command text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.command_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid,
 source text NOT NULL, table_name text NOT NULL, record_id text NOT NULL,
 previous jsonb, next jsonb, command_key text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.command_audit(table_name, record_id, created_at);
CREATE TABLE public.cuentas_caja (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, nombre text NOT NULL UNIQUE,
 saldo_inicial numeric(16,2) NOT NULL, fecha_apertura bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.asientos_caja (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 cuenta_id text NOT NULL REFERENCES public.cuentas_caja(id) ON DELETE RESTRICT,
 movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT,
 transferencia_id uuid, reversa_de text UNIQUE REFERENCES public.asientos_caja(id) ON DELETE RESTRICT,
 monto numeric(16,2) NOT NULL CHECK(monto<>0), fecha bigint NOT NULL,
 motivo text, actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.asientos_caja(movimiento_id,fecha);
CREATE INDEX ON public.asientos_caja(cuenta_id,fecha);
CREATE TABLE public.cierres_caja (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hasta bigint NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.movimientos_financieros
 ADD COLUMN ledger_version int NOT NULL DEFAULT 0 CHECK(ledger_version IN(0,1)),
 ADD COLUMN vencimiento bigint, ADD COLUMN contraparte text,
 ADD COLUMN centro_costo text, ADD COLUMN anulado_en bigint,
 ADD COLUMN animal_ids text[],
 ADD COLUMN saldo_previo_conciliado numeric(16,2) NOT NULL DEFAULT 0,
 ADD COLUMN adopcion_fecha bigint;
ALTER TABLE public.animals ADD COLUMN venta_movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT,
 ADD COLUMN compra_movimiento_id text REFERENCES public.movimientos_financieros(id) ON DELETE RESTRICT;
ALTER TABLE public.potreros ADD COLUMN map_version int NOT NULL DEFAULT 0,
 ADD COLUMN perimetro_m numeric(14,2), ADD COLUMN tipo_potrero text NOT NULL DEFAULT 'SIN_DATOS',
 ADD COLUMN capacidad_cabezas int CHECK(capacidad_cabezas>=0),
 ADD COLUMN estado_forraje text NOT NULL DEFAULT 'SIN_DATOS',
 ADD COLUMN agua boolean, ADD COLUMN sombra boolean,
 ADD COLUMN notas text;
-- Never infer historic payments or change mobile timestamps on legacy movements.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['command_receipts','command_audit','cuentas_caja','asientos_caja','cierres_caja'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  IF t<>'command_receipts' THEN
   EXECUTE format('CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated USING (public.ganpro_rol() IS NOT NULL)',t);
  END IF;
 END LOOP;
END $$;
GRANT SELECT ON public.command_audit,public.cuentas_caja,public.asientos_caja,public.cierres_caja TO authenticated;
COMMIT;
