import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, readonly } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type LoteModel from './LoteModel';
import type SuplementoModel from './SuplementoModel';

export default class RacionModel extends Model {
  static table = 'raciones';

  static associations = {
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    suplementos: { type: 'belongs_to' as const, key: 'suplemento_id' },
  };

  @field('lote_id') loteId!: string;
  @field('suplemento_id') suplementoId!: string;
  @field('kg_dia_animal') kgDiaAnimal!: number;
  @field('fecha_inicio') fechaInicio!: number;
  @field('fecha_fin') fechaFin!: number | null;
  @text('notas') notas!: string;
  @field('activa') activa!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @relation('suplementos', 'suplemento_id') suplemento!: Relation<SuplementoModel>;
}
