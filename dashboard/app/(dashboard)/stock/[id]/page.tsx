import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LineChartView } from '@/components/charts/charts';
import { AnimalEdit } from '@/components/stock/animal-edit';
import { Timeline, type ItemTimeline } from '@/components/stock/timeline';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { fmtDate, fmtDateShort, fmtNum } from '@/lib/calc/format';
import { gdp } from '@/lib/calc/pesadas';
import { parseTacto } from '@/lib/calc/reproduccion';
import { animalesEnCarencia } from '@/lib/calc/sanidad';
import { edadMeses } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getCatalogo, getCategoriasConfig, getLotes, getPotreros, selectAll, selectOne } from '@/lib/db/client';

export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await selectOne('animals', id);
  if (!animal) notFound();

  const [eventos, movimientos, logsAnimal, logsLote, cc, catalogo, lotes, potreros, config, perfil] = await Promise.all([
    selectAll('eventos', { filter: (q) => q.eq('animal_id', id), order: 'timestamp' }),
    selectAll('animal_movements', { filter: (q) => q.eq('animal_id', id), order: 'fecha' }),
    selectAll('operation_logs', { filter: (q) => q.eq('animal_id', id) }),
    animal.lote_id ? selectAll('operation_logs', { filter: (q) => q.eq('lote_id', animal.lote_id) }) : Promise.resolve([]),
    selectAll('condicion_corporal', { filter: (q) => q.eq('animal_id', id), order: 'fecha' }),
    getCatalogo(),
    getLotes(),
    getPotreros(),
    getCategoriasConfig(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const cat = byId(catalogo);
  const lotesById = byId(lotes);
  const potrerosById = byId(potreros);
  const pesajes = eventos.filter((e) => e.tipo === 'PESAJE' && e.valor != null).map((e) => ({ timestamp: e.timestamp, valor: e.valor! }));
  const g = gdp(pesajes);
  const carencia = animalesEnCarencia([animal], [...logsAnimal, ...logsLote], ahora)[0];
  const edad = edadMeses(animal, ahora);
  const ultimoTacto = [...eventos].reverse().find((e) => e.tipo === 'TACTO');

  const nombre = (m: Map<string, { nombre: string }>, k: string | null) => (k ? (m.get(k)?.nombre ?? '—') : '—');
  const timeline: ItemTimeline[] = [
    ...eventos.map((e) => ({
      fecha: e.timestamp,
      tipo: e.tipo,
      titulo:
        e.tipo === 'PESAJE'
          ? `${fmtNum(e.valor ?? 0)} kg`
          : e.tipo === 'TACTO'
            ? parseTacto(e.notas) === 'prenada'
              ? 'Preñada'
              : parseTacto(e.notas) === 'vacia'
                ? 'Vacía'
                : 'Tacto'
            : e.tipo,
      detalle: [e.notas, e.dte_numero && `DTE ${e.dte_numero}`].filter(Boolean).join(' · ') || null,
    })),
    ...[...logsAnimal, ...logsLote].map((l) => ({
      fecha: l.fecha_aplicacion,
      tipo: 'SANIDAD',
      titulo: cat.get(l.operation_id)?.nombre ?? 'Aplicación',
      detalle: [l.lote_id && !l.animal_id ? 'Aplicación al lote' : null, l.responsable, l.acta_numero && `Acta ${l.acta_numero}`].filter(Boolean).join(' · ') || null,
    })),
    ...movimientos.map((m) => ({
      fecha: m.fecha,
      tipo: 'MOVIMIENTO',
      titulo: `${nombre(potrerosById, m.potrero_origen_id)} → ${nombre(potrerosById, m.potrero_destino_id)}`,
      detalle: m.lote_origen_id !== m.lote_destino_id ? `Lote ${nombre(lotesById, m.lote_origen_id)} → ${nombre(lotesById, m.lote_destino_id)}` : null,
    })),
  ].sort((a, b) => b.fecha - a.fecha);

  return (
    <>
      <Link href="/stock" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Stock
      </Link>
      <PageHeader
        title={`Caravana ${animal.id_caravana}`}
        description={[animal.categoria, animal.raza, animal.sexo === 'H' ? 'Hembra' : 'Macho', animal.rfid && `RFID ${animal.rfid}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <Badge tone={animal.estado === 'ACTIVO' ? 'success' : 'neutral'}>{animal.estado}</Badge>
            {carencia && <Badge tone="warning">En carencia hasta {fmtDate(carencia.hasta)} · no vender</Badge>}
            {canEdit(perfil?.rol) && <AnimalEdit animal={animal} categorias={config} lotes={lotes} potreros={potreros} />}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Peso actual" value={animal.peso_actual ? `${fmtNum(animal.peso_actual)} kg` : '—'} />
        <StatCard label="Ganancia diaria" value={g == null ? '—' : `${fmtNum(g, 2)} kg/día`} hint={`${pesajes.length} pesadas`} />
        <StatCard label="Edad" value={edad == null ? '—' : `${fmtNum(edad)} meses`} hint={animal.fecha_nacimiento ? `Nació ${fmtDate(animal.fecha_nacimiento)}` : 'Sin fecha de nacimiento'} />
        <StatCard label="Ubicación" value={nombre(potrerosById, animal.potrero_id)} hint={`Lote ${nombre(lotesById, animal.lote_id)}`} />
        <StatCard
          label="Último tacto"
          value={ultimoTacto ? (parseTacto(ultimoTacto.notas) === 'prenada' ? 'Preñada' : 'Vacía') : '—'}
          hint={ultimoTacto ? fmtDate(ultimoTacto.timestamp) : cc.length ? `CC ${fmtNum(cc[cc.length - 1].score, 1)}` : undefined}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Section title="Pesadas" className="lg:col-span-3">
          {pesajes.length ? (
            <LineChartView data={pesajes.map((p) => ({ fecha: fmtDateShort(p.timestamp), kg: p.valor }))} xKey="fecha" series={[{ key: 'kg', label: 'Peso (kg)' }]} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay pesadas.</p>
          )}
        </Section>
        <Section title="Historia" description="Pesadas, sanidad, tactos y movimientos" className="lg:col-span-2">
          <div className="max-h-96 overflow-y-auto pr-2">
            <Timeline items={timeline} />
          </div>
        </Section>
      </div>
    </>
  );
}
