import { runOperation } from './rpc';
import type { ServerClient } from '@/lib/supabase/server';
export interface Mutation {
  table: string; mode: 'insert' | 'update' | 'delete';
  data?: Record<string, unknown>; id?: string; expected?: number;
}
/** Replaces a sequence of REST mutations with a single PostgreSQL transaction. */
export async function applyBatch(client: ServerClient, mutations: Mutation[]) {
  return runOperation(client, 'batch', mutations);
}
