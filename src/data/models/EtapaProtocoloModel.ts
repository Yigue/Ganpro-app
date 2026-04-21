import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, readonly } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type ProtocoloIATFModel from './ProtocoloIATFModel';

export default class EtapaProtocoloModel extends Model {
  static table = 'etapas_protocolo';

  static associations = {
    protocolos_iatf: { type: 'belongs_to' as const, key: 'protocolo_id' },
  };

  @field('protocolo_id') protocoloId!: string;
  @text('nombre') nombre!: string;
  @field('dias_desde_inicio') diasDesdeInicio!: number;
  @text('descripcion') descripcion!: string;
  @field('completada') completada!: boolean;
  @field('fecha_completada') fechaCompletada!: number | null;
  @text('notificacion_id') notificacionId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('protocolos_iatf', 'protocolo_id') protocolo!: Relation<ProtocoloIATFModel>;
}
