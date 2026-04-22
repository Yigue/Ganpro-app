import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class PotreroModel extends Model {
  static table = 'potreros';

  @field('nombre') nombre!: string;
  @field('hectareas') hectareas!: number;
  @field('recurso_forrajero') recursoForrajero!: string;
  @field('capacidad_ev') capacidadEv!: number;
  @field('geo_json') geoJson!: string;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

export default PotreroModel;
