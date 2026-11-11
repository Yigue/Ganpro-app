import { z } from 'zod';
/** Output validation is internal, never a user-input validation error. */
export function operationMessage(result: unknown): string {
 return z.object({message:z.string().max(500)}).parse(result).message;
}
