'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const CHART_COLORS = [1, 2, 3, 4, 5, 6].map((n) => `hsl(var(--chart-${n}))`);

const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 12, tickLine: false, axisLine: false } as const;

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
};

const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

export interface Serie {
  key: string;
  label?: string;
}

export function BarChartView({
  data,
  xKey,
  series,
  stacked,
  height = 280,
  compactY,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Serie[];
  stacked?: boolean;
  height?: number;
  compactY?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={compactY ? 56 : 40} tickFormatter={(v: number) => (compactY ? compact.format(v) : nf.format(v))} />
        <Tooltip {...tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => nf.format(v)} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label ?? s.key}
            stackId={stacked ? 'a' : undefined}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineChartView({
  data,
  xKey,
  series,
  height = 260,
  compactY,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Serie[];
  height?: number;
  compactY?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={compactY ? 56 : 40} domain={['auto', 'auto']} tickFormatter={(v: number) => (compactY ? compact.format(v) : nf.format(v))} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => nf.format(v)} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChartView({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--card))" />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: number) => nf.format(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
