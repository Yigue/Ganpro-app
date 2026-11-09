import {z} from 'zod';
export const amountSchema=z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).refine(s=>Number(s)>0);
export const textSchema=z.string().trim().min(1).max(300);
export const daySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const documentSchema=z.object({tipo:z.enum(['GASTO','INGRESO']),categoria:textSchema,monto:amountSchema,fecha:daySchema,vencimiento:daySchema,contraparte:textSchema,lote_id:z.string().optional(),descripcion:textSchema.optional(),comprobante:textSchema.optional(),centro_costo:textSchema.optional(),pagado:amountSchema.optional(),cuenta_id:z.string().optional()});
