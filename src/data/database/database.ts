import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '../schema/schema';
import { migrations } from '../schema/migrations';

import * as Models from '../models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // jsi: true — enable for production JSI performance; disable for simulator
  onSetUpError: (error) => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: Object.values(Models), // Registra todos los modelos exportados en models/index.ts
});
