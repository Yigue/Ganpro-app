export interface IdentifiedAnimal { estado: string }
export class AmbiguousAnimalIdentity extends Error {
  constructor() { super('La caravana identifica varios registros. Revisá el stock antes de operar.'); }
}
/** Historical reuse must never select a sold record ahead of the current animal. */
export function selectIdentifiedAnimal<T extends IdentifiedAnimal>(matches: readonly T[]): T | null {
  const active = matches.filter(animal => animal.estado === 'ACTIVO');
  if (active.length === 1) return active[0];
  if (active.length > 1 || matches.length > 1) throw new AmbiguousAnimalIdentity();
  return matches[0] ?? null;
}
