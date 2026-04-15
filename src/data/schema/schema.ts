import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schema version must be incremented whenever tables or columns change.
 * Never mutate an existing schema — always add migrations.
 */
export const DATABASE_SCHEMA_VERSION = 1;

export const schema = appSchema({
  version: DATABASE_SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'lotes',
      columns: [
        { name: 'nombre', type: 'string' },
        { name: 'ubicacion', type: 'string', isOptional: true },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'animals',
      columns: [
        { name: 'id_caravana', type: 'string', isIndexed: true },
        { name: 'sexo', type: 'string' },                          // 'M' | 'H'
        { name: 'categoria', type: 'string' },                     // Ternero/Vaca/Toro etc.
        { name: 'raza', type: 'string', isOptional: true },
        { name: 'fecha_nacimiento', type: 'number', isOptional: true }, // Unix ms
        { name: 'estado', type: 'string' },                        // ACTIVO | VENDIDO | MUERTO
        { name: 'lote_id', type: 'string', isIndexed: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'eventos',
      columns: [
        { name: 'animal_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' }, // PESAJE | VACUNACION | CAMBIO_LOTE | TACTO | OTRO
        { name: 'valor', type: 'number', isOptional: true },  // kg for PESAJE
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'lote_destino_id', type: 'string', isOptional: true }, // for CAMBIO_LOTE
        { name: 'timestamp', type: 'number' }, // Unix ms of event
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
  ],
});
