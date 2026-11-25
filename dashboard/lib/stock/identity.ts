export interface AnimalIdentity{id:string;id_caravana:string;rfid:string|null;visual_pendiente?:boolean}
export function pendingVisual(a:AnimalIdentity):boolean{return Boolean(a.visual_pendiente)||/^SIN-CARAVANA-[a-z0-9-]{12,64}$/i.test(a.id_caravana)||Boolean(a.rfid&&(a.id_caravana===`RFID-${a.rfid}`||a.id_caravana===a.rfid));}
export function animalLabel(a:AnimalIdentity):string{return pendingVisual(a)?`Sin caravana · ${a.id.slice(-8).toUpperCase()}`:a.id_caravana;}
