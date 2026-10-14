import type {CompanionSession,Reminder} from './types';
import {permittedAt,scheduleReminder} from './reminders';
// Compatibility exports for existing companion and garden integrations.
export function nextReminderAt(from:number,reminder:Reminder,delayMinutes=reminder.intervalMinutes){return scheduleReminder(from,reminder,[],delayMinutes);}
export function companionDue(session:CompanionSession|null,reminder:Reminder,now:number){return Boolean(reminder.enabled&&!reminder.quiet&&session?.status==='active'&&session.nextReminderAt!==null&&now>=session.nextReminderAt&&(!reminder.pausedUntil||now>=Date.parse(reminder.pausedUntil))&&permittedAt(now,reminder));}
export function nextDayReminderAt(from:number,reminder:Reminder){const next=new Date(from);next.setDate(next.getDate()+1);next.setHours(0,0,0,0);return scheduleReminder(next.getTime(),reminder,[],0);}
