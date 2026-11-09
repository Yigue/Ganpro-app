import type { ActionState } from '@/lib/commands/result';
export function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) return <div role="alert" className="text-sm text-danger"><p>{state.error}</p>{state.fieldErrors && <ul>{Object.entries(state.fieldErrors).map(([key, values]) => <li key={key}>{key}: {values.join(' ')}</li>)}</ul>}{state.requestId && <p className="text-xs">Referencia: {state.requestId}</p>}</div>;
  return state.message ? <p role="status" className="text-sm text-success">{state.message}</p> : null;
}
