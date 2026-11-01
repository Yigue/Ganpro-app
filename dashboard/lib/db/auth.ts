import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Perfil, Rol } from './types';

export const getSessionPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
  return (data as Perfil | null) ?? { id: user.id, email: user.email ?? null, nombre: null, rol: 'asesor', created_at: '' };
});

export function canEdit(rol: Rol | undefined): boolean {
  return rol === 'admin' || rol === 'campo';
}

/** Para Server Actions: corta si el usuario no tiene alguno de los roles. */
export async function requireRol(...roles: Rol[]): Promise<Perfil> {
  const perfil = await getSessionPerfil();
  if (!perfil) redirect('/login');
  if (!roles.includes(perfil.rol)) {
    throw new Error('No tenés permiso para esta acción');
  }
  return perfil;
}
