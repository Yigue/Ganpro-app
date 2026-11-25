'use client';
import Link from 'next/link';
import type {ColumnDef} from '@tanstack/react-table';
import {Badge,type BadgeTone} from '@/components/ui/badge';
import {fmtDate,fmtNum} from '@/lib/calc/format';
export interface FilaStock{id:string;caravana:string;sinCaravana?:boolean;rfid:string|null;categoria:string;raza:string|null;sexo:string;estado:string;lote:string|null;potrero:string|null;peso:number|null;edadMeses:number|null;gdp:number|null;ultimaPesada:number|null;pesadaAtrasada:boolean;carenciaHasta:number|null}
const tones:Record<string,BadgeTone>={ACTIVO:'success',VENDIDO:'info',MUERTO:'danger',DESCARTE:'warning'};
export const stockColumns:ColumnDef<FilaStock,unknown>[]=[
 {accessorKey:'caravana',header:'Animal',enableHiding:false,cell:({row})=><Link href={`/stock/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.caravana}{row.original.sinCaravana&&<span className="block text-xs text-muted-foreground">Identificación pendiente</span>}</Link>},
 {accessorKey:'categoria',header:'Categoría'},{accessorKey:'sexo',header:'Sexo',cell:({row})=>row.original.sexo==='H'?'Hembra':'Macho'},
 {accessorKey:'lote',header:'Lote',cell:({row})=>row.original.lote??'Sin lote'},
 {accessorKey:'potrero',header:'Potrero',cell:({row})=>row.original.potrero??'Sin potrero'},
 {accessorKey:'peso',header:'Peso',cell:({row})=>row.original.peso==null?'—':`${fmtNum(row.original.peso)} kg`},
 {accessorKey:'estado',header:'Estado',cell:({row})=><div className="flex gap-1"><Badge tone={tones[row.original.estado]??'neutral'}>{row.original.estado}</Badge>{row.original.carenciaHasta&&<Badge tone="warning">Retiro</Badge>}</div>},
 {accessorKey:'raza',header:'Raza',cell:({row})=>row.original.raza??'—'},
 {accessorKey:'gdp',header:'GDP',cell:({row})=>row.original.gdp==null?'—':`${fmtNum(row.original.gdp,2)} kg/d`},
 {accessorKey:'edadMeses',header:'Edad',cell:({row})=>row.original.edadMeses==null?'—':`${fmtNum(row.original.edadMeses)} meses`},
 {accessorKey:'ultimaPesada',header:'Última pesada',cell:({row})=><span className={row.original.pesadaAtrasada?'text-warning':''}>{fmtDate(row.original.ultimaPesada)}</span>},
 {accessorKey:'rfid',header:'RFID electrónico',cell:({row})=><span className="font-mono text-xs text-muted-foreground">{row.original.rfid??'Sin lectura'}</span>},
];
