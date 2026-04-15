import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class SyncLogModel extends Model {
  static table = 'sync_logs';

  @text('entity_type') entityType!: string;
  @text('entity_id') entityId!: string;
  @text('action') action!: string; // created | updated | deleted
  @field('synced') synced!: boolean;
  @field('timestamp') timestamp!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
