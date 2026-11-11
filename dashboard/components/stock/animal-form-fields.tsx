import {CategoryFields} from './category-fields';
import {pendingVisual} from '@/lib/stock/identity';
import { Field, Input, Select } from '@/components/ui/input';
import type { Animal, CategoriaConfig, Lote, Potrero } from '@/lib/db/types';

const toDateInput = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

export function AnimalFormFields({
  animal,
  categorias,
  lotes,
  potreros,
  conEstado,
}: {
  animal?: Animal;
  categorias: CategoriaConfig[];
  lotes: Lote[];
  potreros: Potrero[];
  conEstado?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {animal && <input type="hidden" name="id" value={animal.id} />}
      <Field label="Caravana visual">
        <Input name="id_caravana" placeholder="Sin caravana todavía" defaultValue={animal&&!pendingVisual(animal)?animal.id_caravana:''} />
      </Field>
      <Field label="RFID electrónico (opcional)">
        <Input name="rfid" defaultValue={animal?.rfid ?? ''} inputMode="numeric" />
      </Field>
      <CategoryFields categorias={categorias} initialCategory={animal?.categoria} initialSex={animal?.sexo} preserveInitial={Boolean(animal)}/>
      <Field label="Raza">
        <Input name="raza" defaultValue={animal?.raza ?? ''} />
      </Field>
      <Field label="Fecha de nacimiento">
        <Input name="fecha_nacimiento" type="date" defaultValue={toDateInput(animal?.fecha_nacimiento)} />
      </Field>
      <Field label="Peso actual (kg)">
        <Input name="peso_actual" type="number" step="0.5" min="0" defaultValue={animal?.peso_actual ?? ''} />
      </Field>
      {conEstado && (
        <Field label="Estado">
          <input type="hidden" name="estado" value={animal?.estado ?? 'ACTIVO'} />
          <Input value={animal?.estado ?? 'ACTIVO'} readOnly aria-label="Estado actual" />
          <p className="text-xs text-muted-foreground">Las ventas y bajas se registran desde Movimientos para conservar stock y finanzas.</p>
        </Field>
      )}
      <Field label="Lote">
        <Select name="lote_id" defaultValue={animal?.lote_id ?? ''}>
          <option value="">Sin lote</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Potrero">
        <Select name="potrero_id" defaultValue={animal?.potrero_id ?? ''}>
          <option value="">Sin potrero</option>
          {potreros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
