import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type EstablecimientoModel from './EstablecimientoModel';

export class PotreroModel extends Model {
  static table = 'potreros';

  static associations = {
    establecimientos: { type: 'belongs_to' as const, key: 'establecimiento_id' },
  };

  @text('nombre') nombre!: string;
  @field('hectareas') hectareas!: number;
  @text('recurso_forrajero') recursoForrajero!: string;
  @text('geo_json') geoJson!: string;
  @field('establecimiento_id') establecimientoId!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('establecimientos', 'establecimiento_id') establecimiento!: Relation<EstablecimientoModel>;
}

export default PotreroModel;
