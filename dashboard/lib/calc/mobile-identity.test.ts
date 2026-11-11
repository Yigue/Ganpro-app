import {expect,it} from 'vitest';
import {selectIdentifiedAnimal} from '../../../src/shared/utils/animalIdentity';
it('selects the current animal even if the sold record is returned first',()=>{
 const sold={id:'old',estado:'VENDIDO'},active={id:'new',estado:'ACTIVO'};
 expect(selectIdentifiedAnimal([sold,active])).toBe(active);
});
it('refuses an ambiguous active or entirely historical visual identity',()=>{
 expect(()=>selectIdentifiedAnimal([{estado:'ACTIVO'},{estado:'ACTIVO'}])).toThrow('varios registros');
 expect(()=>selectIdentifiedAnimal([{estado:'VENDIDO'},{estado:'MUERTO'}])).toThrow('varios registros');
});
it('preserves a unique historical result and distinguishes no match',()=>{
 const sold={estado:'VENDIDO'};expect(selectIdentifiedAnimal([sold])).toBe(sold);expect(selectIdentifiedAnimal([])).toBeNull();
});
