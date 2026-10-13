import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,migrateData,grantCompletion} from './store';
import {nextReminderAt,companionDue} from './companion';
import {acceptLocalInvite,beginLocalRestInvite,contributeLocal,createLocalGarden,createLocalInvite,displayRestStatus,leaveLocalGarden,respondLocalRestInvite,sendLocalRestInvite} from './garden';
import {recommend,matches} from './recommend';
import type {Session} from './types';

test('v1 records and reward survive the v2 migration',()=>{
 const base=initialData();const old={schemaVersion:1,preference:{scene:'office',duration:180,mobility:'standing'},sessions:[{id:'legacy',activityId:'tea-pause',preference:{scene:'office',duration:180,mobility:'standing'},startedAt:'2026-10-01T08:00:00.000Z',status:'completed',deadlineAt:null,remainingSeconds:0,reward:10}],feedback:[],energy:10,petName:'阿竹',reminder:base.reminder};
 const migrated=migrateData(old);
 assert.equal(migrated.schemaVersion,2);assert.equal(migrated.sessions.length,1);assert.equal(migrated.energy,10);assert.equal(migrated.petName,'阿竹');assert.equal(migrated.currentScene,'office');assert.equal(migrated.profile.onboardingComplete,true);
 assert.equal(migrateData('{broken').sessions.length,0);
});
test('companion schedules within hours and never treats elapsed page time as activity',()=>{
 const r={...initialData().reminder,startHour:9,endHour:21,intervalMinutes:60};
 const evening=new Date(2026,9,13,20,30).getTime();const next=nextReminderAt(evening,r);
 assert.equal(new Date(next).getHours(),9);assert.equal(new Date(next).getDate(),14);
 const session={id:'c',startedAt:new Date(evening).toISOString(),status:'active' as const,currentScene:'office' as const,nextReminderAt:next};
 assert.equal(companionDue(session,r,evening),false);assert.equal(companionDue(session,r,next),true);assert.equal(companionDue({...session,status:'paused'},r,next),false);assert.equal(companionDue(session,{...r,quiet:true},next),false);
});
test('focus preference cannot override scene or mobility',()=>{
 const d=initialData();const profile={...d.profile,focusAreas:['eyes' as const]};
 const p={scene:'library' as const,duration:600 as const,mobility:'seated' as const};
 const activity=recommend(p,[],[],'green',[],profile)!;
 assert.ok(matches(activity,p,profile));assert.equal(activity.requiresOutdoor,false);assert.equal(activity.requiresStanding,false);
});
test('demo garden enforces invitation, expiry, membership, and one contribution per session',()=>{
 const at=Date.UTC(2026,9,13,9);let g=createLocalInvite(createLocalGarden('甲',at),at);
 assert.equal(acceptLocalInvite(g,'wrong','乙',at),g);
 assert.equal(acceptLocalInvite(g,g.invite!.token,'乙',at+8*86400000),g);
 g=acceptLocalInvite(g,g.invite!.token,'乙',at+1000);assert.equal(g.members.length,2);
 const first=contributeLocal(g,'session-001','window-pause',undefined,at+2000);
 const duplicate=contributeLocal(first,'session-001','window-pause',undefined,at+3000);
 assert.equal(duplicate.contributions.length,1);
 const before=leaveLocalGarden(duplicate);assert.equal(before?.members.length,1);assert.equal(before?.contributions.length,0);
});
test('60-second now invitation expires; later is asynchronous',()=>{
 const at=Date.UTC(2026,9,13,9);let g=createLocalInvite(createLocalGarden('甲',at),at);g=acceptLocalInvite(g,g.invite!.token,'乙',at+1000);g={...g,actorId:'self'};
 g=sendLocalRestInvite(g,at+2000);const id=g.restInvites[0].id;g={...g,actorId:'friend'};
 assert.equal(displayRestStatus(g.restInvites[0],at+11*60000),'expired');
 assert.equal(respondLocalRestInvite(g,id,'now',at+11*60000).restInvites[0].status,'pending');
 g=respondLocalRestInvite(g,id,'later',at+3000);assert.equal(g.restInvites[0].status,'later');
 g=beginLocalRestInvite(g,id,at+11*60000);const tooEarly=contributeLocal(g,'session-002','window-pause',id,at+11*60000+1000);assert.equal(tooEarly.contributions.length,0);g=contributeLocal(g,'session-002','window-pause',id,at+12*60000);assert.equal(g.restInvites[0].status,'participated');
});
test('personal reward remains idempotent after migration',()=>{
 const d=initialData();const session:Session={id:'session-003',activityId:'window-pause',preference:d.preference,startedAt:new Date().toISOString(),status:'ready',deadlineAt:null,remainingSeconds:0};
 const once=grantCompletion({...d,sessions:[session]},session.id,new Date());const twice=grantCompletion(once,session.id,new Date());
 assert.equal(once.energy,10);assert.equal(twice.energy,10);
});
