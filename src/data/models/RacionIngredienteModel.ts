import { Model, Relation, Associations } from '@nozbe/watermelondb';
import { field, date, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import type RacionModel from './RacionModel';
import type SuplementoModel from './SuplementoModel';

export default class RacionIngredienteModel extends Model {
  static table = 'racion_ingredientes';

  static associations: Associations = {
    raciones: { type: 'belongs_to', key: 'racion_id' },
    suplementos: { type: 'belongs_to', key: 'suplemento_id' },
  };

  @text('racion_id') racionId!: string;
  @text('suplemento_id') suplementoId!: string;
  @field('porcentaje') porcentaje!: number;
  @field('cantidad_kg_por_tonelada') cantidadKgPorTonelada!: number;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('raciones', 'racion_id') racion!: Relation<RacionModel>;
  @relation('suplementos', 'suplemento_id') suplemento!: Relation<SuplementoModel>;
}
