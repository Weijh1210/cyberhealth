import {activities} from './activities';
import type {Activity,Feedback,FocusArea,Preference,Session,UserProfile} from './types';

function related(a:FocusArea,b:FocusArea){if(a===b)return true;if(a==='back')return b==='upperBack'||b==='lowerBack';if(b==='back')return a==='upperBack'||a==='lowerBack';if(a==='fullBody')return b==='fullBody';if(a==='general')return b==='general'||b==='fullBody';return false;}
export function matches(a:Activity,p:Preference,profile?:UserProfile,feedback:Feedback[]=[]){
 if(!a.meta.isActive||a.meta.evidenceReviewStatus==='needs-professional-review')return false;
 if(feedback.some(f=>f.activityId===a.id&&['unsuitable','uncomfortable'].includes(f.value)))return false;
 if(!a.sceneTags.includes(p.scene)||a.durationSeconds>p.duration)return false;
 if(a.requiresStanding&&p.mobility==='seated')return false;
 if(a.requiresOutdoor&&p.mobility!=='outside')return false;
 if(a.meta.spaceRequired==='spacious'&&!['spacious','outside'].includes(p.mobility))return false;
 if(a.meta.spaceRequired==='small'&&p.mobility==='seated')return false;
 if(a.meta.spaceRequired==='outdoor'&&p.mobility!=='outside')return false;
 if(profile?.quiet&&a.meta.noiseLevel!=='silent')return false;
 if(profile?.smallMovement&&a.meta.level==='L3')return false;
 if(a.requiresAudio||a.meta.equipmentRequired.length>0)return false;
 return true;
}
export function candidates(p:Preference,profile?:UserProfile,feedback:Feedback[]=[]){return activities.filter(a=>matches(a,p,profile,feedback));}
export function recommend(p:Preference,feedback:Feedback[],sessions:Session[],theme:string,exclude:string[]=[],profile?:UserProfile):Activity|null{
 const pool=candidates(p,profile,feedback).filter(a=>!exclude.includes(a.id));if(!pool.length)return null;
 const recent=sessions.filter(s=>s.status==='completed').slice(-5).map(s=>s.activityId);
 return [...pool].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
 function score(a:Activity){
  const f=[...feedback].reverse().find(x=>x.activityId===a.id);
  const needs=p.bodyNeed&&p.bodyNeed!=='general'?[p.bodyNeed]:profile?.focusAreas||[];
  const focus=needs.some(need=>a.meta.targetBodyParts.some(part=>related(need,part)))?18:0;
  const checked=a.meta.evidenceReviewStatus==='source-checked-technique'?3:0;
  const sceneFit=['library','classroom','transit'].includes(p.scene)&&a.meta.level==='L1'?5:0;
  const timeFit=p.duration>=180&&a.durationSeconds>=180?3:0;
  const sceneHabit=profile?.commonScenes.includes(p.scene)?1:0;
  const completed=sessions.filter(s=>s.activityId===a.id&&s.status==='completed').length;
  const started=sessions.filter(s=>s.activityId===a.id).length;
  const completion=started?Math.round(completed/started*2):0;
  return focus+checked+sceneFit+timeFit+sceneHabit+completion+(f?.value==='liked'?4:0)-(recent.includes(a.id)?7:0)+(a.themeTags.includes(theme)?1:0);
 }
}
