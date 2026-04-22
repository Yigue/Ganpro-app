import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class AnimalMovementModel extends Model {
  static table = 'animal_movements';

  @relation('animals', 'animal_id') animal;
  @relation('potreros', 'potrero_origen_id') potreroOrigen;
  @relation('potreros', 'potrero_destino_id') potreroDestino;
  @relation('lotes', 'lote_origen_id') loteOrigen;
  @relation('lotes', 'lote_destino_id') loteDestino;
  @date('fecha') fecha;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
