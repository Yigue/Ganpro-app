import { cn } from '@/lib/utils';

export function Progress({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'warning' | 'danger' | 'success' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'primary' && 'bg-primary',
          tone === 'success' && 'bg-success',
          tone === 'warning' && 'bg-warning',
          tone === 'danger' && 'bg-danger',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
