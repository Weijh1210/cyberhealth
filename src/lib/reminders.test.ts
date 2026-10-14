import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from './store';
import {inHourWindow,permittedAt,scheduleReminder,reminderDue,respondToReminder} from './reminders';
import {notificationCapability} from './notifications';
const at=(day=15,hour=10,minute=0)=>new Date(2026,9,day,hour,minute).getTime();
function enabled(){const d=initialData();d.reminder.enabled=true;d.companion={id:'c',status:'active',currentScene:'library',startedAt:new Date(at()).toISOString(),nextReminderAt:at()};return d;}
test('off, DND, work window, active execution, cap and minimum interval prevent delivery',()=>{
 const d=enabled();assert.equal(reminderDue(d,at()),true);
 assert.equal(reminderDue({...d,reminder:{...d.reminder,enabled:false}},at()),false);
 assert.equal(reminderDue({...d,reminder:{...d.reminder,dndStartHour:9,dndEndHour:11}},at()),false);
 assert.equal(reminderDue(d,at(15,23)),false);
 const event={id:'due',companionId:'c',type:'due' as const,at:new Date(at(15,9,45)).toISOString()};
 assert.equal(reminderDue({...d,reminderEvents:[event]},at()),false);
 assert.equal(reminderDue({...d,reminder:{...d.reminder,dailyLimit:1},reminderEvents:[{...event,at:new Date(at(15,8)).toISOString()}]},at()),false);
 assert.equal(reminderDue({...d,sessions:[{id:'s',activityId:'chin-tuck',preference:d.preference,startedAt:new Date(at()).toISOString(),status:'paused',remainingSeconds:30,deadlineAt:null}]},at()),false);
});
test('cross-midnight work and quiet windows, full overlap and next calendar day',()=>{
 const r={...initialData().reminder,startHour:22,endHour:6,dndStartHour:2,dndEndHour:4};
 assert.equal(inHourWindow(23,22,6),true);assert.equal(permittedAt(at(15,1),r),true);assert.equal(permittedAt(at(15,3),r),false);
 assert.equal(scheduleReminder(at(15,1,30),r),at(15,4));
 assert.equal(scheduleReminder(at(15,5,30),r),at(15,22));
 assert.equal(scheduleReminder(at(),{...r,startHour:9,endHour:17,dndStartHour:8,dndEndHour:18}),null);
});
test('snoozes reuse original occurrence without bypassing quiet hours or adding daily count',()=>{
 for(const minutes of [15,30,60]){const d=enabled();d.reminderEvents=[{id:'original',companionId:'c',type:'due',at:new Date(at()).toISOString()}];
 const snoozed=respondToReminder(d,'postponed',at(),'feedback','正在专注',minutes);
 assert.equal(snoozed.companion!.nextReminderAt,at()+minutes*60000);assert.equal(reminderDue(snoozed,at()+minutes*60000-1),false);assert.equal(reminderDue(snoozed,at()+minutes*60000),true);assert.equal(snoozed.reminderEvents.at(-1)?.reason,'正在专注');assert.equal(snoozed.reminderEvents.at(-1)?.reminderId,'original');
 assert.equal(respondToReminder(snoozed,'postponed',at(),'feedback'),snoozed);}
});
test('pause expires at requested instant; already-active is feedback, not a completed action',()=>{
 const d=respondToReminder(enabled(),'paused',at(),'pause','开会',60);assert.equal(d.reminder.pausedUntil,new Date(at(15,11)).toISOString());assert.equal(respondToReminder(enabled(),'paused',at(),'short-pause','',0.5).reminder.pausedUntil,new Date(at()+30000).toISOString());assert.equal(reminderDue(d,at(15,10,30)),false);
 const active=respondToReminder(enabled(),'already-active',at(),'active','已经活动过');assert.equal(active.sessions.length,0);assert.equal(active.energy,0);
});
test('calendar windows follow current device time zone across DST',()=>{
 const original=process.env.TZ;
 try{process.env.TZ='America/New_York';const r={...initialData().reminder,startHour:1,endHour:5,dndStartHour:0,dndEndHour:0};const start=new Date('2026-03-08T01:30:00-05:00').getTime();const scheduled=scheduleReminder(start,r)!;assert.equal(new Date(scheduled).getHours(),3);
 process.env.TZ='Asia/Shanghai';assert.equal(permittedAt(start,r),false);
 }finally{if(original)process.env.TZ=original;else delete process.env.TZ;}
});
test('notification support never implies background push, denial never blocks foreground',()=>{
 const env={secure:true,notification:true,serviceWorker:true,push:true,ios:false,standalone:false,permission:'granted'};
 assert.match(notificationCapability(env).message,/未接入后台/);assert.equal(notificationCapability({...env,permission:'denied'}).canRequest,false);assert.match(notificationCapability({...env,ios:true}).message,/添加到主屏幕/);assert.equal(notificationCapability({...env,notification:false}).canRequest,false);
});
