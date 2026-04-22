import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class ScheduledOperationModel extends Model {
  static table = 'scheduled_operations';

  @relation('operations_catalog', 'operation_id') operation;
  @relation('lotes', 'lote_id') lote;
  @date('fecha_programada') fechaProgramada;
  @field('estado') estado;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
