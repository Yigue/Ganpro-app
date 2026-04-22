const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'data', 'models');

const models = {
  'PotreroModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class PotreroModel extends Model {
  static table = 'potreros';

  @field('nombre') nombre;
  @field('hectareas') hectareas;
  @field('recurso_forrajero') recursoForrajero;
  @field('capacidad_ev') capacidadEv;
  @field('geo_json') geoJson;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'AnimalMovementModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class AnimalMovementModel extends Model {
  static table = 'animal_movements';

  @relation('animals', 'animal_id') animal;
  @relation('potreros', 'potrero_origen_id') potreroOrigen;
  @relation('potreros', 'potrero_destino_id') potreroDestino;
  @relation('lotes', 'lote_origen_id') loteOrigen;
  @relation('lotes', 'lote_destino_id') loteDestino;
  @date('fecha') fecha;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'OperationCatalogModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class OperationCatalogModel extends Model {
  static table = 'operations_catalog';

  @field('nombre') nombre;
  @field('tipo') tipo;
  @field('dias_carencia') diasCarencia;
  @field('costo_unitario') costoUnitario;
  @field('notas') notas;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'OperationLogModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class OperationLogModel extends Model {
  static table = 'operation_logs';

  @relation('animals', 'animal_id') animal;
  @relation('lotes', 'lote_id') lote;
  @relation('operations_catalog', 'operation_id') operation;
  @date('fecha_aplicacion') fechaAplicacion;
  @date('fecha_fin_carencia') fechaFinCarencia;
  @field('dosis') dosis;
  @field('responsable') responsable;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'ScheduledOperationModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class ScheduledOperationModel extends Model {
  static table = 'scheduled_operations';

  @relation('operations_catalog', 'operation_id') operation;
  @relation('lotes', 'lote_id') lote;
  @date('fecha_programada') fechaProgramada;
  @field('estado') estado;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'PotreroFeedingLogModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class PotreroFeedingLogModel extends Model {
  static table = 'potrero_feeding_logs';

  @relation('potreros', 'potrero_id') potrero;
  @relation('raciones', 'racion_id') racion;
  @field('cantidad_kg') cantidadKg;
  @date('fecha') fecha;
  @field('notas') notas;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`,
  'MangaActionQueueModel.ts': `
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class MangaActionQueueModel extends Model {
  static table = 'manga_action_queue';

  @relation('animals', 'animal_id') animal;
  @field('action_type') actionType;
  @field('payload') payload;
  @field('status') status;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
`
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content.trim() + '\n');
}
console.log('Modelos creados con éxito');
