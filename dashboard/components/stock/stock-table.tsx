'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/input';

export type {FilaStock} from './stock-columns';
import {stockColumns,type FilaStock} from './stock-columns';

function opciones(filas: FilaStock[], key: keyof FilaStock) {
  return [...new Set(filas.map((f) => f[key]).filter(Boolean) as string[])].sort();
}

export function StockTable({ filas, soloPesadaAtrasada }: { filas: FilaStock[]; soloPesadaAtrasada?: boolean }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [raza, setRaza] = useState('');
  const [potrero, setPotrero] = useState('');
  const [estado, setEstado] = useState('ACTIVO');
  const [identificacion,setIdentificacion]=useState('');
  const [atrasadas, setAtrasadas] = useState(Boolean(soloPesadaAtrasada));

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!identificacion||identificacion==='pendiente'&&f.sinCaravana||identificacion==='identificado'&&!f.sinCaravana) &&
        (!categoria || f.categoria === categoria) &&
        (!raza || f.raza === raza) &&
        (!potrero || f.potrero === potrero) &&
        (!estado || f.estado === estado) &&
        (!atrasadas || f.pesadaAtrasada) &&
        (!term || f.caravana.toLowerCase().includes(term) || (f.rfid ?? '').includes(term)),
    );
  }, [filas, q, categoria, raza, potrero, estado, atrasadas,identificacion]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 px-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar caravana o RFID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {opciones(filas, 'categoria').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={raza} onChange={(e) => setRaza(e.target.value)} aria-label="Raza">
          <option value="">Todas las razas</option>
          {opciones(filas, 'raza').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={potrero} onChange={(e) => setPotrero(e.target.value)} aria-label="Potrero">
          <option value="">Todos los potreros</option>
          {opciones(filas, 'potrero').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option>ACTIVO</option>
          <option>VENDIDO</option>
          <option>MUERTO</option>
          <option>DESCARTE</option>
        </Select>
      </div>
      <div className="flex items-center justify-between px-5 text-sm text-muted-foreground">
        <span>{filtradas.length} animales</span><Select className="max-w-52" aria-label="Identificación" value={identificacion} onChange={e=>setIdentificacion(e.target.value)}><option value="">Toda identificación</option><option value="pendiente">Sin caravana visual</option><option value="identificado">Con caravana visual</option></Select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={atrasadas} onChange={(e) => setAtrasadas(e.target.checked)} />
          Solo pesadas atrasadas
        </label>
      </div>
      <DataTable data={filtradas} columns={stockColumns} columnChooser initialVisibility={{rfid:true,raza:false,gdp:false,edadMeses:false,ultimaPesada:false}} initialSorting={[{id:'caravana',desc:false}]} getRowId={row=>row.id} empty="No hay animales con esos filtros" />
    </div>
  );
}
