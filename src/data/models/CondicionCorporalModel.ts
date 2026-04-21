import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class CondicionCorporalModel extends Model {
  static table = 'condicion_corporal';

  @field('lote_id') loteId!: string;
  @field('animal_id') animalId!: string | null;
  @field('fecha') fecha!: number;
  @field('score') score!: number; // 1-9
  @text('evaluador') evaluador!: string;
  @text('notas') notas!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
