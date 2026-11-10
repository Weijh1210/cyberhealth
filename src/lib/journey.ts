import {localDay} from './date';

export const chapterTitle = '从渡口到松风亭';
export const journeyStops = [
  {title:'渡船靠岸', place:'渡口', description:'渡船泊在岸边，第一段路从这里开始。'},
  {title:'雾散露出山阶', place:'山阶', description:'山间的雾退了，石阶沿着山坡向上。'},
  {title:'抵达松风亭', place:'松风亭', description:'亭上听松，三段路已合成一幅长卷。'},
] as const;

export type JourneyVisit = {day:string;sessionId:string};

export function advanceJourney(visits:JourneyVisit[],sessionId:string,now:Date) {
  const day=localDay(now);
  if(visits.length>=journeyStops.length || visits.some(visit=>visit.day===day || visit.sessionId===sessionId))return visits;
  return [...visits,{day,sessionId}];
}

export function readJourney(value:unknown):JourneyVisit[] {
  if(!Array.isArray(value))return [];
  const visits:JourneyVisit[]=[];
  for(const visit of value){
    if(!visit || typeof visit.day!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(visit.day) || typeof visit.sessionId!=='string')continue;
    if(!visits.some(saved=>saved.day===visit.day || saved.sessionId===visit.sessionId))visits.push({day:visit.day,sessionId:visit.sessionId});
    if(visits.length===journeyStops.length)break;
  }
  return visits;
}
