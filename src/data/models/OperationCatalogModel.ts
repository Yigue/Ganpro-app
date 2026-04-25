import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class OperationCatalogModel extends Model {
  static table = 'operations_catalog';

  @field('nombre') nombre!: string;
  @field('tipo') tipo!: string;
  @field('dias_carencia') diasCarencia!: number;
  @field('costo_unitario') costoUnitario!: number;
  @field('notas') notas!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

export default OperationCatalogModel;
