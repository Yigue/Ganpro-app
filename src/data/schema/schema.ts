import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schema version must be incremented whenever tables or columns change.
 * Never mutate an existing schema — always add migrations.
 */
export const DATABASE_SCHEMA_VERSION = 3;

export const schema = appSchema({
  version: DATABASE_SCHEMA_VERSION,
  tables: [
    tableSchema({
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
    tableSchema({
      name: 'lotes',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'animals',
      columns: [
        { name: 'id_caravana', type: 'string', isIndexed: true },
        { name: 'rfid', type: 'string', isIndexed: true, isOptional: true },
        { name: 'sexo', type: 'string' },                          // 'M' | 'H'
        { name: 'categoria', type: 'string' },                     // Ternero/Vaca/Toro etc.
        { name: 'raza', type: 'string', isOptional: true },
        { name: 'fecha_nacimiento', type: 'number', isOptional: true }, // Unix ms
        { name: 'peso_actual', type: 'number', isOptional: true },
        { name: 'estado', type: 'string' },                        // ACTIVO | VENDIDO | MUERTO
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'potrero_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
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
    tableSchema({
      name: 'eventos',
      columns: [
        { name: 'animal_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' }, // PESAJE | TACTO | MUERTE
        { name: 'valor', type: 'number', isOptional: true },  // kg for PESAJE
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'timestamp', type: 'number' }, // Unix ms of event
        { name: 'dte_numero', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_logs',
      columns: [
        { name: 'entity_type', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'action', type: 'string' }, // created | updated | deleted
        { name: 'synced', type: 'boolean' },
        { name: 'timestamp', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'operations_catalog',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'tipo', type: 'string' }, // VACUNA | TRATAMIENTO | IATF
        { name: 'dias_carencia', type: 'number', isOptional: true },
        { name: 'costo_unitario', type: 'number', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
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
        { name: 'fecha_aplicacion', type: 'number' },
        { name: 'fecha_fin_carencia', type: 'number', isOptional: true },
        { name: 'dosis', type: 'number', isOptional: true },
        { name: 'responsable', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'scheduled_operations',
      columns: [
        { name: 'operation_id', type: 'string', isIndexed: true },
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'fecha_programada', type: 'number' },
        { name: 'estado', type: 'string' }, // PENDIENTE | COMPLETADO | CANCELADO
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'protocolos_iatf',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'lote_id', type: 'string', isIndexed: true },
        { name: 'fecha_inicio', type: 'number' },
        { name: 'estado', type: 'string' }, // ACTIVO | COMPLETADO | CANCELADO
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
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
    tableSchema({
      name: 'condicion_corporal',
      columns: [
        { name: 'lote_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'fecha', type: 'number' },
        { name: 'score', type: 'number' }, // 1-5 or 1-9
        { name: 'evaluador', type: 'string', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'suplementos',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'tipo', type: 'string' }, // MAIZ | SILO | HENO | PELLET | UREA | OTRO
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
    tableSchema({
      name: 'raciones',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'activa', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
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
    tableSchema({
      name: 'manga_action_queue',
      columns: [
        { name: 'animal_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'action_type', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON stringified
        { name: 'status', type: 'string' }, // PENDING | PROCESSED | ERROR
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'movimientos_financieros',
      columns: [
        { name: 'tipo', type: 'string' }, // GASTO | INGRESO
        { name: 'categoria', type: 'string' }, // SANIDAD | NUTRICION | ALQUILER | VENTA | COMPRA | OTRO
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
