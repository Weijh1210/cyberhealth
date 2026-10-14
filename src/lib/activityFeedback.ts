import type {AppData,Feedback,Session,RecommendationEvent,Activity} from './types';
export const feedbackChoices:{value:Feedback['value'];label:string}[]=[{value:'liked',label:'喜欢这个动作'},{value:'too-easy',label:'太简单'},{value:'too-hard',label:'太难'},{value:'scene-mismatch',label:'不适合当前场景'},{value:'never',label:'不想再推荐'},{value:'neutral',label:'没有特别感觉'}];
export function recordActivityFeedback(data:AppData,session:Session,value:Feedback['value'],at:Date):AppData {
 if(session.status!=='completed')return data;
 const id=`${session.id}:feedback`;
 return {...data,feedback:[...data.feedback.filter(f=>f.id!==id),{id,sessionId:session.id,activityId:session.activityId,value,scene:session.preference.scene,at:at.toISOString()}]};
}
export function recordRecommendation(data:AppData,activity:Activity|null,id:string,at:Date):AppData {
 if(!activity||data.recommendationEvents.some(e=>e.id===id))return data;
 const event:RecommendationEvent={id,activityId:activity.id,scene:data.currentScene,at:at.toISOString()};
 return {...data,recommendationEvents:[...data.recommendationEvents,event]};
}
