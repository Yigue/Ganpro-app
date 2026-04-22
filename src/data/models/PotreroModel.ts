import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class PotreroModel extends Model {
  static table = 'potreros';

  @field('nombre') nombre;
  @field('hectareas') hectareas;
  @field('recurso_forrajero') recursoForrajero;
  @field('capacidad_ev') capacidadEv;
  @field('geo_json') geoJson;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
