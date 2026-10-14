// Hong Kong Observatory 2026 calendar; date-level theme uses Asia/Shanghai (UTC+8).
// Source: https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
export const solarTerms2026=[
 ['01-05','小寒'],['01-20','大寒'],['02-04','立春'],['02-18','雨水'],['03-05','惊蛰'],['03-20','春分'],['04-05','清明'],['04-20','谷雨'],['05-05','立夏'],['05-21','小满'],['06-05','芒种'],['06-21','夏至'],['07-07','小暑'],['07-23','大暑'],['08-07','立秋'],['08-23','处暑'],['09-07','白露'],['09-23','秋分'],['10-08','寒露'],['10-23','霜降'],['11-07','立冬'],['11-22','小雪'],['12-07','大雪'],['12-22','冬至'],
] as const;
export function currentSolarTerm(now:Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=(kind:string)=>parts.find(p=>p.type===kind)!.value;
 if(get('year')!=='2026')return null;
 const key=`${get('month')}-${get('day')}`;const term=[...solarTerms2026].reverse().find(([date])=>date<=key);
 return term?{name:term[1],since:`2026-${term[0]}`,note:'按北京时间日期展示，非精确交节时刻'}:null;
}
