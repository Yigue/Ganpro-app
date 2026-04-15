import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';
import type LoteModel from './LoteModel';
import type EventoModel from './EventoModel';

export default class AnimalModel extends Model {
  static table = 'animals';

  static associations = {
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    eventos: { type: 'has_many' as const, foreignKey: 'animal_id' },
  };

  @text('id_caravana') idCaravana!: string;
  @text('sexo') sexo!: string;           // 'M' | 'H'
  @text('categoria') categoria!: string;
  @text('raza') raza!: string;
  @field('fecha_nacimiento') fechaNacimiento!: number | null;
  @text('estado') estado!: string;       // ACTIVO | VENDIDO | MUERTO
  @field('lote_id') loteId!: string;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @children('eventos') eventos!: Query<EventoModel>;
}
