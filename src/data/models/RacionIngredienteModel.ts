import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type RacionModel from './RacionModel';
import type SuplementoModel from './SuplementoModel';

export default class RacionIngredienteModel extends Model {
  static table = 'racion_ingredientes';

  static associations = {
    raciones: { type: 'belongs_to', key: 'racion_id' },
    suplementos: { type: 'belongs_to', key: 'suplemento_id' },
  } as const;

  @field('racion_id') racionId!: string;
  @field('suplemento_id') suplementoId!: string;
  @field('porcentaje') porcentaje!: number;
  @field('cantidad_kg_por_tonelada') cantidadKgPorTonelada!: number;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;

  @relation('raciones', 'racion_id') racion!: Relation<RacionModel>;
  @relation('suplementos', 'suplemento_id') suplemento!: Relation<SuplementoModel>;
}
