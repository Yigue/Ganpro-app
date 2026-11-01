import { headers } from 'next/headers';
import { CategoriasForm, EstablecimientoForm, LoteForm, PotreroForm, PreciosForm, UsuariosTable } from '@/components/config/config-forms';
import { SyncUrl } from '@/components/config/sync-section';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtDate, fmtNum } from '@/lib/calc/format';
import { precioVigente } from '@/lib/calc/finanzas';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getCategoriasConfig, getEstablecimiento, getLotes, getPotreros, getPrecios, selectAll } from '@/lib/db/client';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Configuración' };

export default async function ConfigPage() {
  const [est, potreros, lotes, config, precios, perfil, perfiles, manga, syncLogs] = await Promise.all([
    getEstablecimiento(),
    getPotreros(),
    getLotes(),
    getCategoriasConfig(),
    getPrecios(),
    getSessionPerfil(),
    selectAll('perfiles', { order: 'created_at' }),
    selectAll('manga_action_queue', { order: 'created_at', ascending: false }),
    selectAll('sync_logs', { filter: (q) => q.eq('synced', false) }),
  ]);

  const supabase = await createClient();
  const { data: ultimoCambio } = await supabase.from('animals').select('server_updated_at').order('server_updated_at', { ascending: false }).limit(1).maybeSingle();

  const h = await headers();
  const base = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const esAdmin = perfil?.rol === 'admin';
  const editable = canEdit(perfil?.rol);
  const precio = precioVigente(precios);

  return (
    <>
      <PageHeader title="Configuración" description="Establecimiento, potreros, usuarios, catálogos y precios de referencia" />
      <Section title="Establecimiento" description={esAdmin ? undefined : 'Solo el administrador puede editar'}>
        <EstablecimientoForm est={est} editable={esAdmin} />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Potreros" actions={editable && <PotreroForm />} flush>
          <Table>
            <THead>
              <tr>
                <TH>Nombre</TH>
                <TH className="text-right">Ha</TH>
                <TH>Recurso</TH>
                <TH className="text-right">Cap. EV</TH>
                {editable && <TH />}
              </tr>
            </THead>
            <TBody>
              {potreros.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.nombre}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(p.hectareas)}</TD>
                  <TD className="text-muted-foreground">{p.recurso_forrajero ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(p.capacidad_ev)}</TD>
                  {editable && (
                    <TD className="text-right">
                      <PotreroForm potrero={p} />
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
        <Section title="Lotes" actions={editable && <LoteForm />} flush>
          <Table>
            <THead>
              <tr>
                <TH>Nombre</TH>
                <TH>Ubicación</TH>
                <TH className="text-right">Ha</TH>
                <TH className="text-right">Alquiler/ha/año</TH>
                {editable && <TH />}
              </tr>
            </THead>
            <TBody>
              {lotes.map((l) => (
                <TR key={l.id}>
                  <TD className="font-medium">{l.nombre}</TD>
                  <TD className="text-muted-foreground">{l.ubicacion ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(l.hectareas)}</TD>
                  <TD className="text-right tabular-nums">{l.costo_alquiler_ha ? fmtARS(l.costo_alquiler_ha) : '—'}</TD>
                  {editable && (
                    <TD className="text-right">
                      <LoteForm lote={l} />
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Categorías y coeficientes EV" description="El asesor puede pedirle al admin que los ajuste; se usan en carga, recategorización y sal" flush>
          <CategoriasForm categorias={config} editable={esAdmin} />
        </Section>
        <div className="flex flex-col gap-6">
          <Section title="Usuarios y roles" description="Administración edita todo · campo carga datos · asesor solo lee" flush>
            <UsuariosTable perfiles={perfiles} yo={perfil?.id ?? ''} editable={esAdmin} />
          </Section>
          <Section
            title="Precios de referencia"
            description={precio ? `Última carga: ${fmtDate(precio.fecha)}` : 'Sin precios cargados'}
            actions={editable && <PreciosForm ultimos={(precio ?? {}) as unknown as Record<string, number | null>} />}
          >
            {precio ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {(
                  [
                    ['Novillo', precio.novillo_kg],
                    ['Ternero', precio.ternero_kg],
                    ['Ternera', precio.ternera_kg],
                    ['Vaquillona', precio.vaquillona_kg],
                    ['Vaca', precio.vaca_kg],
                    ['Vaca descarte', precio.vaca_descarte_kg],
                    ['Toro', precio.toro_kg],
                    ['Dólar oficial', precio.dolar_oficial],
                    ['Dólar MEP', precio.dolar_mep],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium tabular-nums">{fmtARS(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Cargá los precios para valuar el rodeo.</p>
            )}
          </Section>
        </div>
      </div>
      <div id="sync">
        <Section title="Sincronización con la app GanPro" description="La app sincroniza con este dashboard; ambos usan las mismas tablas en Supabase">
          <div className="grid gap-6 lg:grid-cols-2">
            {esAdmin ? <SyncUrl base={base} clave={process.env.SYNC_API_KEY ?? null} /> : <p className="text-sm text-muted-foreground">El administrador ve la dirección de sincronización.</p>}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Último cambio" value={ultimoCambio?.server_updated_at ? fmtDate(ultimoCambio.server_updated_at) : '—'} hint="En animales" />
              <StatCard label="Cola manga" value={manga.filter((m) => m.status === 'PENDING').length} hint="Pendientes" />
              <StatCard label="Errores" value={manga.filter((m) => m.status === 'ERROR').length} tone={manga.some((m) => m.status === 'ERROR') ? 'danger' : 'default'} hint={`${syncLogs.length} logs sin sincronizar`} />
            </div>
          </div>
          {manga.some((m) => m.status === 'ERROR') && (
            <div className="mt-4">
              <Table>
                <THead>
                  <tr>
                    <TH>Fecha</TH>
                    <TH>Acción</TH>
                    <TH>Estado</TH>
                  </tr>
                </THead>
                <TBody>
                  {manga
                    .filter((m) => m.status === 'ERROR')
                    .slice(0, 10)
                    .map((m) => (
                      <TR key={m.id}>
                        <TD>{fmtDate(m.created_at)}</TD>
                        <TD>{m.action_type}</TD>
                        <TD>
                          <Badge tone="danger">{m.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
