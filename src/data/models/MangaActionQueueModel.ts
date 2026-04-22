import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class MangaActionQueueModel extends Model {
  static table = 'manga_action_queue';

  @relation('animals', 'animal_id') animal;
  @field('action_type') actionType;
  @field('payload') payload;
  @field('status') status;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;
}
