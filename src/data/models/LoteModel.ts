import { Model } from '@nozbe/watermelondb';
import { field, text, date, children, readonly } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';

export default class LoteModel extends Model {
  static table = 'lotes';

  static associations = {
    animals: { type: 'has_many' as const, foreignKey: 'lote_id' },
  };

  @text('nombre') nombre!: string;
  @text('ubicacion') ubicacion!: string;
  @text('descripcion') descripcion!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Reactive child query — auto-updates UI when animals in this lote change
  @children('animals') animals!: Query<AnimalModel>;
}
