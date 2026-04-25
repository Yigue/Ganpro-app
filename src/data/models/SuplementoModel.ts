import { Model, Associations } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class SuplementoModel extends Model {
  static table = 'suplementos';

  static associations: Associations = {
    racion_ingredientes: { type: 'has_many', foreignKey: 'suplemento_id' },
  };

  @text('nombre') nombre!: string;
  @text('tipo') tipo!: string; // MAIZ | SILO | HENO | PELLET | UREA | OTRO
  @field('materia_seca_pct') materiaSecaPct!: number;
  @field('proteina_bruta_pct') proteinaBrutaPct!: number | null;
  @field('energia_mcal_kg') energiaMcalKg!: number | null;
  @field('precio_por_tonelada') precioPorTonelada!: number | null;
  @field('stock_kg') stockKg!: number | null;
  @text('proveedor') proveedor!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
