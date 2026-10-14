import {activityById} from './activities';
import {localDay} from './date';
import type {Session} from './types';
export function growthStats(sessions:Session[],now:Date) {
 const completed=sessions.filter((s,i,a)=>s.status==='completed'&&a.findIndex(x=>x.id===s.id)===i&&s.completedAt&&new Date(s.completedAt).getTime()<=now.getTime());
 const seconds=(list:Session[])=>list.reduce((n,s)=>n+(activityById(s.activityId)?.durationSeconds||0),0);
 const days=Array.from({length:7},(_,i)=>{const day=new Date(now);day.setDate(day.getDate()-6+i);const key=localDay(day);const items=completed.filter(s=>localDay(new Date(s.completedAt!))===key);return {day:key,count:items.length,seconds:seconds(items)};});
 const counts=new Map<string,number>();completed.forEach(s=>counts.set(s.activityId,(counts.get(s.activityId)||0)+1));
 return {today:days[6],days,totalSeconds:seconds(completed),total:completed.length,favorites:[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3)};
}
