import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type AnimalModel from './AnimalModel';

export class MangaActionQueueModel extends Model {
  static table = 'manga_action_queue';

  @relation('animals', 'animal_id') animal!: Relation<AnimalModel>;
  @field('animal_id') animalId!: string;
  @field('action_type') actionType!: string;
  @field('payload') payload!: string;
  @field('status') status!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export default MangaActionQueueModel;
