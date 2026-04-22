import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class OperationCatalogModel extends Model {
  static table = 'operations_catalog';

  @field('nombre') nombre;
  @field('tipo') tipo;
  @field('dias_carencia') diasCarencia;
  @field('costo_unitario') costoUnitario;
  @field('notas') notas;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
