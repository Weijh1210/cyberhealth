import {useEffect,useRef} from 'react';
import {localRepository} from '../data/repository';
import {claimReminder} from '../data/reminderClaim';
import {dueLife,emptyJournal,type Pending} from '../lib/restJournal';
import {reminderDue,scheduleReminder,withReminderPlan} from '../lib/reminders';
import {displayNotification} from '../lib/notifications';
import type {AppData,Reminder} from '../lib/types';

export type UpdateData=(change:(data:AppData)=>AppData)=>AppData;
export const uid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;

export function planRestReminder(d:AppData,patch:Partial<Reminder>,now:number):AppData{
 const reminder={...d.reminder,...patch};
 const companion=d.companion??{id:uid(),startedAt:new Date(now).toISOString(),currentScene:d.currentScene};
 return withReminderPlan({...d,reminder,companion:{...companion,status:!reminder.enabled?'ended':reminder.pausedUntil&&Date.parse(reminder.pausedUntil)>now?'paused':'active',
  nextReminderAt:!reminder.enabled?null:reminder.snoozedUntil??scheduleReminder(now,reminder,d.reminderEvents,reminder.intervalMinutes,d.adaptive)}},now);
}

export function useRestReminders(now:number,update:UpdateData,onDue:()=>void,onFailure:()=>void){
 const busy=useRef(false);
 useEffect(()=>{
  let d=localRepository.read();
  const r=d.reminder;
  if(r.enabled&&(!d.companion||d.companion.status==='ended'||r.pausedUntil&&now>=Date.parse(r.pausedUntil))){
   d=update(x=>{
    const wasPaused=Boolean(x.reminder.pausedUntil&&Date.parse(x.reminder.pausedUntil)<=now);
    const resumed=planRestReminder(x,wasPaused?{pausedUntil:null}:{},now);
    return wasPaused&&resumed.companion?{...resumed,companion:{...resumed.companion,nextReminderAt:scheduleReminder(now,resumed.reminder,resumed.reminderEvents,0)}}:resumed;
   });
  }
  if(busy.current)return;
  const life=dueLife(d,new Date(now));
  const main=reminderDue(d,now);
  if(!life.length&&!main)return;
  busy.current=true;
  const key=localRepository.currentKey();
  const occurrence=main?`${d.companion!.id}:${d.companion!.nextReminderAt}`:null;
  const candidates:Pending[]=[
   ...(occurrence?[{id:occurrence,kind:'break' as const,label:'间隙提醒',at:now,state:'pending' as const}]:[]),
   ...life.map(x=>({id:`${x.id}@${x.lastDay}`,kind:'life' as const,label:x.label,at:now,state:'pending' as const,private:x.private})),
  ];
  void Promise.all(candidates.map(async p=>({p,claim:await claimReminder(`${key}:${p.id}`)}))).then(results=>{
   if(localRepository.currentKey()!==key)return;
   if(results.some(x=>x.claim==='unavailable'))onFailure();
   let added:Pending[]=[];
   const next=update(current=>{
    const journal=current.restJournal??emptyJournal();
    const stamp=Date.now();
    const lifeNow=dueLife(current,new Date(stamp));
    added=results.filter(({p,claim})=>claim==='claimed'&&!journal.pending.some(x=>x.id===p.id)&&(p.kind==='life'
     ?lifeNow.some(x=>`${x.id}@${x.lastDay}`===p.id)
     :reminderDue(current,stamp)&&p.id===`${current.companion!.id}:${current.companion!.nextReminderAt}`)).map(x=>x.p);
    if(!added.length)return current;
    const hasMain=added.some(x=>x.kind==='break');
    const c=current.companion;
    const snoozed=Boolean(current.reminder.snoozedUntil&&current.reminder.pendingReminderId);
    const events:AppData['reminderEvents']=hasMain&&c?[...current.reminderEvents,{id:occurrence!,companionId:c.id,type:snoozed?'redisplayed':'due',at:new Date(stamp).toISOString(),foregroundDelivery:document.visibilityState==='visible'?'shown':undefined,systemDelivery:'unknown'}]:current.reminderEvents;
    const reminder=hasMain?{...current.reminder,snoozedUntil:null,pendingReminderId:null}:current.reminder;
    return withReminderPlan({...current,reminder,reminderEvents:events,
     companion:hasMain&&c?{...c,nextReminderAt:scheduleReminder(stamp,reminder,events,reminder.intervalMinutes,current.adaptive)}:c,
     courtyard:{...current.courtyard,reminders:current.courtyard.reminders.map(x=>lifeNow.find(y=>y.id===x.id&&added.some(p=>p.id===`${y.id}@${y.lastDay}`))??x)},
     restJournal:{...journal,pending:[...journal.pending.filter(p=>p.state==='pending'||stamp-p.at<7*86400000),...added]}},stamp);
   });
   if(!added.length)return;
   if(added.some(x=>x.kind==='break')&&document.visibilityState==='visible')onDue();
   if(next.reminder.browserNotifications){
    const title=added.some(x=>x.private||x.kind==='break')?'歇一下':added.map(x=>x.label).join('、');
    void displayNotification(title,'');
   }
  }).finally(()=>{busy.current=false;});
 },[now,update,onDue,onFailure]);
}
