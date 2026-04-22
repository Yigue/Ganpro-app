import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type AnimalModel from './AnimalModel';
import type LoteModel from './LoteModel';
import { OperationCatalogModel } from './OperationCatalogModel';

export class OperationLogModel extends Model {
  static table = 'operation_logs';

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @relation('operations_catalog', 'operation_id') operation!: Relation<OperationCatalogModel>;
  @date('fecha_aplicacion') fechaAplicacion!: number;
  @date('fecha_fin_carencia') fechaFinCarencia!: number;
  @field('animal_id') animalId!: string;
  @field('lote_id') loteId!: string;
  @field('operation_id') operationId!: string;
  @field('dosis') dosis!: string;
  @field('responsable') responsable!: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

export default OperationLogModel;
