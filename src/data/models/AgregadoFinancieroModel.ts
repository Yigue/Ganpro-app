import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class AgregadoFinancieroModel extends Model {
  static table = 'agregados_financieros';

  @text('periodo_mes') periodoMes!: string; // YYYYMM
  @field('lote_id') loteId!: string | null;
  @field('costo_sanidad') costoSanidad!: number | null;
  @field('costo_nutricion') costoNutricion!: number | null;
  @field('costo_alquiler') costoAlquiler!: number | null;
  @field('kg_ganados') kgGanados!: number | null;
  @field('costo_x_kg') costoXKg!: number | null;
  @field('margen_bruto') margenBruto!: number | null;
  @field('calculado_at') calculadoAt!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
