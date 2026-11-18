import 'server-only';
import {selectAll} from './client';

/** Avoid loading every modern treatment's recipient list for each animal page. */
export async function getTreatmentHistory(animalId:string){
 const [fixed,legacy]=await Promise.all([
  selectAll('operation_logs',{
   columns:'*,aplicacion_animales!inner(animal_id)',
   filter:q=>q.eq('receptores_fijados',true).eq('aplicacion_animales.animal_id',animalId),
  }),
  selectAll('operation_logs',{
   columns:'*,aplicacion_animales(animal_id)',filter:q=>q.eq('receptores_fijados',false),
  }),
 ]);
 return [...fixed,...legacy];
}
