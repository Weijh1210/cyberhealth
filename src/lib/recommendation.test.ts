import test from 'node:test';
import assert from 'node:assert/strict';
import {activities,activityById} from './activities';
import {candidates,matches,recommend,recommendationScore} from './recommend';
import {initialData} from './store';
test('library seated 60s is silent, reviewed and matches all hard conditions',()=>{
 const p={scene:'library' as const,mobility:'seated' as const,duration:60 as const};const pool=candidates(p);assert.ok(pool.length>=2);assert.ok(pool.every(a=>a.reviewStatus==='source-checked'&&!a.requiresStanding&&a.durationSeconds<=60));
 assert.equal(matches(activityById('window-pause')!,p),false);
 assert.equal(candidates({...p,scene:'outdoor'}).length,0);
 assert.equal(recommend(p,[],[],'',activities.map(a=>a.id)),null);
});
test('equipment, dislikes and spacious walking constraints never relaxed',()=>{
 const d=initialData();const p={scene:'home' as const,mobility:'standing' as const,duration:180 as const};
 assert.equal(matches(activityById('sit-to-stand')!,p),false);assert.equal(matches(activityById('sit-to-stand')!,{...p,availableEquipment:['stable-chair']}),true);
 assert.equal(matches(activityById('side-walk')!,{...p,availableEquipment:['wall']}),false);
 assert.equal(candidates(p,d.profile,[{activityId:'chin-tuck',value:'unsuitable',at:'now'}]).some(a=>a.id==='chin-tuck'),false);
});
test('weighted scoring rewards fit and diversity only inside eligible pool',()=>{
 const p={scene:'office' as const,mobility:'seated' as const,duration:30 as const,bodyNeed:'neck' as const};const a=activityById('chin-tuck')!;
 assert.ok(recommendationScore(a,p,[{activityId:a.id,value:'liked',at:'now'}],[])>recommendationScore(a,p,[],[]));assert.equal(recommend(p,[],[],'')?.id,a.id);
});
