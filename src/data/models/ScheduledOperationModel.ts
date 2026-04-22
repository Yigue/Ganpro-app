import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { OperationCatalogModel } from './OperationCatalogModel';
import type LoteModel from './LoteModel';

export class ScheduledOperationModel extends Model {
  static table = 'scheduled_operations';

  @relation('operations_catalog', 'operation_id') operation!: Relation<OperationCatalogModel>;
  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @field('operation_id') operationId!: string;
  @field('lote_id') loteId!: string;
  @date('fecha_programada') fechaProgramada!: number;
  @field('estado') estado!: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

export default ScheduledOperationModel;
