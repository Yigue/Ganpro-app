'use client';
import { cambiarRol } from '@/app/(dashboard)/config/actions';
import { useAccion } from '@/components/ui/form-dialog';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import type { Perfil } from '@/lib/db/types';
function RolSelect({ perfil, esYo }: { perfil: Perfil; esYo: boolean }) {
  const [, action, pending] = useAccion(cambiarRol);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={perfil.id} />
      <select
        name="rol"
        defaultValue={perfil.rol}
        disabled={pending || esYo}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border bg-card px-2 py-1 text-sm"
        aria-label="Rol"
      >
        <option value="admin">Administración</option>
        <option value="campo">Encargado de campo</option>
        <option value="asesor">Asesor (lectura)</option>
      </select>
    </form>
  );
}

export function UsuariosTable({ perfiles, yo, editable }: { perfiles: Perfil[]; yo: string; editable: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Nombre</TH>
          <TH>Email</TH>
          <TH>Rol</TH>
        </tr>
      </THead>
      <TBody>
        {perfiles.map((p) => (
          <TR key={p.id}>
            <TD className="font-medium">{p.nombre ?? '—'}</TD>
            <TD className="text-muted-foreground">{p.email}</TD>
            <TD>{editable ? <RolSelect perfil={p} esYo={p.id === yo} /> : p.rol}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
