import test from 'node:test';
import assert from 'node:assert/strict';
import {activityById} from './activities';
import {evidenceSources,sourcesFor} from './evidenceSources';
import {plannedActions} from './microActivities';
import {candidates,matches,recommend} from './recommend';
import {grantCompletion,initialData,migrateData} from './store';
import {companionDue,nextReminderAt} from './companion';
import type {Feedback,Session} from './types';

test('library neck and office shoulder needs select the two reviewed 30-second cards',()=>{
 const profile={...initialData().profile,quiet:true,smallMovement:true};
 const library=recommend({scene:'library',duration:30,mobility:'seated',bodyNeed:'neck'},[],[],'season',[],profile);
 const office=recommend({scene:'office',duration:30,mobility:'seated',bodyNeed:'shoulders'},[],[],'season',[],profile);
 assert.equal(library?.id,'chin-tuck');assert.equal(office?.id,'scapular-squeeze');
 assert.equal(library?.meta.holdSeconds,3);assert.equal(office?.meta.repetitions,5);
 assert.equal(sourcesFor('chin-tuck').length,2);assert.equal(evidenceSources.find(s=>s.id==='who-sedentary-2020')?.scope,'general-context');
});
test('scene, space, time, quiet and discomfort are hard filters',()=>{
 const profile={...initialData().profile,quiet:true,smallMovement:true};
 assert.equal(recommend({scene:'home',duration:180,mobility:'spacious',bodyNeed:'fullBody'},[],[],'season',[],profile)?.id,'room-loop');
 assert.equal(recommend({scene:'home',duration:180,mobility:'spacious',bodyNeed:'fullBody'},[],[],'green',[],profile)?.id,'room-loop');
 const transit=candidates({scene:'transit',duration:60,mobility:'seated'},profile);
 assert.ok(transit.every(a=>a.meta.level==='L1'&&a.meta.spaceRequired==='seat'&&a.meta.noiseLevel==='silent'));
 assert.ok(!transit.some(a=>a.id==='chin-tuck'));
 assert.equal(matches(activityById('room-loop')!,{scene:'home',duration:180,mobility:'seated'},profile),false);
 assert.equal(matches(activityById('color-walk')!,{scene:'office',duration:600,mobility:'standing'},profile),false);
 const feedback:Feedback[]=[{activityId:'chin-tuck',value:'uncomfortable',at:new Date().toISOString()}];
 assert.equal(candidates({scene:'library',duration:30,mobility:'seated',bodyNeed:'neck'},profile,feedback).some(a=>a.id==='chin-tuck'),false);
 assert.notEqual(recommend({scene:'library',duration:30,mobility:'seated',bodyNeed:'neck'},feedback,[],'season',[],profile)?.id,'chin-tuck');
});
test('unreviewed planned motions never enter automatic recommendations',()=>{
 assert.equal(plannedActions.length,22);
 assert.ok(plannedActions.every(a=>a.status==='needs-review'));
 assert.ok(!candidates({scene:'home',duration:1200,mobility:'spacious'}).some(a=>plannedActions.some(p=>p.id===a.id)));
});
test('reviewed 30-second action cannot reward before timer ready or twice',()=>{
 const d=initialData();const session:Session={id:'checked-001',activityId:'chin-tuck',preference:{scene:'library',duration:30,mobility:'seated'},startedAt:new Date().toISOString(),status:'paused',deadlineAt:null,remainingSeconds:30};
 const start={...d,sessions:[session]};assert.equal(grantCompletion(start,session.id,new Date()).energy,0);
 const ready={...start,sessions:[{...session,status:'ready' as const,remainingSeconds:0}]};
 const once=grantCompletion(ready,session.id,new Date());const twice=grantCompletion(once,session.id,new Date());
 assert.equal(once.energy,10);assert.equal(twice.energy,10);
});
test('existing records and new scene choices survive migration',()=>{
 const d=initialData();const migrated=migrateData({...d,currentScene:'classroom',currentNeed:'neck',preference:{scene:'classroom',duration:30,mobility:'seated'},sessions:[{id:'old',activityId:'window-pause',preference:d.preference,startedAt:new Date().toISOString(),status:'completed',deadlineAt:null,remainingSeconds:0,reward:10}],energy:10});
 assert.equal(migrated.currentScene,'classroom');assert.equal(migrated.currentNeed,'neck');assert.equal(migrated.sessions.length,1);assert.equal(migrated.energy,10);
});
test('paused or quiet companion does not fire; next reminder respects hours',()=>{
 const d=initialData();const time=new Date(2026,9,13,10).getTime();const r={...d.reminder,startHour:9,endHour:21,intervalMinutes:45};const next=nextReminderAt(time,r);
 assert.equal(next-time,45*60000);
 const session={id:'companion',startedAt:new Date(time).toISOString(),status:'active' as const,currentScene:'library' as const,nextReminderAt:next};
 assert.equal(companionDue(session,r,next),true);assert.equal(companionDue({...session,status:'paused'},r,next),false);assert.equal(companionDue(session,{...r,quiet:true},next),false);
});
