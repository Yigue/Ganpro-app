import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {ADMIN,browserDatabase} from './database';
const {pool,asRole,command,entry}=browserDatabase();
import {mesKey} from '../../lib/calc/fechas';
import {fmtARS} from '../../lib/calc/format';
import {projectTreasury,type TreasuryInput} from '../../lib/calc/treasury';
const DAY=86400000;
test.afterAll(()=>pool.end());
async function login(page:Page){
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@test.invalid');
 await page.getByLabel('Contraseña',{exact:true}).fill('local-test-only');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Caja y compromisos'})).toBeVisible();
}
test('economic analysis displays commitments from real cash and keeps currency navigation in analysis',async({page})=>{
 const now=Date.now()-1000;
 await command('finance.account',{nombre:'Caja tesorería '+randomUUID().slice(0,8),saldo_inicial:'100000',fecha:now});
 await command('finance.document',{tipo:'INGRESO',categoria:'OTRO',monto:'50000',fecha:now,vencimiento:now,contraparte:'Cliente prueba'});
 await command('finance.document',{tipo:'GASTO',categoria:'OTRO',monto:'200000',fecha:now,vencimiento:now,contraparte:'Proveedor prueba'});
 const snapshot=await asRole(ADMIN,async c=>(await c.query<{data:TreasuryInput}>('SELECT ganpro_treasury_snapshot($1) data',[Date.now()])).rows[0].data);
 const expected=projectTreasury(snapshot,[mesKey(Date.now())],Date.now())[0];
 await login(page);await page.goto('/finanzas/analisis');
 const section=page.getByRole('heading',{name:'Tesorería comprometida',exact:true}).locator('..').locator('..').locator('..');
 await expect(section.locator('thead th').filter({hasText:/^Pagos$/})).toBeVisible();
 await expect(section.getByRole('row').nth(1).getByRole('cell').last()).toHaveText(fmtARS(Number(expected.acumulado)));
 await page.getByRole('link',{name:'Dólares',exact:true}).click();
 await expect(page).toHaveURL(/\/finanzas\/analisis\?moneda=usd/);
 await expect(page.getByRole('heading',{name:'Análisis económico',exact:true})).toBeVisible();
});
test('reproduction counts actual weaning in the service and ignores purchased calves',async({page})=>{
 const suffix=randomUUID().slice(0,8).toUpperCase(),bull='BULL-'+suffix,mother='MOTHER-'+suffix,calf='CALF-'+suffix;
 const start=Date.now()-600*DAY;
 await entry([bull],{sexo:'M',categoria:'Toro',lote_destino_id:'l1',fecha:start-DAY});
 await entry([mother],{sexo:'H',categoria:'Vaca',lote_destino_id:'l1',fecha:start-DAY});
 const service=await command('repro.service',{temporada:'Cohorte navegador '+suffix,lote_id:'l1',toros:[bull],vientres:1,fecha_entrada:start});
 const motherId=(await pool.query('SELECT id FROM animals WHERE id_caravana=$1',[mother])).rows[0].id;
 const cycle=await command('repro.cycle',{madre_id:motherId,servicio_id:service.id,fecha:start});
 await command('repro.stage',{id:cycle.id,etapa:'TACTO',resultado:'PRENADA',fecha:start+90*DAY});
 await command('repro.stage',{id:cycle.id,etapa:'PARTO',fecha:start+280*DAY,caravana:calf,sexo:'H',peso:35});
 await command('repro.stage',{id:cycle.id,etapa:'DESTETE',fecha:start+560*DAY,peso:120});
 await entry(['BOUGHT-'+suffix],{sexo:'H',categoria:'Ternera',kg:150,lote_destino_id:'l1',fecha:Date.now()-DAY});
 await login(page);await page.goto('/reproduccion');
 const section=page.getByRole('heading',{name:'Resultados por servicio',exact:true}).locator('..').locator('..').locator('..');
 const row=section.getByRole('row').filter({hasText:'Cohorte navegador '+suffix});
 await expect(row.getByRole('cell').nth(4)).toHaveText('1');
 await expect(row.getByRole('cell').nth(5)).toHaveText('120');
 await expect(row.getByRole('cell').nth(6)).toHaveText('100,0 %');
});
