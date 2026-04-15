import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migrations run from the user's current schema version to the latest.
 * For a fresh v1 install, no migrations run — schema is applied directly.
 *
 * Future migration example:
 *   addMigrations([{
 *     toVersion: 2,
 *     steps: [
 *       addColumns({ table: 'animals', columns: [{ name: 'peso_actual', type: 'number', isOptional: true }] })
 *     ]
 *   }])
 */
export const migrations = schemaMigrations({ migrations: [] });
