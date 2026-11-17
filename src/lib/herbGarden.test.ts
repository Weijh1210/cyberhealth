import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,migrateData} from './store';
import {emptyJournal,restSuggestions} from './restJournal';
import {herbGarden,plantHerb,tendHerb} from './herbGarden';

test('planting and care work across a day boundary, ignore repeats and preserve legacy plants',()=>{
 const base=initialData(),first=new Date('2026-11-10T15:58:00Z'),next=new Date('2026-11-10T16:01:00Z');
 assert.equal(plantHerb(base,first),base);
 const legacy={...base,courtyard:{...base.courtyard,plants:{window:'2026-11-09T03:00:00Z'},leaf:'尖叶' as const,peel:true}};
 assert.equal(plantHerb(legacy,first),legacy);
 const watered=tendHerb(legacy,first,'water');
 assert.equal(herbGarden(watered,first).watered,1);
 assert.equal(tendHerb(watered,first,'water'),watered);
 assert.equal(tendHerb(watered,first,'press'),watered);
 const saved=migrateData(JSON.parse(JSON.stringify(watered)));
 const changedCity={...saved,courtyard:{...saved.courtyard,city:'vancouver' as const}};
 assert.equal(herbGarden(changedCity,next).canWater,true);
 const mature=tendHerb(changedCity,next,'water');
 assert.equal(herbGarden(mature,next).stage,3);
 assert.equal(tendHerb(mature,next,'water'),mature);
 const pressed=tendHerb(mature,next,'press');
 assert.equal(herbGarden(pressed,next).pressed,true);
 assert.deepEqual(pressed.courtyard,{...legacy.courtyard,city:'vancouver'});
 assert.equal(tendHerb(pressed,next,'press'),pressed);
});
test('hands get matching seated guidance while seated eyes and brain breaks remain untimed',()=>{
 const base=initialData(),suggest=(focus:'hands'|'eyes'|'brain')=>restSuggestions({...base,restJournal:{...emptyJournal(),focus}}).options;
 assert.deepEqual(suggest('hands').filter(x=>'activity' in x).map(x=>x.id).sort(),['desk-hand-open','desk-palm-turn']);
 for(const focus of ['eyes','brain'] as const)assert.ok(suggest(focus).every(x=>!('activity' in x)));
});
