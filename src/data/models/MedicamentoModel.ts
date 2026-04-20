import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class MedicamentoModel extends Model {
  static table = 'medicamentos';

  @text('nombre') nombre!: string;
  @text('principio_activo') principioActivo!: string;
  @field('dosis_default') dosisDefault!: number | null;
  @text('unidad_dosis') unidadDosis!: string;
  @text('via_administracion') viaAdministracion!: string;
  @field('dias_carencia') diasCarencia!: number;
  @field('costo_unitario') costoUnitario!: number | null;
  @text('presentacion') presentacion!: string;
  @text('notas') notas!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
