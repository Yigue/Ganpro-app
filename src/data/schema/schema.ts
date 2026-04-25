import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schema version must be incremented whenever tables or columns change.
 * Never mutate an existing schema — always add migrations.
 */
export const DATABASE_SCHEMA_VERSION = 7;

export const schema = appSchema({
  version: DATABASE_SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'establecimientos',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'ubicacion', type: 'string', isOptional: true },
        { name: 'hectareas_totales', type: 'number', isOptional: true },
        { name: 'renspa', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'potreros',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'hectareas', type: 'number', isOptional: true },
        { name: 'recurso_forrajero', type: 'string', isOptional: true },
        { name: 'geo_json', type: 'string', isOptional: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'lotes',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'objetivo', type: 'string', isOptional: true },
        { name: 'densidad_carga_objetivo', type: 'number', isOptional: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'animals',
      columns: [
        { name: 'id_caravana', type: 'string', isIndexed: true },
        { name: 'rfid', type: 'string', isIndexed: true, isOptional: true },
        { name: 'sexo', type: 'string' },
        { name: 'categoria', type: 'string' },
        { name: 'raza', type: 'string', isOptional: true },
        { name: 'fecha_nacimiento', type: 'number', isOptional: true },
        { name: 'estado', type: 'string' },
        { name: 'establecimiento_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'potrero_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'last_weight_kg', type: 'number', isOptional: true },
        { name: 'last_weight_date', type: 'number', isOptional: true },
        { name: 'repro_status', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'batch_cc_audits',
      columns: [
        { name: 'fecha', type: 'number' },
        { name: 'score_promedio', type: 'number' },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'potrero_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'operation_logs',
      columns: [
        { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'operation_id', type: 'string', isIndexed: true },
        { name: 'tipo_operacion', type: 'string' },
        { name: 'fecha_aplicacion', type: 'number' },
        { name: 'fecha_fin_carencia', type: 'number', isOptional: true },
        { name: 'dosis_aplicada', type: 'number', isOptional: true },
        { name: 'costo_aplicado', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'scheduled_operations',
      columns: [
        { name: 'fecha_programada', type: 'number' },
        { name: 'estado', type: 'string' },
        { name: 'operation_id', type: 'string', isIndexed: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'iatf_protocol_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'movimientos_financieros',
      columns: [
        { name: 'monto', type: 'number' },
        { name: 'moneda', type: 'string' },
        { name: 'tipo_cambio', type: 'number' },
        { name: 'tipo', type: 'string' },
        { name: 'fecha', type: 'number' },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'potrero_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'raciones',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'activa', type: 'boolean' },
        { name: 'costo_estimado_kg', type: 'number' },
        { name: 'moneda', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'precios_mercado',
      columns: [
        { name: 'fecha', type: 'number' },
        { name: 'novillo_kg', type: 'number', isOptional: true },
        { name: 'ternero_kg', type: 'number', isOptional: true },
        { name: 'vaca_kg', type: 'number', isOptional: true },
        { name: 'vaca_descarte_kg', type: 'number', isOptional: true },
        { name: 'fuente', type: 'string' }, // MANUAL | API_MAG
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'status', type: 'string' },   // PENDING | IN_PROGRESS | COMPLETED
        { name: 'priority', type: 'string' },  // HIGH | MEDIUM | LOW
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'financial_categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },      // INCOME | EXPENSE
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
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
    tableSchema({
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
    tableSchema({
      name: 'agregados_financieros',
      columns: [
        { name: 'periodo_mes', type: 'string', isIndexed: true }, // YYYYMM
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
});
