import test from 'node:test';
import assert from 'node:assert/strict';
import {completeRest,initialData,migrateData} from './store';
import {cityMoment,drawDaily,dueLife,emptyJournal,parseWeather,plantState,restSuggestions} from './restJournal';
import {restSeason} from './restSeason';
import type {Session} from './types';

test('migration preserves original preferences, reminder, sessions, collections and old visits',()=>{
 const base=initialData();
 const session:Session={id:'one',activityId:'chin-tuck',preference:base.preference,startedAt:'2026-01-01T01:00:00Z',status:'completed',deadlineAt:null,remainingSeconds:0};
 const raw={...base,preference:{...base.preference,duration:300 as const,mobility:'spacious' as const},reminder:{...base.reminder,enabled:true,intervalMinutes:45},
  sessions:[session],journey:[{day:'2026-01-01',sessionId:'one'}],courtyard:{...base.courtyard,peel:true,leaf:'宽叶' as const,seeds:2,plants:{window:'2026-01-01T01:01:00Z'}}};
 const migrated=migrateData(JSON.parse(JSON.stringify(raw)));
 assert.equal(migrated.preference.duration,300);
 assert.equal(migrated.preference.mobility,'spacious');
 assert.equal(migrated.reminder.intervalMinutes,45);
 assert.deepEqual(migrated.sessions,[session]);
 assert.deepEqual(migrated.journey,raw.journey);
 assert.deepEqual(migrated.courtyard,raw.courtyard);
 assert.deepEqual(plantState(migrated),{owned:true,plantedAt:'2026-01-01T01:01:00Z',peel:true});
});

test('only a ready session unlocks one specimen and duplicate confirmation does not write',()=>{
 const base=initialData(),now=new Date('2026-11-10T03:00:00Z');
 const session:Session={id:'one',activityId:'chin-tuck',preference:base.preference,startedAt:now.toISOString(),status:'running',deadlineAt:+now+30000,remainingSeconds:30};
 const running={...base,sessions:[session]};
 assert.equal(completeRest(running,'one',now,''),running);
 const ready={...base,sessions:[{...session,status:'ready' as const,deadlineAt:null,remainingSeconds:0}]};
 const complete=completeRest(ready,'one',now,'');
 assert.equal(complete.sessions[0].status,'completed');
 assert.equal(plantState(complete).owned,true);
 assert.equal(completeRest(complete,'one',now,''),complete);
 assert.equal(complete.courtyard.seeds,0);
});

test('published solar boundary, city light and weather are independent',()=>{
 const before=new Date('2026-11-07T09:51:59Z'),after=new Date('2026-11-07T09:52:00Z');
 assert.equal(restSeason(before).term,'霜降');
 assert.equal(restSeason(after).term,'立冬');
 assert.equal(restSeason(after).season,'winter');
 assert.equal(cityMoment(after,'hangzhou').light,'dusk');
 assert.equal(cityMoment(after,'vancouver').light,'night');
 assert.equal(restSeason(new Date('2032-08-01')).term,null);
});

test('slips only use verified current rain and unlocked herbs, and persist across weather changes',()=>{
 const d=initialData(),now=new Date('2026-02-19T03:00:00Z'),day='2026-02-19';
 const rain=parseWeather({current:{time:+now/1000,weather_code:61,rain:.2}},'hangzhou')!;
 assert.equal(parseWeather({current:{time:+now/1000,weather_code:777,rain:0}},'hangzhou'),null);
 assert.equal(drawDaily(d,now,'雨水',rain,false,()=>.99).restJournal?.draws[day].id,'look');
 assert.equal(drawDaily(d,now,'雨水',{...rain,at:+now-3600000},true,()=>.99).restJournal?.draws[day].id,'look');
 const drawn=drawDaily(d,now,'雨水',rain,true,()=>.99);
 assert.equal(drawn.restJournal?.draws[day].id,'rain');
 const read=migrateData(JSON.parse(JSON.stringify(drawn)));
 assert.equal(drawDaily(read,now,'雨水',null,false),read);
 assert.equal(drawDaily({...d,restJournal:{...emptyJournal(),seed:true}},now,'雨水',null,false,()=>.99).restJournal?.draws[day].id,'leaf');
 assert.equal(drawDaily({...d,courtyard:{...d.courtyard,peel:true}},now,'雨水',null,false,()=>.99).restJournal?.draws[day].id,'peel');
});

test('rest choices obey ability to leave, current posture, and selected goal',()=>{
 const d=initialData();
 const options=(edit:Partial<ReturnType<typeof emptyJournal>>)=>restSuggestions({...d,restJournal:{...emptyJournal(),...edit}}).options;
 assert.equal(options({focus:'eyes'})[0].id,'look');
 assert.equal(options({focus:'brain'})[0].id,'quiet');
 assert.equal(options({posture:'standing',away:false})[0].id,'sit');
 assert.equal(options({away:true,minutes:120})[0].id,'walk');
 assert.ok(options({away:false,minutes:120}).every(x=>x.id!=='walk'));
});

test('same-minute life reminders are independently due and suppressed by overnight DND',()=>{
 const d=initialData();
 const reminders=[{id:'life:water',label:'喝水',time:'08:00'},{id:'custom',label:'私密计划',time:'08:00',private:true},{id:'off',label:'关闭',time:'08:00',enabled:false}];
 const now=new Date(2026,10,10,8,0);
 const current={...d,courtyard:{...d.courtyard,reminders}};
 assert.deepEqual(dueLife(current,now).map(x=>x.id),['life:water','custom']);
 assert.equal(dueLife({...current,reminder:{...d.reminder,dndStartHour:22,dndEndHour:9}},now).length,0);
});
