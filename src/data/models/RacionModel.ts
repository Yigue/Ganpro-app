import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class RacionModel extends Model {
  static table = 'raciones';

  @field('nombre') nombre!: string;
  @text('descripcion') descripcion!: string;
  @field('activa') activa!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
