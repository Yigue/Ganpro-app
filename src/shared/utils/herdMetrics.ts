export interface HerdWeight { animalId: string; timestamp: number; valor: number | null }
const DAY = 86400000;
const valid = (p: HerdWeight) => Number.isFinite(p.timestamp) && p.valor != null && Number.isFinite(p.valor) && p.valor > 0;

/** Cohort gain is summed individual kg divided by observed animal-days, never a mixed-animal regression. */
export function herdGain(weights: HerdWeight[]): {dailyGain: number | null; animals: number; animalDays: number} {
  const groups = new Map<string, HerdWeight[]>();
  for (const point of weights.filter(valid)) {
    const list = groups.get(point.animalId) ?? [];
    list.push(point); groups.set(point.animalId, list);
  }
  let kg = 0, animalDays = 0, animals = 0;
  for (const list of groups.values()) {
    list.sort((a,b) => a.timestamp - b.timestamp);
    const byTime = new Map<number, number>();
    let ambiguous = false;
    for (const p of list) {
      if (byTime.has(p.timestamp) && byTime.get(p.timestamp) !== p.valor) ambiguous = true;
      byTime.set(p.timestamp, p.valor!);
    }
    if (ambiguous) continue;
    const first = list[0], last = list[list.length - 1];
    const days = (last.timestamp - first.timestamp) / DAY;
    if (days <= 0) continue;
    kg += last.valor! - first.valor!; animalDays += days; animals++;
  }
  return {dailyGain: animalDays ? kg / animalDays : null, animals, animalDays};
}

/** Daily mean is descriptive of the sampled animals, not a growth estimate. */
export function dailyWeights(weights: HerdWeight[]): {x: number; y: number}[] {
  const groups = new Map<string, {timestamps:number[]; values:Map<string, number>}>();
  for (const p of weights.filter(valid).sort((a,b)=>a.timestamp-b.timestamp)) {
    const day = new Date(p.timestamp - 3 * 3600000).toISOString().slice(0,10);
    const group = groups.get(day) ?? {timestamps:[], values:new Map<string, number>()};
    group.timestamps.push(p.timestamp); group.values.set(p.animalId, p.valor!); groups.set(day,group);
  }
  return [...groups.values()].map(g => ({x:Math.min(...g.timestamps), y:[...g.values.values()].reduce((a,b)=>a+b,0)/g.values.size})).sort((a,b)=>a.x-b.x);
}
