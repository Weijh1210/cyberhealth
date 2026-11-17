import {cityMoment} from './restJournal';
import type {AppData} from './types';

export type GardenPlace='pavilion'|'hall'|'bridge'|'herbs'|'oracle';
export const gardenPlaces:Record<GardenPlace,{name:string;verb:string;line:string;x:number;y:number;focus:'general'|'eyes'|'hands'|'brain'}>={
 pavilion:{name:'松风亭',verb:'借一眼远山',line:'小竹发现，亭外的山色正好。放下屏幕，让目光走远一点。',x:23,y:24,focus:'eyes'},
 hall:{name:'舒展堂',verb:'唤醒身体',line:'堂前有一片空地。跟小竹舒展片刻，让紧绷的身体松下来。',x:54,y:43,focus:'general'},
 bridge:{name:'听溪桥',verb:'沿溪走一走',line:'溪水带来一封邀请。如果方便离座，就在现实里走上一小段。',x:65,y:62,focus:'general'},
 herbs:{name:'百草圃',verb:'看看草木',line:'你留给自己的片刻，也会在这里长出新叶。',x:26,y:70,focus:'general'},
 oracle:{name:'拾光轩',verb:'抽一枚今日签',line:'竹筒里藏着今天的小小相遇，去看看会拾到什么。',x:80,y:82,focus:'brain'},
};
export function gardenProgress(data:AppData,day:string){
 const completed=data.sessions.filter(s=>s.status==='completed');
 const notes=data.restJournal?.notes??[];
 const total=completed.length+notes.length;
 const onDay=(at:string|undefined)=>Boolean(at&&Number.isFinite(Date.parse(at))&&cityMoment(new Date(at),data.courtyard.city).day===day);
 const today=completed.filter(s=>onDay(s.completedAt)).length+notes.filter(n=>onDay(n.at)).length;
 const chapters=['初入山居','一隅新绿','溪山相伴','自在山居'];
 const stage=Math.min(3,Math.floor(total/3));
 return {total,today,stage,chapter:chapters[stage],remaining:3-total%3,progress:stage===3?100:(total%3)/3*100};
}
