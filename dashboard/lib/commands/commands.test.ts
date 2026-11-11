import {afterEach,describe,expect,it,vi} from 'vitest';
import {z} from 'zod';
import {databaseError,InputError,publicFailure,DataError} from './errors';
import {executeCommand} from './execute';
import {requestJson} from './request-json';
import {businessToday} from '../calc/business-date';
import {csvFile} from '../calc/csv-export';
import {dolarEn} from '../calc/finanzas';
afterEach(()=>vi.restoreAllMocks());
describe('public command boundary',()=>{
 it('redacts database messages and forged public messages',()=>{
  for(const message of ['postgres://secret:password@private','GANPRO_CONFLICT SQL DETAIL secret','syntax error token'])expect(JSON.stringify(publicFailure(databaseError({code:'XX000',message})))).not.toContain(message);
  expect(publicFailure(databaseError({message:'GANPRO_CONFLICT'})).code).toBe('CONFLICT');
  expect(publicFailure(new InputError({nombre:['Ingresá un nombre']})).fieldErrors).toEqual({nombre:['Ingresá un nombre']});
 });
 it('does not fail a committed command when an observer fails',async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
  const state=await executeCommand({name:'test',key:'key',handle:async()=> 'Guardado',observers:[async()=>{throw new Error('secret');}]});
  expect(state.ok).toBe(true);expect(log.mock.calls.map(c=>JSON.parse(String(c[0])).type)).toEqual(['started','succeeded']);
 });
 it('returns one reference and safe operational metadata on dependency failure',async()=>{
  vi.spyOn(console,'info').mockImplementation(()=>{});const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const state=await executeCommand({name:'test',key:'key',handle:async()=>{throw new DataError('NETWORK');}});
  expect(state.code).toBe('SERVICE_UNAVAILABLE');expect(state.requestId).toMatch(/^[\da-f-]{36}$/);expect(JSON.stringify(log.mock.calls)).not.toContain('password');
 });
 it('preserves Next navigation control flow',async()=>{
  vi.spyOn(console,'info').mockImplementation(()=>{});const redirect={digest:'NEXT_REDIRECT;replace;/login;307;'};
  await expect(executeCommand({name:'test',key:'key',handle:async()=>{throw redirect;}})).rejects.toBe(redirect);
 });
 it('treats malformed API output as an internal failure',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({secret:'provider'}))));
  await expect(requestJson('https://test.invalid',z.object({ok:z.boolean()}))).rejects.toMatchObject({providerCode:'INVALID_OUTPUT'});vi.unstubAllGlobals();
 });
 it('bounds network waits without retrying a write',async()=>{
  const fetcher=vi.fn((_url:unknown,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new Error('timeout')))));
  vi.stubGlobal('fetch',fetcher);await expect(requestJson('https://test.invalid',z.object({}),{method:'POST'},5)).rejects.toMatchObject({providerCode:'NETWORK'});expect(fetcher).toHaveBeenCalledTimes(1);vi.unstubAllGlobals();
 });
 it('uses the Argentina business date and protects spreadsheet formulas',()=>{
  expect(businessToday(new Date('2026-11-09T01:00:00Z'))).toBe('2026-11-08');
  expect(csvFile([['=IMPORTDATA("secret")',-10.25]])).toContain('"\'=IMPORTDATA(""secret"")","-10.25"');
  expect(dolarEn([{fecha:100,dolar_oficial:1000}] as Parameters<typeof dolarEn>[0],99)).toBeNull();
 });
});
