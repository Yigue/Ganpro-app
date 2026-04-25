import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type AnimalModel from './AnimalModel';
import type PotreroModel from './PotreroModel';
import type OperationCatalogModel from './OperationCatalogModel';

export default class ScheduledOperationModel extends Model {
  static table = 'scheduled_operations';

  static associations = {
    operations_catalog: { type: 'belongs_to' as const, key: 'operation_id' },
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    animals: { type: 'belongs_to' as const, key: 'animal_id' },
  };

  @field('operation_id') operationId!: string;
  @field('lote_id') loteId!: string | null;
  @field('animal_id') animalId!: string | null;
  @field('iatf_protocol_id') iatfProtocolId!: string | null;
  @date('fecha_programada') fechaProgramada!: Date;
  @field('estado') estado!: string; // PENDIENTE | COMPLETADO | CANCELADO

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('operations_catalog', 'operation_id') operation!: Relation<OperationCatalogModel>;
  @relation('potreros', 'lote_id') lote!: Relation<PotreroModel>;
  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
}
