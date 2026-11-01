import Link from 'next/link';
import { CalendarioSection, type ItemCalendario } from '@/components/sanidad/calendario-section';
import { AplicacionForm, ProductoForm, ProgramarForm } from '@/components/sanidad/sanidad-forms';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ejercicioDe, mesKey, ultimosMeses } from '@/lib/calc/fechas';
import { fmtARS, fmtDate, fmtNum } from '@/lib/calc/format';
import { animalesEnCarencia, proximasOperaciones } from '@/lib/calc/sanidad';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getAnimals, getCatalogo, getEstablecimiento, getLotes, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Sanidad' };

export default async function SanidadPage() {
  const [animals, catalogo, lotes, logs, scheduled, est, perfil] = await Promise.all([
    getAnimals(),
    getCatalogo(),
    getLotes(),
    selectAll('operation_logs', { order: 'fecha_aplicacion', ascending: false }),
    selectAll('scheduled_operations', { order: 'fecha_programada' }),
    getEstablecimiento(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const cat = byId(catalogo);
  const lotesById = byId(lotes);
  const animalsById = byId(animals);
  const loteNombre = (id: string | null) => (id ? (lotesById.get(id)?.nombre ?? '?') : 'Todo el rodeo');
  const ejercicio = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const carencias = animalesEnCarencia(animals, logs, ahora);
  const proximas = proximasOperaciones(scheduled, ahora, 30);
  const cabezasLote = (loteId: string | null) => animals.filter((a) => a.estado === 'ACTIVO' && a.lote_id === loteId).length;
  const costoEjercicio = logs
    .filter((l) => l.fecha_aplicacion >= ejercicio.inicio)
    .reduce((acc, l) => acc + (cat.get(l.operation_id)?.costo_unitario ?? 0) * (l.dosis ?? 1) * (l.animal_id ? 1 : cabezasLote(l.lote_id)), 0);

  // Calendario: 3 meses atrás y 9 adelante.
  const fin = new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth() + 9, 1).getTime();
  const meses = ultimosMeses(12, fin).map((m) => m.key);
  const items: Record<string, ItemCalendario[]> = {};
  const push = (it: ItemCalendario) => {
    const k = mesKey(it.fecha);
    if (meses.includes(k)) (items[k] ??= []).push(it);
  };
  scheduled.forEach((s) =>
    push({
      id: s.id,
      fecha: s.fecha_programada,
      nombre: cat.get(s.operation_id)?.nombre ?? 'Operación',
      lote: loteNombre(s.lote_id),
      estado: s.estado,
      vencida: s.estado === 'PENDIENTE' && s.fecha_programada < ahora,
    }),
  );
  logs
    .filter((l) => l.lote_id)
    .forEach((l) =>
      push({ id: l.id, fecha: l.fecha_aplicacion, nombre: cat.get(l.operation_id)?.nombre ?? 'Aplicación', lote: loteNombre(l.lote_id), estado: 'APLICADO', vencida: false }),
    );
  Object.values(items).forEach((l) => l.sort((a, b) => a.fecha - b.fecha));

  const editable = canEdit(perfil?.rol);
  const programadas = scheduled
    .filter((s) => s.estado === 'PENDIENTE')
    .map((s) => ({ id: s.id, label: `${cat.get(s.operation_id)?.nombre} · ${loteNombre(s.lote_id)} · ${fmtDate(s.fecha_programada)}` }));

  return (
    <>
      <PageHeader
        title="Sanidad"
        description="Plan sanitario, aplicaciones y períodos de retiro"
        actions={
          editable && (
            <>
              <ProductoForm />
              <ProgramarForm catalogo={catalogo} lotes={lotes} />
              <AplicacionForm catalogo={catalogo} lotes={lotes} programadas={programadas} />
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Próximos 30 días" value={proximas.length} hint="Operaciones programadas" tone={proximas.some((p) => p.fecha_programada < ahora) ? 'danger' : 'default'} />
        <StatCard label="En carencia" value={carencias.length} hint="Animales que no se pueden vender" tone={carencias.length ? 'warning' : 'default'} />
        <StatCard label="Aplicaciones" value={logs.filter((l) => l.fecha_aplicacion >= ejercicio.inicio).length} hint={`Ejercicio ${ejercicio.label}`} />
        <StatCard label="Costo sanitario" value={fmtARS(costoEjercicio)} hint="Estimado con costo por dosis del catálogo" />
      </div>
      <CalendarioSection meses={meses} items={items} puedeEditar={editable} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Aplicaciones recientes" flush>
          <Table>
            <THead>
              <tr>
                <TH>Fecha</TH>
                <TH>Producto</TH>
                <TH>Destino</TH>
                <TH>Acta</TH>
                <TH>Retiro hasta</TH>
              </tr>
            </THead>
            <TBody>
              {logs.slice(0, 15).map((l) => (
                <TR key={l.id}>
                  <TD>{fmtDate(l.fecha_aplicacion)}</TD>
                  <TD className="font-medium">{cat.get(l.operation_id)?.nombre ?? '—'}</TD>
                  <TD>{l.animal_id ? `Animal ${animalsById.get(l.animal_id)?.id_caravana ?? ''}` : loteNombre(l.lote_id)}</TD>
                  <TD className="font-mono text-xs">{l.acta_numero ?? '—'}</TD>
                  <TD>
                    {l.fecha_fin_carencia ? (
                      <Badge tone={l.fecha_fin_carencia > ahora ? 'warning' : 'neutral'}>{fmtDate(l.fecha_fin_carencia)}</Badge>
                    ) : (
                      '—'
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
        <Section title="Animales en período de retiro" description="Bloqueados para la venta hasta la fecha indicada" flush>
          {carencias.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Ningún animal en carencia.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Caravana</TH>
                    <TH>Categoría</TH>
                    <TH>Producto</TH>
                    <TH>Hasta</TH>
                  </tr>
                </THead>
                <TBody>
                  {carencias.map((c) => (
                    <TR key={c.animal.id}>
                      <TD>
                        <Link href={`/stock/${c.animal.id}`} className="font-medium text-primary hover:underline">
                          {c.animal.id_caravana}
                        </Link>
                      </TD>
                      <TD>{c.animal.categoria}</TD>
                      <TD>{cat.get(c.operationId)?.nombre}</TD>
                      <TD>
                        <Badge tone="warning">{fmtDate(c.hasta)}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Section>
      </div>
      <Section title="Catálogo de productos" flush>
        <Table>
          <THead>
            <tr>
              <TH>Producto</TH>
              <TH>Tipo</TH>
              <TH className="text-right">Retiro</TH>
              <TH className="text-right">Costo por dosis</TH>
              <TH>Notas</TH>
            </tr>
          </THead>
          <TBody>
            {catalogo.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.nombre}</TD>
                <TD>
                  <Badge tone={c.tipo === 'VACUNA' ? 'success' : c.tipo === 'IATF' ? 'primary' : 'info'}>{c.tipo}</Badge>
                </TD>
                <TD className="text-right tabular-nums">{c.dias_carencia ? `${fmtNum(c.dias_carencia)} días` : '—'}</TD>
                <TD className="text-right tabular-nums">{fmtARS(c.costo_unitario)}</TD>
                <TD className="text-muted-foreground">{c.notas ?? ''}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>
    </>
  );
}
