import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class MovimientoFinancieroModel extends Model {
  static table = 'movimientos_financieros';

  @text('tipo') tipo!: string;          // GASTO | INGRESO
  @text('categoria') categoria!: string; // SANIDAD | NUTRICION | ALQUILER | VENTA | COMPRA | OTRO
  @field('lote_id') loteId!: string | null;
  @field('animal_id') animalId!: string | null;
  @field('monto') monto!: number;
  @field('fecha') fecha!: number;
  @text('descripcion') descripcion!: string;
  @text('comprobante') comprobante!: string;
  @text('dte_numero') dteNumero!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
