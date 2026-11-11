'use client';
import type {ManagementData} from '@/lib/management/schema';
import {Options} from './fields';
export function MedicineFields({data}:{data:ManagementData}){return <>
 <Options name="insumo_id" label="Medicamento de inventario (si está incorporado)" rows={data.insumos.filter(s=>s.tipo==='MEDICAMENTO')} optional/>
 <Options name="partida_id" label="Partida a consumir" rows={data.partidas.map(b=>({id:b.id,nombre:`${data.insumos.find(s=>s.id===b.insumo_id)?.nombre} · ${b.nombre} · quedan ${b.cantidad}`}))} optional/>
 </>;}
