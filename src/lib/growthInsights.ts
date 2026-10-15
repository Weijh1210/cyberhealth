import {growthStats} from './growth';import {reminderObservations,adaptiveInsight} from './adaptiveReminders';import {localDay} from './date';import type {AppData,Scene} from './types';
export const sceneNames:Record<Scene,string>={library:'图书馆 / 自习室',office:'办公室',home:'家 / 宿舍',classroom:'教室 / 会议室',transit:'公共交通',outdoor:'户外',other:'其他'};
export function growthInsights(data:AppData,now:Date){
 const completed=data.sessions.filter((s,i,a)=>s.status==='completed'&&s.completedAt&&Date.parse(s.completedAt)<=now.getTime()&&a.findIndex(x=>x.id===s.id)===i);
 const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const weeks=Array.from({length:4},(_,i)=>{const start=new Date(monday);start.setDate(start.getDate()-(3-i)*7);const end=new Date(start);end.setDate(end.getDate()+7);return {start:localDay(start),count:completed.filter(s=>Date.parse(s.completedAt!)>=start.getTime()&&Date.parse(s.completedAt!)<end.getTime()).length};});
 const scenes=Object.entries(sceneNames).map(([id,name])=>({id,name,count:completed.filter(s=>s.preference.scene===id).length})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count);
 const observations=reminderObservations(data.reminderEvents,null,now.getTime());
 const statuses=observations.map(o=>o.responses.filter(e=>['accepted','postponed','skipped','already-active','paused'].includes(e.type)).at(-1)?.type);
 const responseTypes=['accepted','postponed','skipped','already-active','paused'] as const;
 const responded=statuses.filter(Boolean).length;
 const responses=responseTypes.map(type=>({type,count:statuses.filter(s=>s===type).length,ratio:responded?statuses.filter(s=>s===type).length/responded:null}));
 const total=growthStats(data.sessions,now).total;
 const review=total?`本周已确认 ${weeks[3].count} 次微休息，累计 ${total} 次。中断不会清零，下次方便时再继续。`:'还没有完成记录。可以从一次方便的小休息开始。';
 return {weeks,scenes,responses,responded,pending:statuses.filter(s=>!s).length,completedFromReminder:observations.filter(o=>o.completed).length,preferred:adaptiveInsight(data.reminderEvents,{...data.adaptive,enabled:true},now.getTime()).preferred,review};
}
