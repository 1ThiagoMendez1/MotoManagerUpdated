import test from 'node:test';
import assert from 'node:assert/strict';
import {partsDatePreset,validatePartsProfitFilters,partCostLabel,type PartProfitRow} from '../src/lib/parts-profitability';
import {isWorkshopChristmasSeason} from '../src/lib/workshop-christmas';
const filters={from:'2026-11-01',to:'2026-11-30',query:' Filtro ',sort:'profit' as const,includeEstimates:false,page:1};
test('financial date presets use Colombia calendar days including month/year boundaries',()=>{
  assert.deepEqual(partsDatePreset('month',new Date('2027-01-01T04:00:00Z')),{from:'2026-12-01',to:'2026-12-31'});
  assert.deepEqual(partsDatePreset('year',new Date('2026-11-11T19:00:00Z')),{from:'2026-01-01',to:'2026-11-11'});
  assert.deepEqual(partsDatePreset('30days',new Date('2026-11-11T19:00:00Z')),{from:'2026-10-13',to:'2026-11-11'});
  assert.equal(validatePartsProfitFilters(filters).query,'Filtro');
  for(const input of [{...filters,from:'2026-12-01'},{...filters,to:'2027-12-31'},{...filters,page:0},{...filters,query:'x'.repeat(101)}])assert.throws(()=>validatePartsProfitFilters(input));
});
test('cost coverage labels distinguish missing, estimated and partial values',()=>{
  const row={units:10,costed_units:10,estimated_units:0} as PartProfitRow;
  assert.equal(partCostLabel(row),'Costo registrado');
  assert.equal(partCostLabel({...row,estimated_units:1}),'Incluye estimación');
  assert.equal(partCostLabel({...row,costed_units:2}),'Costo parcial');
  assert.equal(partCostLabel({...row,costed_units:0}),'Sin costo registrado');
  assert.equal(partCostLabel({...row,costed_units:0,estimated_units:10}),'Histórico estimado');
  assert.equal(partCostLabel({...row,units:0}),'Sin ventas');
});
test('workshop Christmas season starts November 1 and ends January 6 in Colombia',()=>{
  assert.equal(isWorkshopChristmasSeason(new Date('2026-11-01T04:59:00Z')),false);
  assert.equal(isWorkshopChristmasSeason(new Date('2026-11-01T05:00:00Z')),true);
  assert.equal(isWorkshopChristmasSeason(new Date('2027-01-07T04:59:00Z')),true);
  assert.equal(isWorkshopChristmasSeason(new Date('2027-01-07T05:00:00Z')),false);
  assert.equal(isWorkshopChristmasSeason(new Date('2027-05-15T15:00:00Z')),false);
});
