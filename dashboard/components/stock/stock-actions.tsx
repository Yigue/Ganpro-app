'use client';

import Link from 'next/link';
import {AnimalIntake} from './animal-intake';
import {LoteForm} from '@/components/config/land-forms';
import { FileUp } from 'lucide-react';
import { useState } from 'react';
import { importarCsvRFID } from '@/app/(dashboard)/stock/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import {IntakeDefaults} from './intake-defaults';
import { Field, Textarea } from '@/components/ui/input';
import type { CategoriaConfig, Lote, Potrero } from '@/lib/db/types';

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
      <Link href="/stock/manga" className="rounded-md border px-3 py-2 text-sm">Modo manga / lectura</Link>
      <AnimalIntake categorias={categorias} lotes={lotes} potreros={potreros}/><LoteForm/>
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
        <IntakeDefaults categorias={categorias} lotes={lotes} potreros={potreros}/>
      </FormDialog>

    </>
  );
}
