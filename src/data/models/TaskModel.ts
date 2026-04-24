import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export class TaskModel extends Model {
  static table = 'tasks';

  @text('title') title!: string;
  @text('description') description!: string | null;
  @field('due_date') dueDate!: number | null;
  @text('status') status!: TaskStatus;
  @text('priority') priority!: TaskPriority;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
