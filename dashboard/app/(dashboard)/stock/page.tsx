import Link from 'next/link';
import { BarChartView } from '@/components/charts/charts';
import { RecategorizacionSection } from '@/components/stock/recategorizacion-section';
import { StockActions } from '@/components/stock/stock-actions';
import { StockTable, type FilaStock } from '@/components/stock/stock-table';
import { PageHeader, Section } from '@/components/ui/section';
import { animalesEnCarencia } from '@/lib/calc/sanidad';
import { gdp, pesadasAtrasadas, pesajesPorAnimal } from '@/lib/calc/pesadas';
import { activos, contarPor, edadMeses, recategorizacionesPendientes } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getAnimals, getCategoriasConfig, getEstablecimiento, getEventos, getLotes, getPotreros, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Stock' };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ alerta?: string; potrero?: string }> }) {
  const [{ alerta, potrero }, animals, config, lotes, potreros, eventos, logs, est, perfil] = await Promise.all([
    searchParams,
    getAnimals(),
    getCategoriasConfig(),
    getLotes(),
    getPotreros(),
    getEventos(),
    selectAll('operation_logs'),
    getEstablecimiento(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const lotesById = byId(lotes);
  const potrerosById = byId(potreros);
  const pesajes = pesajesPorAnimal(eventos);
  const atrasadas = new Set(pesadasAtrasadas(animals, pesajes, est.dias_alerta_pesada, ahora).map((a) => a.id));
  const carencias = new Map(animalesEnCarencia(animals, logs, ahora).map((c) => [c.animal.id, c.hasta]));

  const filas: FilaStock[] = animals.filter(a => !potrero || a.potrero_id === potrero).map((a) => {
    const p = pesajes.get(a.id) ?? [];
    return {
      id: a.id,
      caravana: a.id_caravana,
      rfid: a.rfid,
      categoria: a.categoria,
      raza: a.raza,
      sexo: a.sexo,
      estado: a.estado,
      lote: lotesById.get(a.lote_id ?? '')?.nombre ?? null,
      potrero: potrerosById.get(a.potrero_id ?? '')?.nombre ?? null,
      peso: a.peso_actual,
      edadMeses: edadMeses(a, ahora),
      gdp: gdp(p),
      ultimaPesada: p[p.length - 1]?.timestamp ?? null,
      pesadaAtrasada: atrasadas.has(a.id),
      carenciaHasta: carencias.get(a.id) ?? null,
    };
  });

  const recat = recategorizacionesPendientes(animals, config, ahora).map((r) => ({
    id: r.animal.id,
    caravana: r.animal.id_caravana,
    de: r.de,
    a: r.a,
    edadMeses: r.edadMeses,
  }));

  const vivos = activos(animals);
  const porLote = Object.entries(contarPor(vivos, (a) => lotesById.get(a.lote_id ?? '')?.nombre)).map(([nombre, cabezas]) => ({ nombre, cabezas }));
  const porRaza = Object.entries(contarPor(vivos, (a) => a.raza)).map(([nombre, cabezas]) => ({ nombre, cabezas }));
  const editable = canEdit(perfil?.rol);

  return (
    <>
      <PageHeader
        title="Stock de animales"
        description={`${vivos.length} cabezas activas · ${animals.length} registros en total`}
        actions={editable && <StockActions categorias={config} lotes={lotes} potreros={potreros} />}
      />
      <p className="text-sm text-muted-foreground"><Link href="/mapa" className="underline">Ver potreros en el mapa</Link> · {vivos.filter(a => !a.potrero_id).length} animales activos sin potrero. {potrero && <Link href="/stock" className="underline">Quitar filtro: {potrerosById.get(potrero)?.nombre ?? potrero}</Link>}</p>
      <Section title="Rodeo" description="Tocá la caravana para ver la ficha del animal" flush>
        <StockTable filas={filas} soloPesadaAtrasada={alerta === 'pesada'} />
      </Section>
      <RecategorizacionSection filas={recat} puedeEditar={editable} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Cabezas por lote">
          <BarChartView data={porLote} xKey="nombre" series={[{ key: 'cabezas', label: 'Cabezas' }]} height={220} />
        </Section>
        <Section title="Cabezas por raza">
          <BarChartView data={porRaza} xKey="nombre" series={[{ key: 'cabezas', label: 'Cabezas' }]} height={220} />
        </Section>
      </div>
    </>
  );
}
