import Link from 'next/link';
import { ArrowRight, Calculator, CalendarRange, LineChart, Scale, Sprout } from 'lucide-react';
import { EscenariosList } from '@/components/proyeccion/escenarios-list';
import { Card } from '@/components/ui/card';
import { PageHeader, Section } from '@/components/ui/section';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getPrecios, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Proyección' };

const HERRAMIENTAS = [
  { href: '/proyeccion/negocio', tipo: 'negocio', icon: Calculator, titulo: 'Negocio de invernada o recría', texto: 'Margen, renta y precio de venta de equilibrio. Compará hasta cuatro modelos y mirá la sensibilidad.' },
  { href: '/proyeccion/precios', tipo: null, icon: LineChart, titulo: 'Precios históricos', texto: 'Ternero, novillo y vaca en pesos y dólares, relación compra/venta y estacionalidad de 5 años.' },
  { href: '/proyeccion/peso', tipo: 'peso', icon: Scale, titulo: 'Ganancia de peso', texto: 'Desde las pesadas reales: cuándo llega la tropa al peso objetivo y cuántos kg tendrá al vender.' },
  { href: '/proyeccion/plan', tipo: 'plan', icon: CalendarRange, titulo: 'Plan de compras y ventas', texto: 'Calendario de 12 a 24 meses con flujo de caja, stock por categoría y alerta de carga.' },
  { href: '/proyeccion/cria', tipo: 'cria', icon: Sprout, titulo: 'Crecimiento del rodeo de cría', texto: 'De 3 a 10 años: retención de terneras, refugo, preñez y tope de hectáreas.' },
] as const;

export default async function ProyeccionPage() {
  const [escenarios, precios, perfil] = await Promise.all([selectAll('escenarios', { order: 'fecha', ascending: false }), getPrecios(), getSessionPerfil()]);
  const cuenta = (tipo: string | null) => (tipo ? escenarios.filter((e) => e.tipo === tipo).length : precios.length);

  return (
    <>
      <PageHeader title="Proyección" description="Saber si un negocio gana o pierde plata antes de hacerlo. Cada cálculo se guarda como escenario para compararlo con otros y, después, con lo real." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {HERRAMIENTAS.map(({ href, tipo, icon: Icon, titulo, texto }) => (
          <Link key={href} href={href} className="group">
            <Card className="flex h-full flex-col gap-3 p-5 transition-colors group-hover:border-primary/50">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs text-muted-foreground">{tipo ? `${cuenta(tipo)} escenarios` : `${cuenta(null)} fechas de precios`}</span>
              </div>
              <div>
                <h3 className="font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                Abrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
      <Section title="Todos los escenarios" flush>
        <EscenariosList escenarios={escenarios} puedeEditar={canEdit(perfil?.rol)} mostrarTipo />
      </Section>
    </>
  );
}
