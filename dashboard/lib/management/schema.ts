import {z} from 'zod';
import {amountSchema,daySchema,textSchema} from '@/lib/commands/finance-input';
const quantity=z.coerce.number().finite().positive().max(100000000);
export const supplySchema=z.object({nombre:textSchema,tipo:z.enum(['ALIMENTO','MEDICAMENTO','OTRO']),unidad:z.enum(['KG','DOSIS','UNIDAD','ML']),suplemento_id:z.string().optional(),operation_id:z.string().optional(),cantidad:z.coerce.number().finite().nonnegative(),partida:textSchema.optional(),caducidad:daySchema.optional(),valor_inicial:z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),fecha:daySchema});
export const purchaseSchema=z.object({insumo_id:textSchema,cantidad:quantity,monto:amountSchema,fecha:daySchema,vencimiento:daySchema,contraparte:textSchema,comprobante:textSchema.optional(),pagado:amountSchema.optional(),cuenta_id:z.string().optional(),partida:textSchema.optional(),caducidad:daySchema.optional()});
export const consumptionSchema=z.object({insumo_id:textSchema,cantidad:quantity,fecha:daySchema,lote_id:textSchema,motivo:textSchema,partida_id:z.string().optional()});
export const cycleSchema=z.object({madre_id:textSchema,padre_id:z.string().optional(),servicio_id:textSchema,fecha:daySchema});
export const stageSchema=z.object({id:textSchema,etapa:z.enum(['TACTO','PARTO','DESTETE','PERDIDA']),fecha:daySchema,resultado:z.enum(['PRENADA','VACIA']).optional(),caravana:textSchema.optional(),sexo:z.enum(['M','H']).optional(),peso:quantity.optional()});
export const grazingSchema=z.object({lote_id:textSchema,potrero_id:textSchema,entrada:daySchema,salida:daySchema,descanso_dias:z.coerce.number().finite().int().min(1).max(365),forraje_kg_ms_ha:quantity,remanente_kg_ms_ha:z.coerce.number().finite().nonnegative(),consumo_ev_dia:quantity});
export const grazingStageSchema=z.object({id:textSchema,fecha:daySchema,potrero_destino_id:z.string().optional()});
export const closingSchema=z.object({fecha:daySchema,precios:z.string().min(2),confirmado:z.literal('on')});
export const bankSchema=z.object({cuenta_id:textSchema,desde:daySchema,hasta:daySchema,saldo_inicial:z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/),saldo_final:z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/),csv:z.string().min(1).max(1000000)});
export const matchSchema=z.object({extracto_id:textSchema,asiento_id:textSchema});
const id=z.string(),money=z.coerce.string(),ts=z.coerce.number();
export const managementSchema=z.object({
 insumos:z.array(z.object({id,nombre:id,tipo:id,unidad:id,cantidad:money,valor:money,suplemento_id:id.nullable(),operation_id:id.nullable()})),
 partidas:z.array(z.object({id,insumo_id:id,nombre:id,cantidad:money,caducidad:ts.nullable()})),
 consumos:z.array(z.object({id,insumo_id:id,cantidad:money,valor:money,fecha:ts,lote_id:id.nullable(),potrero_id:id.nullable(),origen:id})),
 ciclos:z.array(z.object({id,madre_id:id,padre_id:id.nullable(),servicio_id:id,fecha_servicio:ts,estado:id,ternero_id:id.nullable(),fecha_parto:ts.nullable(),fecha_destete:ts.nullable(),peso_destete:z.coerce.number().finite().nullable()})),
 pastoreo:z.array(z.object({id,lote_id:id,potrero_id:id,entrada:ts,salida:ts,estado:id,descanso_dias:z.number(),forraje_kg_ms_ha:z.coerce.number(),remanente_kg_ms_ha:z.coerce.number(),consumo_ev_dia:z.coerce.number(),salida_real:ts.nullable()})),
 cierres:z.array(z.object({id,fecha:ts,cabezas:z.number(),kg:money,valor_animales:money,valor_insumos:money,animales:z.array(z.object({id,peso:money,categoria:id,precio:money,valor:money})),resultado:z.object({variacion_animales:money,produccion_kg:money.nullable(),consumos:money,margen:money}).nullable()})),
 bancos:z.array(z.object({id,extracto_id:id,cuenta_id:id,fecha:ts,referencia:id,descripcion:id,monto:money,asiento_id:id.nullable()})),
 extractos:z.array(z.object({id,cuenta_id:id,desde:ts,hasta:ts,saldo_inicial:money,saldo_final:money})),
 documentos:z.array(z.object({id,movimiento_id:id,nombre:id,created_at:id})),
});
export type ManagementData=z.infer<typeof managementSchema>;
