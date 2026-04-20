import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, readonly } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';
import type MedicamentoModel from './MedicamentoModel';

export default class TratamientoSanidadModel extends Model {
  static table = 'tratamientos_sanidad';

  static associations = {
    animals: { type: 'belongs_to' as const, key: 'animal_id' },
    medicamentos: { type: 'belongs_to' as const, key: 'medicamento_id' },
  };

  @field('animal_id') animalId!: string;
  @field('medicamento_id') medicamentoId!: string;
  @field('lote_id') loteId!: string | null;
  @field('fecha_aplicacion') fechaAplicacion!: number;
  @field('dosis_aplicada') dosisAplicada!: number | null;
  @text('responsable') responsable!: string;
  @text('notas') notas!: string;
  @field('fecha_fin_carencia') fechaFinCarencia!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
  @relation('medicamentos', 'medicamento_id') medicamento!: Relation<MedicamentoModel>;
}
