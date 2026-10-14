import test from 'node:test';
import assert from 'node:assert/strict';
import {activities} from './activities';
import {evidenceSources} from './evidenceSources';
test('12 source-checked cards have unique ids, steps, safety, and inspectable source records',()=>{
 const checked=activities.filter(a=>a.reviewStatus==='source-checked');assert.equal(checked.length,12);
 assert.equal(new Set(activities.map(a=>a.id)).size,activities.length);
 for(const a of checked){assert.ok(a.meta.nameEn);assert.ok(a.steps.length>=3);assert.ok(a.meta.safetyWarnings.length);assert.ok(a.meta.contraindications.length);assert.ok(a.meta.evidenceSourceIds.every(id=>evidenceSources.some(s=>s.id===id&&s.reviewStatus!=='unverified')));}
});
