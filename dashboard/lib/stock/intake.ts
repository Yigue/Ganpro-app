import {z} from 'zod';
export const intakeDefaults=z.object({sexo:z.enum(['M','H']),categoria:z.string().min(1),raza:z.string().trim().optional(),lote_id:z.string().optional(),potrero_id:z.string().optional()});
export const readingSchema=z.object({rfid:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,24}$/),visual:z.string().trim().max(100).optional(),peso:z.number().finite().positive().max(9999).optional(),animal_id:z.string().optional(),expected_version:z.number().int().nonnegative().optional(),captured_at:z.number().int().positive()});
export type Reading=z.infer<typeof readingSchema>;
export const readingList=z.array(readingSchema).min(1).max(500).refine(rows=>new Set(rows.map(r=>r.rfid)).size===rows.length);
