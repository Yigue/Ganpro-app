import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import type { Relation, Query } from '@nozbe/watermelondb';
import type LoteModel from './LoteModel';
import type EtapaProtocoloModel from './EtapaProtocoloModel';

export default class ProtocoloIATFModel extends Model {
  static table = 'protocolos_iatf';

  static associations = {
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    etapas_protocolo: { type: 'has_many' as const, foreignKey: 'protocolo_id' },
  };

  @text('nombre') nombre!: string;
  @field('lote_id') loteId!: string;
  @field('fecha_inicio') fechaInicio!: number;
  @text('estado') estado!: string; // ACTIVO | COMPLETADO | CANCELADO
  @text('notas') notas!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @children('etapas_protocolo') etapas!: Query<EtapaProtocoloModel>;
}
