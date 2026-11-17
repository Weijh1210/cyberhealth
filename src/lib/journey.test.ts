import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,migrateData,grantCompletion} from './store';
import {candidates,matches} from './recommend';
import {conditionsForPreset} from './breakConditions';
import {activityById} from './activities';
import type {Session} from './types';

test('office presets use the existing cards within posture, space and support limits',()=>{
 const data=initialData();
 const desk=conditionsForPreset('desk',data.preference);
 const seated=candidates(desk,data.profile);
 assert.ok(['chin-tuck','scapular-squeeze','desk-hand-open','desk-palm-turn','desk-heel-toe','seated-shoulder-roll'].every(id=>seated.some(card=>card.id===id)));
 assert.ok(seated.every(card=>card.durationSeconds<=30&&card.meta.posture==='seated'&&card.meta.spaceRequired==='seat'&&!card.meta.equipmentRequired.length));
 const meeting=conditionsForPreset('meeting',desk);
 assert.ok(candidates(meeting,data.profile).every(card=>card.meta.posture==='seated'));
 assert.ok(candidates({...meeting,posture:'any'},data.profile).some(card=>card.id==='side-bend'));
 const away=conditionsForPreset('away',desk);
 assert.deepEqual(candidates(away,data.profile).map(card=>card.id),['side-bend']);
 assert.ok(!candidates({...away,space:'spacious'},data.profile).some(card=>card.id==='side-walk'));
 assert.ok(candidates({...away,space:'spacious',availableEquipment:['wall']},data.profile).some(card=>card.id==='side-walk'));
 assert.deepEqual(candidates({...away,space:'seat'},data.profile),[]);
});

test('traditional guide needs complete provenance and explicit review to enter the same filters',()=>{
 const activity=activityById('chin-tuck')!;
 const data=initialData();
 const guide={form:'single' as const,adaptation:'adapted' as const,source:'Fixture',applicableConditions:'Fixture',stopGuidance:'Fixture'};
 assert.equal(matches({...activity,content:{type:'traditional',guide:{...guide,review:null}}},data.preference),false);
 const reviewed={...activity,content:{type:'traditional' as const,guide:{...guide,review:{reviewer:'Fixture',reviewedAt:'2026-11-11',record:'Fixture'}}}};
 assert.equal(matches(reviewed,data.preference),true);
 assert.equal(matches(reviewed,{...data.preference,posture:'upright'}),false);
});

test('confirmation advances three distinct local days and migration preserves visits and old history',()=>{
 const initial=initialData();
 const session=(id:string,source:Session['source']='manual'):Session=>({id,activityId:'chin-tuck',preference:initial.preference,
  startedAt:'2026-11-08T00:00:00.000Z',status:'ready',source,deadlineAt:null,remainingSeconds:0});
 const {journey:legacyJourney,...legacy}=initial;
 assert.deepEqual(legacyJourney,[]);
 let data=migrateData({...legacy,sessions:[{...session('legacy'),status:'completed'},session('one'),session('same-day'),session('two','reminder'),session('three'),session('after')]});
 assert.equal(data.sessions[0].status,'completed');
 assert.deepEqual(data.journey,[]);
 const first=new Date(2026,10,9,23,59);
 data=grantCompletion(data,'one',first);
 assert.equal(grantCompletion(data,'one',new Date(2026,10,10)),data);
 data=grantCompletion(data,'same-day',first);
 assert.equal(data.journey.length,1);
 data=migrateData(JSON.parse(JSON.stringify(data)));
 data=grantCompletion(data,'two',new Date(2026,10,10,0,1));
 data=grantCompletion(data,'three',new Date(2026,10,16));
 data=grantCompletion(data,'after',new Date(2026,10,17));
 assert.deepEqual(data.journey.map(visit=>visit.sessionId),['one','two','three']);
 assert.equal(data.sessions.filter(item=>item.status==='completed').length,6);
});
