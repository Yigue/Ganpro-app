import {z} from 'zod';
export const paymentMethods=['A_CONVENIR','TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO'] as const;
export const tradeTerms=z.object({desbaste_pct:z.coerce.number().finite().min(0).max(20).optional(),plazo_dias:z.coerce.number().int().min(0).max(365).optional(),metodo_pago:z.enum(paymentMethods).optional(),condiciones:z.string().trim().max(1000).optional()});
/** Desbaste reduces billable kg, never the physical kg or number of heads moved. */
export function tradePreview(mode:string,heads:number,grossKg:number,price:number,shrink:number){const billedKg=Math.round(grossKg*(1-shrink/100)*100)/100;return {billedKg,amount:Math.round((mode==='KG'?billedKg:heads)*price*100)/100,average:heads>0?grossKg/heads:null};}
