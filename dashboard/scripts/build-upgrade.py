from pathlib import Path
import re,hashlib
root=Path(__file__).resolve().parents[1]/'supabase'/'migrations'
files=sorted(root.glob('*.sql'))
preflight='''-- GANPRO-APP / dashboard — actualizar una base existente (originales 01–04).
-- Generado desde las migraciones del dashboard, sin seed ni datos demo.
-- Antes: respaldo y prueba sobre una copia. Ejecutar TODO junto en SQL Editor.
-- Una sola transacción: cualquier error revierte los cambios de este script.
-- Si hay migraciones parcialmente aplicadas, se detiene sin adivinar ni borrar.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $ganpro_preflight$
DECLARE ident text;
BEGIN
 FOREACH ident IN ARRAY ARRAY['public.animals','public.lotes','public.potreros','public.eventos','public.animal_movements','public.perfiles','public.establecimiento','public.categorias_config','public.movimientos_financieros','public.operations_catalog','public.operation_logs','public.scheduled_operations','public.suplementos','public.raciones','public.racion_ingredientes','public.servicios','public.revisacion_toros','public.sigsa_stock','public.potrero_feeding_logs','public.sync_tombstones'] LOOP
  IF to_regclass(ident) IS NULL THEN RAISE EXCEPTION 'Falta la tabla base %. No se aplicó la actualización. No ejecute seed ni recree tablas; revise el esquema original.',ident; END IF;
 END LOOP;
 FOREACH ident IN ARRAY ARRAY['public.ganpro_rol()','public.ganpro_now_ms()','public.ganpro_sync_tables()','public.ganpro_sync_pull(bigint)','public.ganpro_sync_push(jsonb,bigint)','public.ganpro_crear_perfil()','public.ganpro_enable_sync(text)'] LOOP
  IF to_regprocedure(ident) IS NULL THEN RAISE EXCEPTION 'Falta la función base %. No se aplicó la actualización.',ident; END IF;
 END LOOP;
 FOREACH ident IN ARRAY ARRAY['public.command_receipts','public.command_audit','public.cuentas_caja','public.asientos_caja','public.cierres_caja','public.sync_clock','public.sync_push_receipts','public.insumos_campo','public.aplicacion_animales'] LOOP
  IF to_regclass(ident) IS NOT NULL THEN RAISE EXCEPTION 'Ya existe %. Puede haber actualizaciones completas o parciales. Este script no modificó nada: revise las migraciones aplicadas antes de continuar.',ident; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='movimientos_financieros' AND column_name IN('ledger_version','es_inventario')) OR (table_name='potreros' AND column_name='map_version') OR (table_name='animals' AND column_name IN('venta_movimiento_id','compra_movimiento_id')))) THEN
  RAISE EXCEPTION 'La base contiene columnas de una actualización parcial. No se modificó nada. Revise el estado antes de continuar.';
 END IF;
 IF (to_regclass('public.escenarios') IS NULL)<>(to_regclass('public.escenario_lineas') IS NULL) THEN RAISE EXCEPTION 'El módulo de proyecciones está aplicado parcialmente. No se modificó nada.'; END IF;
END
$ganpro_preflight$;
'''
# The original 05 can safely be created only when both its tables are absent.
five=next(p for p in files if '000005_' in p.name)
optional='''\nDO $ganpro_optional_05$
BEGIN
 IF to_regclass('public.escenarios') IS NULL THEN
  EXECUTE $ganpro_original_05$\n'''+five.read_text()+'''\n$ganpro_original_05$;
 END IF;
END
$ganpro_optional_05$;
'''
parts=[preflight,optional]
for p in files:
 number=int(re.search(r'(\d{6})_',p.name).group(1))
 if number<6:continue
 raw=p.read_text();body=re.sub(r'^\s*BEGIN;\s*\n','',raw,count=1);body=re.sub(r'\nCOMMIT;\s*$','\n',body)
 if re.search(r'^\s*(BEGIN|COMMIT);\s*$',body,re.M):raise ValueError('Unexpected transaction boundary '+p.name)
 parts.append('\n-- '+p.name+' / SHA256 '+hashlib.sha256(raw.encode()).hexdigest()+'\n'+body)
parts.append('''\n-- Refrescar el catálogo de PostgREST una vez confirmada la transacción.
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Los tres deben devolver true después de una ejecución completa.
SELECT
 to_regprocedure('public.ganpro_ledger_snapshot(text)') IS NOT NULL AS finanzas_instaladas,
 to_regprocedure('public.ganpro_management_snapshot()') IS NOT NULL AS gestion_instalada,
 to_regprocedure('public.ganpro_schedule_status(jsonb)') IS NOT NULL AS ultima_migracion_instalada;
''')
out=root.parent/'upgrade-existing.sql';out.write_text(''.join(parts));print(out, out.stat().st_size)

# Incremental bundle for the reviewed historical-identity release (01–47).
parts=["""-- GANPRO: base con migraciones 01–47 completas. Sin seeds ni datos demo.
-- Ejecutar TODO junto. No usar en una base con actualizaciones parciales.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(20261109,1);
DO $preflight$
BEGIN
 IF to_regprocedure('public.ganpro_stock_save(jsonb)') IS NULL
 OR to_regprocedure('public.ganpro_finance_void(jsonb)') IS NULL
 OR position('GANPRO_TAG_REUSE_CONFLICT' IN pg_get_functiondef(to_regprocedure('public.ganpro_finance_void(jsonb)')))=0
 OR to_regclass('public.inventario_cierres') IS NULL THEN
  RAISE EXCEPTION 'Se requieren las migraciones 01–47 completas. No se modificó nada.';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='animals' AND column_name='visual_pendiente') THEN
  RAISE EXCEPTION 'Stock ya contiene cambios 48+. Revisar migraciones aplicadas; no se modificó nada.';
 END IF;
END
$preflight$;
"""]
for p in files:
 if int(re.search(r'(\d{6})_',p.name).group(1))<48:continue
 raw=p.read_text();body=re.sub(r'^\s*BEGIN;\s*\n','',raw,count=1);body=re.sub(r'\nCOMMIT;\s*$','\n',body)
 parts.append('\n-- '+p.name+' / SHA256 '+hashlib.sha256(raw.encode()).hexdigest()+'\n'+body)
parts.append("\nNOTIFY pgrst, 'reload schema';\nCOMMIT;\n")
out=root.parent/'upgrade-47-to-56.sql';out.write_text(''.join(parts));print(out,out.stat().st_size)
