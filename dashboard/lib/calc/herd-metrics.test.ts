import {expect,it} from 'vitest';
import {herdGain,dailyWeights} from '../../../src/shared/utils/herdMetrics';
const DAY=86400000;
it('does not infer growth from two different animals',()=>{
  expect(herdGain([{animalId:'a',timestamp:0,valor:100},{animalId:'b',timestamp:DAY,valor:400}]).dailyGain).toBeNull();
});
it('weights individual gain by observation days and retains weight loss',()=>{
  expect(herdGain([{animalId:'a',timestamp:0,valor:100},{animalId:'a',timestamp:10*DAY,valor:120},
    {animalId:'b',timestamp:0,valor:200},{animalId:'b',timestamp:20*DAY,valor:190}])).toEqual({dailyGain:10/30,animalDays:30,animals:2});
});
it('excludes conflicting same-time weights and invalid values',()=>{
  expect(herdGain([{animalId:'a',timestamp:0,valor:100},{animalId:'a',timestamp:0,valor:200},{animalId:'a',timestamp:DAY,valor:300}]).animals).toBe(0);
  expect(dailyWeights([{animalId:'a',timestamp:0,valor:NaN}])).toEqual([]);
});
