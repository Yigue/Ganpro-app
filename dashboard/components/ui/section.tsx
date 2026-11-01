import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export function Section({
  title,
  description,
  actions,
  children,
  className,
  flush,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className={cn(flush && 'px-0 pb-2')}>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
