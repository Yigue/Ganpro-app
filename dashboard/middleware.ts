import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // El endpoint de sync del celular tiene su propia autenticación por clave.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|manifest.webmanifest|api/sync|api/k/).*)'],
};
