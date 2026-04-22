import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class PotreroFeedingLogModel extends Model {
  static table = 'potrero_feeding_logs';

  @relation('potreros', 'potrero_id') potrero;
  @relation('raciones', 'racion_id') racion;
  @field('cantidad_kg') cantidadKg;
  @date('fecha') fecha;
  @field('notas') notas;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
