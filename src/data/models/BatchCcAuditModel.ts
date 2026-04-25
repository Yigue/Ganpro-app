import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type LoteModel from './LoteModel';
import type PotreroModel from './PotreroModel';

export default class BatchCcAuditModel extends Model {
  static table = 'batch_cc_audits';

  static associations = {
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    potreros: { type: 'belongs_to' as const, key: 'potrero_id' },
  };

  @date('fecha') fecha!: Date;
  @field('score_promedio') scorePromedio!: number;
  @text('notas') notas!: string | null;
  @field('lote_id') loteId!: string | null;
  @field('potrero_id') potreroId!: string | null;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @relation('potreros', 'potrero_id') potrero!: Relation<PotreroModel>;
}
