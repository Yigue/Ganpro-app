-- Sólo consultas agregadas. Ejecutar en transacción READ ONLY y con lector autorizado.
SELECT
 (SELECT count(*) FROM public.animals) AS registros_animales,
 (SELECT count(*) FROM public.animals WHERE estado='ACTIVO') AS cabezas_activas,
 (SELECT count(*) FROM (SELECT upper(trim(id_caravana)) FROM public.animals WHERE estado IN('ACTIVO','DESCARTE')
   AND nullif(trim(id_caravana),'') IS NOT NULL GROUP BY upper(trim(id_caravana)) HAVING count(*)>1) d) AS visuales_reservados_duplicados,
 (SELECT count(*) FROM (SELECT trim(rfid) FROM public.animals WHERE nullif(trim(rfid),'') IS NOT NULL
   GROUP BY trim(rfid) HAVING count(*)>1) d) AS rfid_duplicados,
 (SELECT count(*) FROM public.animals a WHERE NOT EXISTS(SELECT 1 FROM public.categorias_config c
   WHERE c.categoria=a.categoria AND (c.sexo IS NULL OR c.sexo=a.sexo))
   OR a.sexo IS NULL OR a.sexo NOT IN('M','H')) AS categorias_sexo_sin_configuracion,
 (SELECT count(*) FROM public.animals a WHERE a.lote_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lotes l WHERE l.id=a.lote_id)) AS lotes_huerfanos,
 (SELECT count(*) FROM public.animals a WHERE a.potrero_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.potreros p WHERE p.id=a.potrero_id)) AS potreros_huerfanos,
 (SELECT count(*) FROM public.eventos e WHERE NOT EXISTS(SELECT 1 FROM public.animals a WHERE a.id=e.animal_id)) AS eventos_huerfanos,
 (SELECT count(*) FROM public.animals WHERE peso_actual IS NOT NULL AND (peso_actual<=0 OR peso_actual IN('NaN'::float8,'Infinity'::float8,'-Infinity'::float8))) AS pesos_invalidos,
 (SELECT count(*) FROM public.animals a WHERE NOT EXISTS(SELECT 1 FROM public.eventos e WHERE e.animal_id=a.id AND e.tipo IN('COMPRA','NACIMIENTO','ALTA_INICIAL'))) AS altas_sin_evento_de_origen,
 (SELECT count(*) FROM public.movimientos_financieros m WHERE m.anulado_en IS NULL AND m.ledger_version=1 AND m.monto <
   m.saldo_previo_conciliado + CASE WHEN m.tipo='GASTO' THEN -1 ELSE 1 END *
   coalesce((SELECT sum(a.monto) FROM public.asientos_caja a WHERE a.movimiento_id=m.id),0)) AS documentos_con_sobrepago,
 (SELECT count(*) FROM public.operation_logs l WHERE l.receptores_fijados AND
   l.cantidad_animales IS DISTINCT FROM (SELECT count(*) FROM public.aplicacion_animales r WHERE r.aplicacion_id=l.id)) AS aplicaciones_con_receptores_inconsistentes,
 (SELECT count(*) FROM public.operation_logs WHERE NOT receptores_fijados) AS aplicaciones_sin_destinatarios_fijados;
