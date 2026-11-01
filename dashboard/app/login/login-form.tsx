'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { ingresar, registrarse, type LoginState } from './actions';

export function LoginForm({ next }: { next?: string }) {
  const [modo, setModo] = useState<'ingresar' | 'registrarse'>('ingresar');
  const [state, action, pending] = useActionState<LoginState, FormData>(modo === 'ingresar' ? ingresar : registrarse, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ''} />
      {modo === 'registrarse' && (
        <Field label="Nombre">
          <Input name="nombre" autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" required minLength={8} autoComplete={modo === 'ingresar' ? 'current-password' : 'new-password'} />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.info && <p className="text-sm text-info">{state.info}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Un momento…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setModo(modo === 'ingresar' ? 'registrarse' : 'ingresar')}
      >
        {modo === 'ingresar' ? '¿No tenés cuenta? Crear una' : 'Ya tengo cuenta'}
      </button>
    </form>
  );
}
