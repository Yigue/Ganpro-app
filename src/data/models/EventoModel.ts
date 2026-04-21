import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, readonly } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';

export default class EventoModel extends Model {
  static table = 'eventos';

  static associations = {
    animals: { type: 'belongs_to' as const, key: 'animal_id' },
  };

  @field('animal_id') animalId!: string;
  @text('tipo') tipo!: string;            // PESAJE | VACUNACION | CAMBIO_LOTE | TACTO | OTRO
  @field('valor') valor!: number | null;  // kg for PESAJE
  @text('notas') notas!: string;
  @field('lote_destino_id') loteDestinoId!: string | null;
  @field('timestamp') timestamp!: number;
  // v2 fields
  @text('dte_numero') dteNumero!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
}
