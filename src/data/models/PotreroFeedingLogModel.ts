import { Model, Relation, Associations } from '@nozbe/watermelondb';
import { field, date, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import type PotreroModel from './PotreroModel';

export class PotreroFeedingLogModel extends Model {
  static table = 'potrero_feeding_logs';

  static associations: Associations = {
    potreros: { type: 'belongs_to', key: 'potrero_id' },
  };

  @relation('potreros', 'potrero_id') potrero!: Relation<PotreroModel>;
  @text('potrero_id') potreroId!: string;
  @text('racion_id') racionId!: string;
  @field('cantidad_kg') cantidadKg!: number;
  @date('fecha') fecha!: Date;
  @text('notas') notas!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export default PotreroFeedingLogModel;
