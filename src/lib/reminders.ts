import type {AppData,Reminder,ReminderEvent} from './types';
import {localDay} from './date';
export function inHourWindow(hour:number,start:number,end:number,equalMeansAll=true){return start===end?equalMeansAll:start<end?hour>=start&&hour<end:hour>=start||hour<end;}
export function permittedAt(time:number,r:Reminder){const hour=new Date(time).getHours();return inHourWindow(hour,r.startHour,r.endHour)&&!inHourWindow(hour,r.dndStartHour,r.dndEndHour,false);}
export function dueEvents(events:ReminderEvent[],now:number){return events.filter(e=>e.type==='due'&&localDay(new Date(e.at))===localDay(new Date(now)));}
export function latestDue(events:ReminderEvent[]){return events.reduce((n,e)=>e.type==='due'?Math.max(n,Date.parse(e.at)||0):n,0);}
export function scheduleReminder(from:number,r:Reminder,events:ReminderEvent[]=[],delayMinutes=r.intervalMinutes){
 let candidate=Math.max(from+delayMinutes*60000,latestDue(events)+r.intervalMinutes*60000,r.pausedUntil?Date.parse(r.pausedUntil)||0:0);
 // Scan minute boundaries using local calendar windows, including cross-midnight and DST.
 for(let i=0;i<8*24*60;i++){
  if(permittedAt(candidate,r)&&dueEvents(events,candidate).length<r.dailyLimit)return candidate;
  candidate=Math.floor(candidate/60000)*60000+60000;
 }
 return null; // work window completely covered by DND
}
export function reminderDue(data:AppData,now:number){
 const {reminder:r,companion:c}=data;
 if(!r.enabled||r.quiet||!c||c.status!=='active'||c.nextReminderAt===null||now<c.nextReminderAt)return false;
 if(r.pausedUntil&&now<Date.parse(r.pausedUntil))return false;
 if(data.sessions.some(s=>['running','paused','ready'].includes(s.status)))return false;
 if(r.snoozedUntil!==null&&r.pendingReminderId)return now>=r.snoozedUntil&&permittedAt(now,r);
 return permittedAt(now,r)&&dueEvents(data.reminderEvents,now).length<r.dailyLimit&&(!latestDue(data.reminderEvents)||now-latestDue(data.reminderEvents)>=r.intervalMinutes*60000);
}
export function respondToReminder(data:AppData,type:'postponed'|'skipped'|'already-active'|'paused'|'accepted',now:number,id:string,reason='',delayMinutes=0):AppData {
 if(data.reminderEvents.some(e=>e.id===id))return data;
 const c=data.companion;if(!c)return data;
 const occurrence=[...data.reminderEvents].reverse().find(e=>e.type==='due')?.id;
 const events:ReminderEvent[]=[...data.reminderEvents,{id,companionId:c.id,type,at:new Date(now).toISOString(),scene:data.currentScene,reason,delayMinutes:delayMinutes||undefined,reminderId:occurrence}];
 const pauseUntil=type==='paused'?new Date(now+Math.max(1,delayMinutes)*60000).toISOString():null;
 const snoozedUntil=type==='postponed'?scheduleReminder(now,{...data.reminder,pausedUntil:null},[],delayMinutes):null;
 const reminder={...data.reminder,snoozedUntil,pendingReminderId:type==='postponed'?occurrence||null:null,pausedUntil:pauseUntil,postponedCount:data.reminder.postponedCount+(type==='postponed'?1:0)};
 return {...data,reminder,reminderEvents:events,companion:{...c,status:type==='paused'?'paused':'active',nextReminderAt:snoozedUntil??scheduleReminder(now,reminder,events,Math.max(delayMinutes,type==='postponed'?0:reminder.intervalMinutes))}};
}
