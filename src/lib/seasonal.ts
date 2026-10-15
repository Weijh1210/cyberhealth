import dates from './solarDates.json';
import {seasonalContents} from './seasonalContent';
// Hong Kong Observatory 2026 calendar; date-level theme uses Asia/Shanghai (UTC+8).
// Source: https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
export const solarTerms2026=[
 ['01-05','小寒'],['01-20','大寒'],['02-04','立春'],['02-18','雨水'],['03-05','惊蛰'],['03-20','春分'],['04-05','清明'],['04-20','谷雨'],['05-05','立夏'],['05-21','小满'],['06-05','芒种'],['06-21','夏至'],['07-07','小暑'],['07-23','大暑'],['08-07','立秋'],['08-23','处暑'],['09-07','白露'],['09-23','秋分'],['10-08','寒露'],['10-23','霜降'],['11-07','立冬'],['11-22','小雪'],['12-07','大雪'],['12-22','冬至'],
] as const;
export function currentSolarTerm(now:Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=(kind:string)=>parts.find(p=>p.type===kind)!.value;
 const year=get('year');if(!['2025','2026','2027'].includes(year))return null;
 const rows:readonly (readonly string[])[]=year==='2026'?solarTerms2026.map(([date,name])=>[`2026-${date}`,name]):dates[year as keyof typeof dates];
 const key=`${year}-${get('month')}-${get('day')}`;let index=-1;for(let i=0;i<rows.length;i++)if(rows[i][0]<=key)index=i;
 if(index<0){if(year==='2025')return null;const previous=year==='2026'?dates['2025'].at(-1)![0]:'2026-12-22';return {name:'冬至',since:previous,note:'按北京时间日期展示，非精确交节时刻',content:seasonalContents[23]};}
 return {name:seasonalContents[index].name.zh,since:rows[index][0],note:'按北京时间日期展示，非精确交节时刻',content:seasonalContents[index]};
}
