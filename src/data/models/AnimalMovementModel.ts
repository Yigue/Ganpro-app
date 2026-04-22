import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type AnimalModel from './AnimalModel';
import type PotreroModel from './PotreroModel';
import type LoteModel from './LoteModel';

export class AnimalMovementModel extends Model {
  static table = 'animal_movements';

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
  @relation('potreros', 'potrero_origen_id') potreroOrigen!: Relation<PotreroModel>;
  @relation('potreros', 'potrero_destino_id') potreroDestino!: Relation<PotreroModel>;
  @relation('lotes', 'lote_origen_id') loteOrigen!: Relation<LoteModel>;
  @relation('lotes', 'lote_destino_id') loteDestino!: Relation<LoteModel>;
  @field('animal_id') animalId!: string;
  @date('fecha') fecha!: number;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

export default AnimalMovementModel;
