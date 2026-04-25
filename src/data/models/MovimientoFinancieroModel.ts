import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class MovimientoFinancieroModel extends Model {
  static table = 'movimientos_financieros';

  @field('monto') monto!: number;
  @text('moneda') moneda!: string; // USD | ARS
  @field('tipo_cambio') tipoCambio!: number;
  @text('tipo') tipo!: string; // GASTO | INGRESO
  @date('fecha') fecha!: Date;
  @field('category_id') categoryId!: string;
  @field('animal_id') animalId!: string | null;
  @field('lote_id') loteId!: string | null;
  @field('potrero_id') potreroId!: string | null;

  @text('descripcion') descripcion!: string;
  @text('comprobante') comprobante!: string;
  @text('dte_numero') dteNumero!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
