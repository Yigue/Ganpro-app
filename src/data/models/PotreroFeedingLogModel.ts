import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type PotreroModel from './PotreroModel';

export class PotreroFeedingLogModel extends Model {
  static table = 'potrero_feeding_logs';

  @relation('potreros', 'potrero_id') potrero!: Relation<PotreroModel>;
  @field('potrero_id') potreroId!: string;
  @field('racion_id') racionId!: string;
  @field('cantidad_kg') cantidadKg!: number;
  @date('fecha') fecha!: number;
  @field('notas') notas!: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

export default PotreroFeedingLogModel;
