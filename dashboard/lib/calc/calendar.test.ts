import {expect,it} from 'vitest';
import {calendarDays,calendarMove,eventDay} from './calendar';
import {animalLabel,pendingVisual} from '../stock/identity';
import {readingList} from '../stock/intake';
it('uses Monday weeks, complete months and safe month navigation',()=>{
 expect(calendarDays('2026-11-11','semana')).toEqual(['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15']);
 expect(calendarDays('2026-11-11','mes')).toHaveLength(42);expect(calendarMove('2026-01-31','mes',1)).toBe('2026-02-01');expect(calendarDays('2026-11-11','dia')).toEqual(['2026-11-11']);
 expect(eventDay(Date.parse('2026-11-12T01:00:00Z'))).toBe('2026-11-11');
});
it('shows a useful reference for pending animals and rejects duplicate electronic reads',()=>{
 const a={id:'abcdef123456',id_caravana:'SIN-CARAVANA-abcdef123456',rfid:null};expect(pendingVisual(a)).toBe(true);expect(animalLabel(a)).toContain('Sin caravana');
 const r={rfid:'982000000000001',captured_at:Date.now()};expect(readingList.safeParse([r,r]).success).toBe(false);
});

it('registers todays operations after animals added this afternoon, preserving historical dates',async()=>{
 const {operationTimestamp}=await import('./business-date');const noon=Date.parse('2026-11-11T12:00:00-03:00'),afternoon=Date.parse('2026-11-11T16:00:00-03:00');
 expect(operationTimestamp('2026-11-11',noon,afternoon)).toBe(afternoon);
 expect(operationTimestamp('2026-11-10',noon-86400000,afternoon)).toBe(noon-86400000);
 // 01:00 UTC still belongs to the previous Argentine business day.
 expect(operationTimestamp('2026-11-11',noon,Date.parse('2026-11-12T01:00:00Z'))).toBe(Date.parse('2026-11-12T01:00:00Z'));
});
