import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export class CategoriaTratamientoModel extends Model {
  static table = 'categorias_tratamiento';

  @text('nombre') nombre!: string;
  @text('descripcion') descripcion!: string | null;
  @text('color') color!: string | null;
  @field('es_sistema') esSistema!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

export default CategoriaTratamientoModel;
