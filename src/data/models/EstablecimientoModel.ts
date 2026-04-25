import { Model } from '@nozbe/watermelondb';
import { text, field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';
import type LoteModel from './LoteModel';
import type PotreroModel from './PotreroModel';

export default class EstablecimientoModel extends Model {
  static table = 'establecimientos';

  static associations = {
    animals: { type: 'has_many' as const, foreignKey: 'establecimiento_id' },
    lotes: { type: 'has_many' as const, foreignKey: 'establecimiento_id' },
    potreros: { type: 'has_many' as const, foreignKey: 'establecimiento_id' },
  };

  @text('nombre') nombre!: string;
  @text('ubicacion') ubicacion!: string | null;
  @field('hectareas_totales') hectareasTotales!: number | null;
  @text('renspa') renspa!: string | null;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('animals') animals!: Query<AnimalModel>;
  @children('lotes') lotes!: Query<LoteModel>;
  @children('potreros') potreros!: Query<PotreroModel>;
}
