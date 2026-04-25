import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';
import type LoteModel from './LoteModel';
import type EventoModel from './EventoModel';
import type EstablecimientoModel from './EstablecimientoModel';
import type PotreroModel from './PotreroModel';

export default class AnimalModel extends Model {
  static table = 'animals';

  static associations = {
    establecimientos: { type: 'belongs_to' as const, key: 'establecimiento_id' },
    lotes: { type: 'belongs_to' as const, key: 'lote_id' },
    potreros: { type: 'belongs_to' as const, key: 'potrero_id' },
    eventos: { type: 'has_many' as const, foreignKey: 'animal_id' },
  };

  @text('id_caravana') idCaravana!: string;
  @text('rfid') rfid!: string | null;
  @text('sexo') sexo!: string;           // 'M' | 'H'
  @text('categoria') categoria!: string;
  @text('raza') raza!: string;
  @date('fecha_nacimiento') fechaNacimiento!: Date | null;
  @text('estado') estado!: string;       // ACTIVO | VENDIDO | MUERTO
  @field('is_generic') isGeneric!: boolean;
  @field('establecimiento_id') establecimientoId!: string;
  @field('lote_id') loteId!: string;
  @field('potrero_id') potreroId!: string;

  // Desnormalized fields (V3)
  @field('last_weight_kg') lastWeightKg!: number | null;
  @date('last_weight_date') lastWeightDate!: Date | null;
  @text('repro_status') reproStatus!: string | null; // VACÍA, PREÑADA, EN_SERVICIO

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('establecimientos', 'establecimiento_id') establecimiento!: Relation<EstablecimientoModel>;
  @relation('lotes', 'lote_id') lote!: Relation<LoteModel>;
  @relation('potreros', 'potrero_id') potrero!: Relation<PotreroModel>;
  @children('eventos') eventos!: Query<EventoModel>;
}
