'use client';

import { FileUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { crearAnimal, importarCsvRFID } from '@/app/(dashboard)/stock/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Select, Textarea } from '@/components/ui/input';
import type { CategoriaConfig, Lote, Potrero } from '@/lib/db/types';
import { AnimalFormFields } from './animal-form-fields';

interface Props {
  categorias: CategoriaConfig[];
  lotes: Lote[];
  potreros: Potrero[];
}

function CsvField() {
  const [texto, setTexto] = useState('');
  return (
    <>
      <Field label="Archivo del bastón (.csv / .txt)">
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setTexto(await f.text());
          }}
        />
      </Field>
      <Field label="Contenido">
        <Textarea name="csv" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'EID;Peso\n982000400000001;312'} />
      </Field>
    </>
  );
}

export function StockActions({ categorias, lotes, potreros }: Props) {
  return (
    <>
      <FormDialog
        title="Importar lectura RFID"
        description="Si el RFID ya existe se registra la pesada; si no, se da de alta con los valores por defecto de abajo."
        trigger={
          <>
            <FileUp className="h-4 w-4" /> Importar CSV RFID
          </>
        }
        triggerVariant="outline"
        action={importarCsvRFID}
        submitLabel="Importar"
      >
        <CsvField />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sexo por defecto">
            <Select name="sexo" defaultValue="H">
              <option value="H">Hembra</option>
              <option value="M">Macho</option>
            </Select>
          </Field>
          <Field label="Categoría por defecto">
            <Select name="categoria">
              {categorias.map((c) => (
                <option key={c.categoria}>{c.categoria}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lote">
            <Select name="lote_id">
              <option value="">Sin lote</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Potrero">
            <Select name="potrero_id">
              <option value="">Sin potrero</option>
              {potreros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormDialog>
      <FormDialog
        title="Nuevo animal"
        trigger={
          <>
            <Plus className="h-4 w-4" /> Nuevo animal
          </>
        }
        action={crearAnimal}
      >
        <AnimalFormFields categorias={categorias} lotes={lotes} potreros={potreros} />
      </FormDialog>
    </>
  );
}
