import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class PrecioMercadoModel extends Model {
  static table = 'precios_mercado';

  @field('fecha') fecha!: number;
  @field('novillo_kg') novilloKg!: number | null;
  @field('ternero_kg') terneroKg!: number | null;
  @field('vaca_kg') vacaKg!: number | null;
  @field('vaca_descarte_kg') vacaDescarteKg!: number | null;
  @text('fuente') fuente!: string; // MANUAL | API_MAG
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
