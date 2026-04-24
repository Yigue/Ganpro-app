import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export type FinancialCategoryType = 'INCOME' | 'EXPENSE';

export class FinancialCategoryModel extends Model {
  static table = 'financial_categories';

  @text('name') name!: string;
  @text('type') type!: FinancialCategoryType;
  @text('color') color!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
