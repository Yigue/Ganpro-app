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
/** Electronic identity is authoritative; visual fallback supports older registrations. */
export async function resolveAnimalIdentity<T extends IdentifiedAnimal>(electronic:()=>Promise<T[]>,visual:()=>Promise<T[]>):Promise<T|null>{
 const exact=await electronic();
 if(exact.length>1)throw new AmbiguousAnimalIdentity();
 if(exact.length===1)return exact[0];
 return selectIdentifiedAnimal(await visual());
}
export function displayAnimalIdentity(a:{id:string;idCaravana:string;rfid?:string|null}):string{
 return /^SIN-CARAVANA-/i.test(a.idCaravana)||Boolean(a.rfid&&(a.idCaravana===a.rfid||a.idCaravana===`RFID-${a.rfid}`))?`Sin caravana · ${a.id.slice(-8).toUpperCase()}`:a.idCaravana;
}
