import type {AppData,UserProfile,Reminder,AdaptiveSettings,Session,Feedback,ReminderEvent,RecommendationEvent} from './types';
export type CloudPreferences={profile:UserProfile;reminder:Pick<Reminder,'startHour'|'endHour'|'intervalMinutes'|'dailyLimit'|'dndStartHour'|'dndEndHour'>;adaptive:AdaptiveSettings};
export type CloudSnapshot={revision:number;preferences:CloudPreferences|null;sessions:Session[];feedback:Feedback[];reminderEvents:ReminderEvent[];recommendationEvents:RecommendationEvent[]};
export const emptySnapshot=():CloudSnapshot=>({revision:0,preferences:null,sessions:[],feedback:[],reminderEvents:[],recommendationEvents:[]});
export function cloudPreferences(data:AppData):CloudPreferences {const {startHour,endHour,intervalMinutes,dailyLimit,dndStartHour,dndEndHour}=data.reminder;return {profile:data.profile,adaptive:data.adaptive,reminder:{startHour,endHour,intervalMinutes,dailyLimit,dndStartHour,dndEndHour}};}
export function cloudPayload(data:AppData){return {sessions:data.sessions.filter(s=>s.status==='completed'||s.status==='exited'),feedback:data.feedback.map(f=>({...f,id:f.id||`legacy:${f.activityId}:${f.at}:${f.value}`})),reminderEvents:data.reminderEvents,recommendationEvents:data.recommendationEvents};}
export function preferencesConflict(local:AppData,cloud:CloudSnapshot){return Boolean(cloud.preferences&&JSON.stringify(cloudPreferences(local))!==JSON.stringify(cloud.preferences));}
// Existing cloud events are immutable; preserve their IDs, never count duplicates or add energy twice.
export function mergeCloud(local:AppData,cloud:CloudSnapshot,useCloudPreferences=true):AppData {
 const union=<T extends {id?:string}>(a:T[],b:T[])=>{const map=new Map<string,T>();for(const event of a)if(event.id)map.set(event.id,event);for(const event of b)if(event.id)map.set(event.id,event);return [...map.values()];};
 const sessions=union(local.sessions,cloud.sessions).sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt));
 const added=cloud.sessions.filter(s=>s.status==='completed'&&!local.sessions.some(x=>x.id===s.id&&x.status==='completed')).length;
 return {...local,sessions,energy:local.energy+added*10,feedback:union(cloudPayload(local).feedback,cloud.feedback).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),reminderEvents:union(local.reminderEvents,cloud.reminderEvents).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),recommendationEvents:union(local.recommendationEvents,cloud.recommendationEvents),...(useCloudPreferences&&cloud.preferences?{profile:cloud.preferences.profile,adaptive:cloud.preferences.adaptive,reminder:{...local.reminder,...cloud.preferences.reminder}}:{})};
}
