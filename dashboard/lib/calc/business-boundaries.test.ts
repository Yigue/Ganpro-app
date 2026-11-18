import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {fechaInicioMs,fechaMs,fechaOperacionMs,fechaVencimientoMs} from '@/lib/db/actions';
import {commandContext} from '@/lib/commands/context';
it('includes the full Argentine day for expiry, due dates and bank statement ranges',()=>{
 expect(new Date(fechaInicioMs('2026-11-18')).toISOString()).toBe('2026-11-18T03:00:00.000Z');
 expect(new Date(fechaVencimientoMs('2026-11-18')).toISOString()).toBe('2026-11-19T02:59:59.999Z');
 expect(fechaVencimientoMs('2026-11-18')-fechaInicioMs('2026-11-18')).toBe(86400000-1);
});
it('rejects normalized invalid dates instead of moving records into another month',()=>{
 expect(()=>fechaMs('2026-02-30')).toThrow();
 expect(()=>fechaInicioMs('invalid')).toThrow();
 expect(()=>fechaVencimientoMs('2026-13-01')).toThrow();
});
it('keeps the same effective timestamp across retries, including after midnight',()=>{
 const captured=Date.parse('2026-11-18T23:50:00-03:00');
 const context={command:'grazing.start',key:'test',requestId:'test',operationAt:captured};
 expect(commandContext.run(context,()=>fechaOperacionMs('2026-11-18'))).toBe(captured);
 expect(commandContext.run(context,()=>fechaOperacionMs('2026-11-18'))).toBe(captured);
});
