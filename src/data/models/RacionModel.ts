import { Model, Associations } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class RacionModel extends Model {
  static table = 'raciones';

  static associations: Associations = {
    racion_ingredientes: { type: 'has_many', foreignKey: 'racion_id' },
  };

  @text('nombre') nombre!: string;
  @text('descripcion') descripcion!: string;
  @field('activa') activa!: boolean;
  @field('costo_estimado_kg') costoEstimadoKg!: number;
  @text('moneda') moneda!: string; // USD | ARS
  @field('kg_dia_animal') kgDiaAnimal!: number;
  @text('lote_id') loteId!: string;
  @text('notas') notas!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
