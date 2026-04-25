import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migrations run from the user's current schema version to the latest.
 * For a fresh install, no migrations run — schema is applied directly.
 */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'animals',
          columns: [
            { name: 'is_generic', type: 'boolean', isIndexed: true, isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'raciones',
          columns: [
            { name: 'descripcion', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
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
          name: 'operations_catalog',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'tipo', type: 'string' },
            { name: 'dias_carencia', type: 'number' },
            { name: 'costo_unitario', type: 'number' },
            { name: 'notas', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
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
          table: 'movimientos_financieros',
          columns: [
            { name: 'categoria', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'operation_logs',
          columns: [
            { name: 'dosis', type: 'string', isOptional: true },
            { name: 'responsable', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'raciones',
          columns: [
            { name: 'kg_dia_animal', type: 'number', isOptional: true },
            { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [],
    },
    {
      toVersion: 6,
      steps: [
        createTable({
          name: 'racion_ingredientes',
          columns: [
            { name: 'racion_id', type: 'string', isIndexed: true },
            { name: 'suplemento_id', type: 'string', isIndexed: true },
            { name: 'porcentaje', type: 'number' },
            { name: 'cantidad_kg_por_tonelada', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        createTable({
          name: 'categorias_tratamiento',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'descripcion', type: 'string', isOptional: true },
            { name: 'color', type: 'string', isOptional: true },
            { name: 'es_sistema', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'tasks',
          columns: [
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'due_date', type: 'number', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'priority', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'financial_categories',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'type', type: 'string' },
            { name: 'color', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
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
        createTable({
          name: 'potreros',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'hectareas', type: 'number', isOptional: true },
            { name: 'recurso_forrajero', type: 'string', isOptional: true },
            { name: 'geo_json', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'movimientos_financieros',
          columns: [
            { name: 'tipo', type: 'string' },
            { name: 'category_id', type: 'string', isIndexed: true },
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
