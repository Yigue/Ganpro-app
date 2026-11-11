-- Sólo lectura. Copiar completo en SQL Editor de la MISMA base que usa Vercel.
-- No inserta, elimina ni modifica registros.
WITH functions AS (
 SELECT p.proname,pg_get_functiondef(p.oid) definition
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('ganpro_command','ganpro_stock_movement','ganpro_finance_void')
 AND p.prokind='f'
)
SELECT
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventario_cierres' AND column_name='receipt_tick') AS base_44_instalada,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='animals' AND column_name='visual_pendiente') AS stock_sin_caravana_instalado,
 to_regprocedure('public.ganpro_stock_generic(jsonb)') IS NOT NULL AS alta_generica_instalada,
 EXISTS(SELECT 1 FROM functions WHERE proname='ganpro_command' AND definition LIKE '%WHEN ''stock.generic''%') AS manejador_reconoce_alta,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='movimientos_financieros' AND column_name='modalidad_precio') AS cotizacion_instalada,
 EXISTS(SELECT 1 FROM functions WHERE proname='ganpro_stock_movement' AND position('jsonb_array_elements_text(d->''animal_ids'')' IN definition)>0) AS seleccion_por_ficha_instalada,
 to_regprocedure('public.ganpro_schedule_status(jsonb)') IS NOT NULL AS calendario_instalado,
 EXISTS(SELECT 1 FROM functions WHERE proname='ganpro_finance_void' AND definition LIKE '%GANPRO_TAG_REUSE_CONFLICT%') AS proteccion_historica_47_instalada;
