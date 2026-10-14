import test from 'node:test';
import assert from 'node:assert/strict';
import {currentSolarTerm,solarTerms2026} from './seasonal';
test('24 verified 2026 date-level themes change on Beijing calendar day, unsupported years fall back',()=>{
 assert.equal(solarTerms2026.length,24);assert.equal(currentSolarTerm(new Date('2026-10-15T00:00:00Z'))?.name,'寒露');assert.equal(currentSolarTerm(new Date('2026-10-22T15:59:00Z'))?.name,'寒露');assert.equal(currentSolarTerm(new Date('2026-10-22T16:00:00Z'))?.name,'霜降');assert.equal(currentSolarTerm(new Date('2027-01-01')),null);
});
