'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const credenciales = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export interface LoginState {
  error?: string;
  info?: string;
}

function destinoSeguro(next: string | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function ingresar(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credenciales.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: 'Email o contraseña incorrectos' };
  redirect(destinoSeguro(parsed.data.next));
}

export async function registrarse(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credenciales.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { nombre: parsed.data.nombre || undefined } },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: 'Te mandamos un email para confirmar la cuenta. Después ingresá desde acá.' };
  redirect('/');
}
