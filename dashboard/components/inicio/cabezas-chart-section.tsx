import { BarChartView } from '@/components/charts/charts';
import { Section } from '@/components/ui/section';

export function CabezasChartSection({ data, categorias }: { data: Record<string, unknown>[]; categorias: string[] }) {
  return (
    <Section title="Cabezas por categoría" description="Stock al cierre de cada mes, últimos 12 meses">
      <BarChartView data={data} xKey="label" series={categorias.map((c) => ({ key: c }))} stacked height={300} />
    </Section>
  );
}
