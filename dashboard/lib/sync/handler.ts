import 'server-only';
import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Protocolo de sincronización de WatermelonDB que ya usa la app GanPro:
//   GET  {syncApiUrl}/sync/ping
//   GET  {syncApiUrl}/sync/pull?last_pulled_at=&schema_version=&migration=
//   POST {syncApiUrl}/sync/push?last_pulled_at=   body: changes
// La app no manda headers propios, por eso la clave puede ir en la URL
// (/api/k/<SYNC_API_KEY>) además de en Authorization: Bearer.

function claveValida(recibida: string | null): boolean {
  const esperada = process.env.SYNC_API_KEY;
  if (!esperada) return false;
  if (!recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleSync(request: NextRequest, action: string, keyFromPath: string | null) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!claveValida(keyFromPath ?? bearer)) {
    return error(401, process.env.SYNC_API_KEY ? 'Clave de sync inválida' : 'SYNC_API_KEY no está configurada en el servidor');
  }

  const supabase = createAdminClient();
  const url = request.nextUrl;
  const lastPulledAt = Number(url.searchParams.get('last_pulled_at') ?? 0) || 0;

  if (action === 'ping' && request.method === 'GET') {
    return NextResponse.json({ ok: true, timestamp: Date.now() });
  }

  if (action === 'pull' && request.method === 'GET') {
    const { data, error: err } = await supabase.rpc('ganpro_sync_pull', { p_last_pulled_at: lastPulledAt });
    if (err) return error(500, err.message);
    return NextResponse.json(data);
  }

  if (action === 'push' && request.method === 'POST') {
    let changes: unknown;
    try {
      changes = await request.json();
    } catch {
      return error(400, 'Body JSON inválido');
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return error(400, 'changes debe ser un objeto { tabla: { created, updated, deleted } }');
    }
    const { error: err } = await supabase.rpc('ganpro_sync_push', { p_changes: changes, p_last_pulled_at: lastPulledAt });
    if (err) {
      // 409: la app hace pull y reintenta.
      const conflict = err.code === '40001' || err.message.includes('GANPRO_SYNC_CONFLICT');
      return error(conflict ? 409 : 500, err.message);
    }
    return NextResponse.json({ ok: true });
  }

  return error(404, 'Acción de sync desconocida');
}
