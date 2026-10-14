import type {AdaptiveSettings,ReminderEvent} from './types';
export type ReminderObservation={due:ReminderEvent;responses:ReminderEvent[];outcome:ReminderEvent|undefined;postponed:boolean;completed:boolean};
export function reminderObservations(events:ReminderEvent[],resetAt:string|null=null,now=Date.now()):ReminderObservation[]{
 const earliest=Math.max(now-28*86400000,resetAt?Date.parse(resetAt):0);
 return events.filter((e,i,a)=>e.type==='due'&&Date.parse(e.at)>earliest&&Date.parse(e.at)<=now&&a.findIndex(x=>x.id===e.id)===i).map(due=>{
  const responses=events.filter(e=>e.reminderId===due.id&&Date.parse(e.at)<=now).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  return {due,responses,outcome:responses.filter(e=>['accepted','skipped','already-active'].includes(e.type)).at(-1),postponed:responses.some(e=>e.type==='postponed'),completed:responses.some(e=>e.type==='activity-completed')};
 });
}
export function adaptiveInsight(events:ReminderEvent[],settings:AdaptiveSettings,now=Date.now()){
 const observations=reminderObservations(events,settings.resetAt,now).filter(o=>o.outcome||o.postponed);
 const windows=Array.from({length:12},(_,i)=>{const items=observations.filter(o=>Math.floor(new Date(o.due.scheduledAt||o.due.at).getHours()/2)===i);const days=new Set(items.map(o=>new Date(o.due.at).toLocaleDateString())).size;return {start:i*2,end:i*2+2,count:items.length,days,accepted:items.filter(o=>o.outcome?.type==='accepted').length,postponed:items.filter(o=>o.postponed).length};});
 const eligible=windows.filter(w=>w.count>=6&&w.days>=3);
 const preferred=eligible.filter(w=>w.accepted/w.count>=2/3).sort((a,b)=>b.accepted/b.count-a.accepted/a.count)[0];
 const delayed=eligible.filter(w=>w.postponed/w.count>=2/3);
 const recent=observations.slice().sort((a,b)=>Date.parse(a.due.at)-Date.parse(b.due.at)).slice(-4);
 const reduce=observations.length>=6&&recent.length===4&&recent.every(o=>o.outcome?.type==='skipped');
 const reason=!settings.enabled?'智能调整已关闭，使用你设定的规则。':!eligible.length&&!reduce?'有效反馈不足：同一 2 小时时段至少 6 次、跨 3 天后才调整。':reduce?'最近连续跳过 4 次，普通提醒间隔最多增加 30 分钟，不增加每日次数。':delayed.length?'有足够记录的时段经常延后，普通提醒尝试晚 15 分钟。':preferred?'这个时段接受比例较高，在接下来 30 分钟内适度优先安排。':'已有足够反馈，暂时保持你的节奏。';
 return {windows,preferred:settings.enabled?preferred:undefined,delayed:settings.enabled?delayed:[],reduce:settings.enabled&&reduce,reason,validCount:observations.length};
}
export function adaptiveDelay(from:number,baseMinutes:number,events:ReminderEvent[],settings:AdaptiveSettings){
 const insight=adaptiveInsight(events,settings,from);if(!settings.enabled)return baseMinutes;
 let delay=baseMinutes+(insight.reduce?Math.min(30,baseMinutes*.5):0);
 const hour=new Date(from+delay*60000).getHours();if(insight.delayed.some(w=>hour>=w.start&&hour<w.end))delay+=15;
 if(insight.preferred){const candidate=new Date(from+delay*60000);const target=new Date(candidate);target.setHours(insight.preferred.start,0,0,0);const delta=(target.getTime()-candidate.getTime())/60000;if(delta>0&&delta<=30)delay+=delta;}
 return Math.min(baseMinutes+30,delay);
}
