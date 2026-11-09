import {businessToday} from '../../lib/calc/business-date';
import {test,expect} from '@playwright/test';
test('admin navigates real home, cash and map, draws and persists a polygon',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('admin@test.invalid');await page.getByLabel('Contraseña',{exact:true}).fill('local-test-only');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Caja y compromisos'})).toBeVisible();
 await page.goto('/finanzas');await expect(page.getByRole('heading',{name:'Finanzas: caja y obligaciones',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Abrir caja / banco'}).click();await page.getByLabel('Nombre',{exact:true}).fill('Caja navegador');await page.getByLabel('Saldo inicial (ARS)',{exact:true}).fill('100');await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect(page.getByText('Caja navegador',{exact:true}).first()).toBeVisible();
 await page.goto('/mapa');const map=page.getByTestId('ganpro-map');await expect(map.locator('canvas')).toBeVisible();await page.waitForTimeout(2500);
 await page.getByRole('button',{name:'Dibujar potrero',exact:true}).click();const rect=await map.boundingBox();if(!rect)throw new Error('Map bounds unavailable');
 for(const [x,y]of [[.35,.35],[.55,.35],[.55,.55],[.35,.55]])await page.mouse.click(rect.x+rect.width*x,rect.y+rect.height*y);
 await page.getByLabel('Nombre del potrero',{exact:true}).fill('Navegador Norte');await page.getByRole('button',{name:'Cerrar y guardar polígono'}).click();await expect(page.getByRole('button').filter({hasText:'Navegador Norte'})).toBeVisible();
 await page.screenshot({path:'test-results/mapa.png',fullPage:true});await page.reload();await page.getByRole('button').filter({hasText:'Navegador Norte'}).click();await expect(page.getByText('Navegador Norte',{exact:true}).first()).toBeVisible();
 for(const name of ['Calles','Relieve','Satélite'])await page.getByRole('button',{name,exact:true}).click();
 const csv=await page.request.get(`/api/export/finanzas?mes=${businessToday().slice(0,7)}`);expect(csv.status()).toBe(200);expect(await csv.text()).toContain('Caja navegador');expect(errors).toEqual([]);
});
test('advisor sees data but cannot see editing controls',async({page})=>{
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('advisor@test.invalid');await page.getByLabel('Contraseña',{exact:true}).fill('local-test-only');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await expect(page.getByRole('heading',{name:'Caja y compromisos'})).toBeVisible();
 await page.goto('/finanzas');await expect(page.getByRole('button',{name:'Abrir caja / banco'})).toHaveCount(0);await page.goto('/mapa');await expect(page.getByRole('button',{name:'Dibujar potrero'})).toHaveCount(0);
});
