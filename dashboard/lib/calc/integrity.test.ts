import {expect,it} from 'vitest';
import {historicoCabezas} from './stock';
import type {Animal,Evento} from '../db/types';
const animal:Animal={id:'a',id_caravana:'A',rfid:null,sexo:'H',categoria:'Vaca',raza:null,fecha_nacimiento:1,peso_actual:300,estado:'ACTIVO',lote_id:null,potrero_id:null,synced_at:null,created_at:100,updated_at:200};
const event=(tipo:string,timestamp:number,valor:number|null=null):Evento=>({id:`${tipo}-${timestamp}`,animal_id:'a',tipo,timestamp,valor,notas:null,lote_destino_id:null,dte_numero:null,created_at:timestamp,updated_at:timestamp});
it('does not count an adult purchase from its birth date',()=>{
 expect(historicoCabezas([animal],[event('COMPRA',100)],[{key:'before',fin:50},{key:'after',fin:150}])).toEqual([{mes:'before'},{mes:'after',Vaca:1}]);
});
it('reconstructs a sale and its later annulment without erasing the earlier exit',()=>{
 expect(historicoCabezas([animal],[event('COMPRA',100),event('VENTA',120),event('ANULACION',160,1)],[{key:'sold',fin:140},{key:'restored',fin:180}])).toEqual([{mes:'sold'},{mes:'restored',Vaca:1}]);
});
