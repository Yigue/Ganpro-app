import { Model, Relation } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type AnimalModel from './AnimalModel';
import type LoteModel from './LoteModel';
import type OperationCatalogModel from './OperationCatalogModel';

export class OperationLogModel extends Model {
  static table = 'operation_logs';

  static associations = {
    animals: { type: 'belongs_to' as const, key: 'animal_id' },
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    operations_catalog: { type: 'belongs_to' as const, key: 'operation_id' },
  };

  @field('animal_id') animalId!: string | null;
  @field('lote_id') loteId!: string | null;
  @field('operation_id') operationId!: string;
  @text('tipo_operacion') tipoOperacion!: string;
  @date('fecha_aplicacion') fechaAplicacion!: Date;
  @date('fecha_fin_carencia') fechaFinCarencia!: Date | null;
  @text('dosis') dosis!: string;
  @field('dosis_aplicada') dosisAplicada!: number | null;
  @field('costo_aplicado') costoAplicado!: number | null;
  @text('responsable') responsable!: string;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @relation('operations_catalog', 'operation_id') operation!: Relation<OperationCatalogModel>;
}

export default OperationLogModel;
