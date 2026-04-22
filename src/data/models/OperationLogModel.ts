import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class OperationLogModel extends Model {
  static table = 'operation_logs';

  @relation('animals', 'animal_id') animal;
  @relation('lotes', 'lote_id') lote;
  @relation('operations_catalog', 'operation_id') operation;
  @date('fecha_aplicacion') fechaAplicacion;
  @date('fecha_fin_carencia') fechaFinCarencia;
  @field('dosis') dosis;
  @field('responsable') responsable;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
