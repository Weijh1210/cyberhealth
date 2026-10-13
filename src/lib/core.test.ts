import test from 'node:test';
import assert from 'node:assert/strict';
import {activities} from './activities';
import {candidates,matches,recommend} from './recommend';
import {dailyTheme,localDay} from './date';
import {grantCompletion,initialData} from './store';
import type {Session} from './types';
test('hard filters respect scene, duration and mobility',()=>{
  const p={scene:'library' as const,duration:60 as const,mobility:'seated' as const};
  const list=candidates(p);assert.ok(list.length>0);
  assert.ok(list.every(a=>a.sceneTags.includes('library')&&a.durationSeconds<=60&&!a.requiresStanding&&!a.requiresOutdoor&&!a.requiresAudio));
  assert.equal(matches(activities.find(a=>a.id==='color-walk')!,p),false);
  assert.equal(candidates({scene:'outdoor',duration:60,mobility:'seated'}).length,0);
  assert.equal(recommend({scene:'outdoor',duration:60,mobility:'seated'},[],[],'green'),null);
});
test('recommendation never overrides hard constraints and avoids excluded item',()=>{
  const p={scene:'office' as const,duration:600 as const,mobility:'outside' as const};
  const first=recommend(p,[],[],'green')!;
  const second=recommend(p,[],[],'green',[first.id])!;
  assert.notEqual(first.id,second.id);assert.ok(matches(first,p));assert.ok(matches(second,p));
});
test('completion awards only once per session',()=>{
  const d=initialData();const session:Session={id:'s1',activityId:'window-pause',preference:d.preference,startedAt:new Date().toISOString(),status:'ready',deadlineAt:null,remainingSeconds:0};
  const first=grantCompletion({...d,sessions:[session]},'s1',new Date());const second=grantCompletion(first,'s1',new Date());
  assert.equal(first.energy,10);assert.equal(second.energy,10);assert.equal(second.sessions[0].reward,10);
});
test('daily theme stays stable within local day',()=>{
  const a=new Date(2026,9,13,1),b=new Date(2026,9,13,23),c=new Date(2026,9,14,1);
  assert.equal(localDay(a),localDay(b));assert.deepEqual(dailyTheme(a),dailyTheme(b));assert.notEqual(localDay(a),localDay(c));
});
