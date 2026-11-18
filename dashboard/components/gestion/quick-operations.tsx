import {Section} from '@/components/ui/section';
import {GenericForm} from '@/components/stock/generic-form';
import {MovimientoForm} from '@/components/movimientos/movimiento-form';
import {AplicacionForm,ProgramarForm} from '@/components/sanidad/sanidad-forms';
import type {CategoriaConfig} from '@/lib/db/types';
import type {ManagementProps} from './types';
export function QuickOperations({p,categorias}:{p:ManagementProps;categorias:CategoriaConfig[]}){if(!p.editable)return null;return <Section title="Carga rápida" description="Registrá desde acá las operaciones habituales. Una compra o venta actualiza ganado y obligación financiera en la misma confirmación."><div className="flex flex-wrap gap-3"><GenericForm categorias={categorias} lotes={p.lotes} potreros={p.potreros}/><MovimientoForm animals={p.animals} categorias={categorias} lotes={p.lotes} potreros={p.potreros} cuentas={p.ledger.cuentas}/><AplicacionForm catalogo={p.catalogo} lotes={p.lotes} programadas={[]} management={p.data}/><ProgramarForm catalogo={p.catalogo} lotes={p.lotes}/></div></Section>;}
