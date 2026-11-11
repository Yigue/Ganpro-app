import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import {databaseError,DomainError} from '@/lib/commands/errors';
import type { Perfil, Rol } from './types';

export const getSessionPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const {
    data: { user }, error:authError,
  } = await supabase.auth.getUser();
  if(authError && authError.name!=='AuthSessionMissingError')throw databaseError(authError);
  if (!user) return null;
  const { data,error } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
  if(error)throw databaseError(error);
  if(!data)throw new DomainError('FORBIDDEN');
  return data as Perfil;
});

export function canEdit(rol: Rol | undefined): boolean {
  return rol === 'admin' || rol === 'campo';
}

/** Para Server Actions: corta si el usuario no tiene alguno de los roles. */
export async function requireRol(...roles: Rol[]): Promise<Perfil> {
  const perfil = await getSessionPerfil();
  if (!perfil) throw new DomainError('UNAUTHORIZED');
  if (!roles.includes(perfil.rol)) {
    throw new DomainError('FORBIDDEN');
  }
  return perfil;
}
