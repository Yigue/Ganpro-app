import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';
import type EstablecimientoModel from './EstablecimientoModel';

export default class LoteModel extends Model {
  static table = 'lotes';

  static associations = {
    establecimientos: { type: 'belongs_to' as const, key: 'establecimiento_id' },
    animals: { type: 'has_many' as const, foreignKey: 'lote_id' },
  };

  @text('nombre') nombre!: string;
  @text('descripcion') descripcion!: string;
  @text('objetivo') objetivo!: string | null; // CRÍA, RECRÍA, ENGORDE
  @field('densidad_carga_objetivo') densidadCargaObjetivo!: number | null;
  @field('establecimiento_id') establecimientoId!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('establecimientos', 'establecimiento_id') establecimiento!: Relation<EstablecimientoModel>;
  @children('animals') animals!: Query<AnimalModel>;
}
