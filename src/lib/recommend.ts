import {activities} from './activities';
import type {Activity,Feedback,FocusArea,Preference,Session,UserProfile} from './types';
function related(a:FocusArea,b:FocusArea){return a===b||(a==='neck'&&b==='shoulders')||(a==='back'&&['upperBack','lowerBack'].includes(b))||(b==='back'&&['upperBack','lowerBack'].includes(a));}
export function matches(a:Activity,p:Preference,profile?:UserProfile,feedback:Feedback[]=[]){
 if(!a.meta.isActive||a.reviewStatus!=='source-checked'||a.meta.evidenceReviewStatus!=='source-checked-technique')return false;
 if(feedback.some(f=>f.activityId===a.id&&['unsuitable','uncomfortable'].includes(f.value)))return false;
 if(!a.sceneTags.includes(p.scene)||a.durationSeconds>p.duration)return false;
 if((a.requiresStanding||a.meta.posture==='standing'||a.meta.posture==='walking')&&p.mobility==='seated')return false;
 if((a.requiresOutdoor||a.meta.spaceRequired==='outdoor')&&p.mobility!=='outside')return false;
 if(a.meta.posture==='walking'&&!['spacious','outside'].includes(p.mobility))return false;
 if(a.meta.spaceRequired==='spacious'&&!['spacious','outside'].includes(p.mobility))return false;
 if(a.meta.spaceRequired==='small'&&p.mobility==='seated')return false;
 if(profile?.quiet&&a.meta.noiseLevel!=='silent')return false;
 if(['library','classroom'].includes(p.scene)&&(a.meta.level!=='L1'||a.meta.noiseLevel!=='silent'||a.meta.attentionLevel!=='low'))return false;
 if(profile?.smallMovement&&a.meta.level==='L3')return false;
 if(a.requiresAudio||a.meta.equipmentRequired.some(item=>!p.availableEquipment?.includes(item)))return false;
 return true;
}
export function candidates(p:Preference,profile?:UserProfile,feedback:Feedback[]=[]){return activities.filter(a=>matches(a,p,profile,feedback));}
export function recommendationScore(a:Activity,p:Preference,feedback:Feedback[],sessions:Session[],profile?:UserProfile){
 const focus=p.bodyNeed&&p.bodyNeed!=='general'?[p.bodyNeed]:profile?.focusAreas||[];
 const scene=['library','classroom'].includes(p.scene)?(a.meta.level==='L1'?1:.5):1;
 const time=a.durationSeconds/p.duration;
 const focusFit=focus.some(x=>a.meta.targetBodyParts.some(y=>related(x,y)))?1:.2;
 const history=sessions.filter(s=>s.activityId===a.id);
 const preference=(feedback.some(f=>f.activityId===a.id&&f.value==='liked')?1:0.5)+(history.length?history.filter(s=>s.status==='completed').length/history.length*.25:0);
 const recent=sessions.filter(s=>s.status==='completed').slice(-5).reverse();
 const index=recent.findIndex(s=>s.activityId===a.id);
 return 35*scene+25*time+20*focusFit+20*Math.min(1,preference)-(index<0?0:12-index*2);
}
export function recommend(p:Preference,feedback:Feedback[],sessions:Session[],_theme:string,exclude:string[]=[],profile?:UserProfile):Activity|null{
 const pool=candidates(p,profile,feedback).filter(a=>!exclude.includes(a.id));
 return pool.sort((a,b)=>recommendationScore(b,p,feedback,sessions,profile)-recommendationScore(a,p,feedback,sessions,profile)||a.id.localeCompare(b.id))[0]||null;
}
export function recommendationReason(a:Activity,p:Preference){
 const place={library:'图书馆',office:'办公室',home:'家中',classroom:'教室',transit:'公共交通',outdoor:'户外',other:'当前环境'}[p.scene];
 return `适合${place}，${a.meta.posture==='seated'?'可坐着完成':a.meta.posture==='walking'?'适合已确认的走动空间':'可在你允许的站立空间完成'}；${a.durationSeconds} 秒在可用的 ${p.duration} 秒内${p.bodyNeed&&a.focusTags.includes(p.bodyNeed)?'，也符合当前关注部位':''}。`;
}
