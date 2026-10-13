import type {CompanionSession,Reminder} from './types';
export function nextReminderAt(from:number,reminder:Reminder,delayMinutes=reminder.intervalMinutes):number{
 const candidate=new Date(from+delayMinutes*60000);
 for(let i=0;i<8;i++){
  const hour=candidate.getHours();
  if(hour<reminder.startHour){candidate.setHours(reminder.startHour,0,0,0);return candidate.getTime();}
  if(hour>=reminder.endHour||reminder.startHour>=reminder.endHour){candidate.setDate(candidate.getDate()+1);candidate.setHours(reminder.startHour,0,0,0);continue;}
  return candidate.getTime();
 }
 return candidate.getTime();
}
export function companionDue(session:CompanionSession|null,reminder:Reminder,now:number){if(!session||session.status!=='active'||reminder.quiet||!session.nextReminderAt||now<session.nextReminderAt)return false;const h=new Date(now).getHours();return h>=reminder.startHour&&h<reminder.endHour;}
export function nextDayReminderAt(from:number,reminder:Reminder){const next=new Date(from);next.setDate(next.getDate()+1);next.setHours(reminder.startHour,0,0,0);return next.getTime();}
