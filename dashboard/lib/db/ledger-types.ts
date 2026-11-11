import {z} from 'zod';
const money=z.string().regex(/^-?\d+(\.\d+)?$/);
export const monthSchema=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const account=z.object({id:z.string(),nombre:z.string(),saldo:money,fecha_apertura:z.number()});
const document=z.object({id:z.string(),tipo:z.enum(['INGRESO','GASTO']),categoria:z.string(),fecha:z.number(),vencimiento:z.number(),contraparte:z.string(),descripcion:z.string().nullable(),comprobante:z.string().nullable(),monto:money,pagado:money,pendiente:money});
const entry=z.object({id:z.string(),cuenta_id:z.string(),movimiento_id:z.string().nullable(),transferencia_id:z.string().nullable(),reversa_de:z.string().nullable(),monto:money,fecha:z.number(),motivo:z.string().nullable()});
export const ledgerSchema=z.object({mes:monthSchema,cuentas:z.array(account),documentos:z.array(document),asientos:z.array(entry),totales:z.object({saldo:money,por_cobrar:money,por_pagar:money,cobros_vencidos:money,pagos_vencidos:money,cobros:money,pagos:money,flujo:money}),anteriores:z.object({cantidad:z.number(),monto:money,filas:z.array(z.object({id:z.string(),tipo:z.string(),descripcion:z.string().nullable(),fecha:z.number(),monto:money})).default([])})});
export type LedgerSnapshot=z.infer<typeof ledgerSchema>;
