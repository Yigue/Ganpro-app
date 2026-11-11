/** Business dates follow Argentina regardless of the server or browser timezone. */
export function businessToday(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(key:string)=>parts.find(p=>p.type===key)?.value??'';
 return `${part('year')}-${part('month')}-${part('day')}`;
}

/** A same-day registration follows earlier operations instead of backdating to noon. */
export function operationTimestamp(day:string,noon:number,now=Date.now()):number{
 return day===businessToday(new Date(now))?now:noon;
}
