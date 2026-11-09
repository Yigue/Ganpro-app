export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
}
export type CommandEvent = {
  type: 'started' | 'succeeded' | 'failed';
  command: string;
  requestId: string;
  durationMs: number;
  code?: string;
};
export const TECHNICAL_ERROR = 'No pudimos completar la operación. Intentá nuevamente más tarde.';
