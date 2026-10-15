import type {AppData,Feedback,Scene} from './types';
const blocked=['unsuitable','uncomfortable','never','scene-mismatch'];
export function activeExclusions(feedback:Feedback[],activityId:string){const history=feedback.filter(f=>f.activityId===activityId);const reset=history.findLastIndex(f=>f.value==='restored');return history.slice(reset+1).filter(f=>blocked.includes(f.value));}
export function excludedInScene(feedback:Feedback[],activityId:string,scene:Scene){return activeExclusions(feedback,activityId).some(f=>f.value!=='scene-mismatch'||f.scene===scene);}
export function blockedActivities(feedback:Feedback[]){return [...new Set(feedback.map(f=>f.activityId))].flatMap(id=>activeExclusions(feedback,id).slice(-1));}
export function restoreActivity(data:AppData,activityId:string,now:Date):AppData {const at=now.toISOString();return {...data,feedback:[...data.feedback,{id:`${activityId}:restored:${at}`,activityId,value:'restored',at}]};}
