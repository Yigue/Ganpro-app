import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migrations run from the user's current schema version to the latest.
 * For a fresh install, no migrations run — schema is applied directly.
 */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'animals',
          columns: [
            { name: 'potrero_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'synced_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'eventos',
          columns: [
            { name: 'lote_destino_id', type: 'string', isOptional: true },
          ],
        }),
        createTable({
          name: 'potreros',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'hectareas', type: 'number', isOptional: true },
            { name: 'recurso_forrajero', type: 'string', isOptional: true },
            { name: 'capacidad_ev', type: 'number', isOptional: true },
            { name: 'geo_json', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'animal_movements',
          columns: [
            { name: 'animal_id', type: 'string', isIndexed: true },
            { name: 'potrero_origen_id', type: 'string', isOptional: true },
            { name: 'potrero_destino_id', type: 'string', isOptional: true },
            { name: 'lote_origen_id', type: 'string', isOptional: true },
            { name: 'lote_destino_id', type: 'string', isOptional: true },
            { name: 'fecha', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'sync_logs',
          columns: [
            { name: 'entity_type', type: 'string' },
            { name: 'entity_id', type: 'string' },
            { name: 'action', type: 'string' },
            { name: 'synced', type: 'boolean' },
            { name: 'timestamp', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'operations_catalog',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'tipo', type: 'string' },
            { name: 'dias_carencia', type: 'number', isOptional: true },
            { name: 'costo_unitario', type: 'number', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'operation_logs',
          columns: [
            { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'operation_id', type: 'string', isIndexed: true },
            { name: 'fecha_aplicacion', type: 'number' },
            { name: 'fecha_fin_carencia', type: 'number', isOptional: true },
            { name: 'dosis', type: 'number', isOptional: true },
            { name: 'responsable', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'scheduled_operations',
          columns: [
            { name: 'operation_id', type: 'string', isIndexed: true },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'fecha_programada', type: 'number' },
            { name: 'estado', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'potrero_feeding_logs',
          columns: [
            { name: 'potrero_id', type: 'string', isIndexed: true },
            { name: 'racion_id', type: 'string', isIndexed: true },
            { name: 'cantidad_kg', type: 'number' },
            { name: 'fecha', type: 'number' },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'manga_action_queue',
          columns: [
            { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'action_type', type: 'string' },
            { name: 'payload', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        // ── Add columns to existing tables ──────────────────────────────────
        addColumns({
          table: 'lotes',
          columns: [
            { name: 'ubicacion', type: 'string', isOptional: true },
            { name: 'hectareas', type: 'number', isOptional: true },
            { name: 'costo_alquiler_ha', type: 'number', isOptional: true },
            { name: 'geo_json', type: 'string', isOptional: true },
            { name: 'densidad_carga', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'eventos',
          columns: [
            { name: 'dte_numero', type: 'string', isOptional: true },
          ],
        }),
        // ── New tables ───────────────────────────────────────────────────────
        createTable({
          name: 'medicamentos',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'principio_activo', type: 'string', isOptional: true },
            { name: 'dosis_default', type: 'number', isOptional: true },
            { name: 'unidad_dosis', type: 'string', isOptional: true },
            { name: 'via_administracion', type: 'string', isOptional: true },
            { name: 'dias_carencia', type: 'number' },
            { name: 'costo_unitario', type: 'number', isOptional: true },
            { name: 'presentacion', type: 'string', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'tratamientos_sanidad',
          columns: [
            { name: 'animal_id', type: 'string', isIndexed: true },
            { name: 'medicamento_id', type: 'string', isIndexed: true },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'fecha_aplicacion', type: 'number' },
            { name: 'dosis_aplicada', type: 'number', isOptional: true },
            { name: 'responsable', type: 'string', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'fecha_fin_carencia', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'protocolos_iatf',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'lote_id', type: 'string', isIndexed: true },
            { name: 'fecha_inicio', type: 'number' },
            { name: 'estado', type: 'string' },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'etapas_protocolo',
          columns: [
            { name: 'protocolo_id', type: 'string', isIndexed: true },
            { name: 'nombre', type: 'string' },
            { name: 'dias_desde_inicio', type: 'number' },
            { name: 'descripcion', type: 'string', isOptional: true },
            { name: 'completada', type: 'boolean' },
            { name: 'fecha_completada', type: 'number', isOptional: true },
            { name: 'notificacion_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'condicion_corporal',
          columns: [
            { name: 'lote_id', type: 'string', isIndexed: true },
            { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'fecha', type: 'number' },
            { name: 'score', type: 'number' },
            { name: 'evaluador', type: 'string', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'suplementos',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'tipo', type: 'string' },
            { name: 'materia_seca_pct', type: 'number' },
            { name: 'proteina_bruta_pct', type: 'number', isOptional: true },
            { name: 'energia_mcal_kg', type: 'number', isOptional: true },
            { name: 'precio_por_tonelada', type: 'number', isOptional: true },
            { name: 'stock_kg', type: 'number', isOptional: true },
            { name: 'proveedor', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'raciones',
          columns: [
            { name: 'lote_id', type: 'string', isIndexed: true },
            { name: 'suplemento_id', type: 'string', isIndexed: true },
            { name: 'kg_dia_animal', type: 'number' },
            { name: 'fecha_inicio', type: 'number' },
            { name: 'fecha_fin', type: 'number', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'activa', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'movimientos_financieros',
          columns: [
            { name: 'tipo', type: 'string' },
            { name: 'categoria', type: 'string' },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'monto', type: 'number' },
            { name: 'fecha', type: 'number' },
            { name: 'descripcion', type: 'string', isOptional: true },
            { name: 'comprobante', type: 'string', isOptional: true },
            { name: 'dte_numero', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'precios_mercado',
          columns: [
            { name: 'fecha', type: 'number' },
            { name: 'novillo_kg', type: 'number', isOptional: true },
            { name: 'ternero_kg', type: 'number', isOptional: true },
            { name: 'vaca_kg', type: 'number', isOptional: true },
            { name: 'vaca_descarte_kg', type: 'number', isOptional: true },
            { name: 'fuente', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'agregados_financieros',
          columns: [
            { name: 'periodo_mes', type: 'string', isIndexed: true },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'costo_sanidad', type: 'number', isOptional: true },
            { name: 'costo_nutricion', type: 'number', isOptional: true },
            { name: 'costo_alquiler', type: 'number', isOptional: true },
            { name: 'kg_ganados', type: 'number', isOptional: true },
            { name: 'costo_x_kg', type: 'number', isOptional: true },
            { name: 'margen_bruto', type: 'number', isOptional: true },
            { name: 'calculado_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
