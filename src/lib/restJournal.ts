import type {City,QuickBreak} from './courtyard';
import {cities,weatherForCode} from './courtyard';
import {candidates,recommendationScore} from './recommend';
import type {Activity,AppData,Preference} from './types';
import {inHourWindow} from './reminders';

export const cityZones={hangzhou:'Asia/Shanghai',suzhou:'Asia/Shanghai',shanghai:'Asia/Shanghai',beijing:'Asia/Shanghai',hongkong:'Asia/Hong_Kong',tokyo:'Asia/Tokyo',london:'Europe/London',vancouver:'America/Vancouver'} satisfies Record<City,string>;
export const calendarSource='https://www.hko.gov.hk/tc/gts/astronomy/Solar_Term.htm';
export const weatherSource='https://open-meteo.com/en/docs';
export const herbSources={directory:'https://library.hkbu.edu.hk/cml/',leaf:'https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00338',peel:'https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00162',formula:'https://sys01.lib.hkbu.edu.hk/cmed/cmfid/detail.php?id=F00147&lang=chs'};
export const slipText={
 spring:{name:'初春签',line:'一枝还未绿，且留半刻春。',basis:'历法 · 立春的交节时刻',url:calendarSource},
 look:{name:'望远签',line:'书页合一息，抬眼见远山。',basis:'职业健康 · 离屏与看远',url:'https://www.hse.gov.uk/pubns/indg36.pdf'},
 rain:{name:'借雨签',line:'檐前一寸水，且听雨落时。',basis:'历法 · 节气的划分',url:calendarSource},
 leaf:{name:'辨苏签',line:'翻叶看深浅，沿边认细齿。',basis:'植物形态 · 紫苏叶标本',url:herbSources.leaf},
 peel:{name:'藏陈签',line:'一瓣留纹，一瓣收香。',basis:'标本形态 · 陈皮内外表面',url:herbSources.peel},
};
export type WeatherReading={city:City;code:number;rain:number;at:number};
export type SlipEntry={id:keyof typeof slipText;term:string;reason:string;weather?:WeatherReading};
export type RestKind=QuickBreak|'feet'|'sit'|'elsewhere';
export type LifeItem={id:string;label:string;time:string;lastDay?:string;private?:boolean;enabled?:boolean};
export const lifePresets=[['water','喝水','10:30'],['meal','吃饭','12:00'],['finish','收工','18:00'],['headphones','摘耳机','16:00'],['posture','坐姿自查','15:00']] as const;
export type Pending={id:string;kind:'break'|'life';label:string;at:number;state:'pending'|'done'|'skipped'|'snoozed'|'paused';private?:boolean};
export type RestJournal={
 away?:boolean; room?:'small'|'spacious'|'outdoor'; posture?:'seated'|'standing'; minutes?:number; focus?:'general'|'eyes'|'hands'|'brain';
 notes:{id:string;kind:RestKind;title:string;at:string;text?:string;fit?:'合适'|'不方便'}[];
 seed:boolean; plantedAt?:string; careCity?:City; wateredDays?:string[]; pressedAt?:string; peel:boolean; exhibit:('leaf'|'peel')[];
 draws:Record<string,SlipEntry>; pending:Pending[]; disabledLife:string[];
};
export const emptyJournal=():RestJournal=>({notes:[],seed:false,peel:false,exhibit:[],draws:{},pending:[],disabledLife:[]});
export function readJournal(value:unknown):RestJournal{
 const v=value as Partial<RestJournal>|null;
 const validDate=(x:unknown):x is string=>typeof x==='string'&&Number.isFinite(Date.parse(x));
 return {...emptyJournal(),
  away:typeof v?.away==='boolean'?v.away:undefined,room:v?.room&&['small','spacious','outdoor'].includes(v.room)?v.room:undefined,posture:v?.posture==='standing'||v?.posture==='seated'?v.posture:undefined,
  minutes:[30,60,120,180,300,600,1200].includes(v?.minutes??0)?v?.minutes:undefined,
  focus:v?.focus&&['general','eyes','hands','brain'].includes(v.focus)?v.focus:undefined,
  seed:v?.seed===true,plantedAt:validDate(v?.plantedAt)?v.plantedAt:undefined,peel:v?.peel===true,careCity:v?.careCity&&Object.hasOwn(cities,v.careCity)?v.careCity:undefined,
  wateredDays:Array.isArray(v?.wateredDays)?[...new Set(v.wateredDays.filter(day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)))].sort().slice(0,2):undefined,pressedAt:validDate(v?.pressedAt)?v.pressedAt:undefined,
  exhibit:Array.isArray(v?.exhibit)?[...new Set(v.exhibit.filter(x=>x==='leaf'||x==='peel'))]:[],
  notes:Array.isArray(v?.notes)?v.notes.filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&validDate(n.at)):[],
  draws:v?.draws&&typeof v.draws==='object'?Object.fromEntries(Object.entries(v.draws).filter(([day,x])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&x&&Object.hasOwn(slipText,x.id)&&typeof x.reason==='string'&&typeof x.term==='string').map(([day,x])=>[day,{...x,weather:x.weather&&Number.isFinite(x.weather.at)&&Math.abs(x.weather.at)<8.64e15&&Number.isFinite(x.weather.rain)&&Number.isInteger(x.weather.code)?x.weather:undefined}])):{},
  pending:Array.isArray(v?.pending)?v.pending.filter(p=>p&&typeof p.id==='string'&&typeof p.label==='string'&&Number.isFinite(p.at)&&['break','life'].includes(p.kind)&&['pending','done','skipped','snoozed','paused'].includes(p.state)):[],
  disabledLife:Array.isArray(v?.disabledLife)?v.disabledLife.filter(x=>typeof x==='string'):[],
 };
}
export function plantState(d:AppData){
 const plantedAt=d.restJournal?.plantedAt??Object.values(d.courtyard.plants).filter(x=>Number.isFinite(Date.parse(x))).sort()[0];
 return {owned:Boolean(d.restJournal?.seed||plantedAt||d.courtyard.seeds||d.courtyard.leaf),plantedAt,peel:Boolean(d.restJournal?.peel||d.courtyard.peel)};
}
export function cityMoment(now:Date,city:City){
 const zone=cityZones[city];
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part=(key:string)=>parts.find(x=>x.type===key)?.value;
 const hour=Number(part('hour'));
 return {day:`${part('year')}-${part('month')}-${part('day')}`,light:(hour<5||hour>=20?'night':hour<9?'morning':hour<17?'day':'dusk') as 'night'|'morning'|'day'|'dusk',zone};
}
export const weatherName={clear:'晴',cloud:'阴／多云／雾',rain:'雨',snow:'雪',unknown:'实况暂不可用'} as const;
export function readingWeather(value:WeatherReading|null){return value?weatherForCode(value.code):'unknown';}
export function reliableWeather(value:WeatherReading|null,now:number){
 return Boolean(value&&now-value.at>=-5*60000&&now-value.at<=45*60000);
}
export function parseWeather(raw:unknown,city:City):WeatherReading|null{
 const current=(raw as {current?:{time?:unknown;weather_code?:unknown;rain?:unknown}}|null)?.current;
 if(!current||typeof current.time!=='number'||!Number.isSafeInteger(current.time)||Math.abs(current.time)>=8.64e12||typeof current.weather_code!=='number'||![0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(current.weather_code)||typeof current.rain!=='number'||!Number.isFinite(current.rain)||current.rain<0)return null;
 return {city,at:current.time*1000,code:current.weather_code,rain:current.rain};
}
export function drawDaily(d:AppData,now:Date,term:string,weather:WeatherReading|null,fresh:boolean,random=Math.random):AppData{
 const journal=d.restJournal??emptyJournal(),city=d.courtyard.city;
 const {day}=cityMoment(now,city);
 if(journal.draws[day]||d.courtyard.draws[day]||d.dailyDraws[day])return d;
 const pool:SlipEntry[]=[{id:'look',term,reason:`今天是${term}时段（按历表）；望远签每天都可抽取，无需天气或收藏。`.replace('是当季时段','处于当季')}];
 if(fresh&&weather&&weather.city===city&&readingWeather(weather)==='rain'&&weather.rain>0&&reliableWeather(weather,+now)){
  pool.push({id:'rain',term,weather,reason:`${cities[city].name}当前天气数据为雨，过去 15 分钟模型降雨量 ${weather.rain} 毫米。`});
 }
 if(term==='立春')pool.push({id:'spring',term,reason:'香港天文台历表显示已交立春，且尚未交雨水。'});
 const herbs=plantState(d);
 if(herbs.owned)pool.push({id:'leaf',term,reason:'草木册里已收藏紫苏，可打开标本对照叶形。'});
 if(herbs.peel)pool.push({id:'peel',term,reason:'草木册里已收藏陈皮，可打开标本对照内外表面。'});
 return {...d,restJournal:{...journal,draws:{...journal.draws,[day]:pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]}}};
}

export type RestSuggestion={id:RestKind;title:string;description:string}|{id:string;title:string;description:string;activity:Activity};
const quick:Record<RestKind,[string,string]>={
 look:['离屏看远','读完就可以放下设备。看向窗外或房间远处，让视线停在一个真实的远处物体上。'],
 drink:['喝几口水','手边有水就喝几口；也可以收起设备，去接一杯水。'],
 posture:['换个坐姿','松开肩膀，换个舒服的坐姿，让背和双脚都有支撑。'],
 hands:['松手停笔','先放下笔、鼠标或键盘，让手自然摊开，停一小会儿。'],
 quiet:['安静歇一会儿','可以什么也不做。需要的话，先写一句「回来从这里继续」，再把设备放下。'],
 walk:['走一小段','收起手机，在方便通行的地方走一小段，按自己的节奏回来。'],
 feet:['给双脚找支撑','让脚掌落地；够不到时，可以试试稳固的脚踏。'],
 sit:['坐下歇一会儿','附近有合适座位时，坐一会儿；不方便坐下就换一下双脚的受力。'],
 elsewhere:['换个地方歇一会儿','到方便停留的地方歇一下，让目光离开手头的工作。'],
};
export function conditions(d:AppData){
 const j=d.restJournal;
 return {away:j?.away??d.preference.mobility!=='seated',posture:j?.posture??(d.preference.posture==='upright'?'standing':'seated'),
  room:j?.room??(d.preference.space==='spacious'||d.preference.space==='outdoor'?d.preference.space:'small' as const),
  minutes:j?.minutes??d.preference.duration,focus:j?.focus??(d.preference.bodyNeed==='eyes'?'eyes':d.preference.bodyNeed==='wrists'?'hands':'general')};
}
export function restSuggestions(d:AppData):{options:RestSuggestion[];preference:Preference}{
 const c=conditions(d);
 const preference:Preference={...d.preference,scene:d.currentScene,mobility:c.away?'standing':'seated',posture:c.posture==='standing'?'upright':'seated',
  space:c.away?c.room:'seat',duration:c.minutes===120?60:c.minutes as Preference['duration'],bodyNeed:c.focus==='eyes'?'eyes':c.focus==='hands'?'wrists':d.currentNeed};
 const walkable=c.away&&c.minutes>=60&&d.currentScene!=='transit';
 const guided=c.posture==='standing'&&!c.away?[]:candidates(preference,d.profile,d.feedback)
  .filter(a=>c.focus==='general'||c.focus==='hands'&&a.focusTags.includes('wrists'))
  .sort((a,b)=>recommendationScore(b,preference,d.feedback,d.sessions,d.profile,d.recommendationEvents)-recommendationScore(a,preference,d.feedback,d.sessions,d.profile,d.recommendationEvents)||a.id.localeCompare(b.id));
 const ids:RestKind[]=c.posture==='standing'?['sit','quiet']:['hands','posture','feet','quiet'];
 if(walkable){if(c.posture==='standing')ids.splice(1,0,'walk','drink','elsewhere');else ids.unshift('walk','drink','elsewhere');}
 if(c.focus==='eyes')ids.unshift('look');
 if(c.focus==='brain')ids.unshift('quiet');
 if(c.focus==='hands')ids.unshift('hands');
 const options:RestSuggestion[]=[...new Set(ids)].map(id=>({id,title:quick[id][0],description:quick[id][1]}));
 const guidedOptions=guided.map(activity=>({id:activity.id,title:activity.title,description:activity.description,activity}));
 if(guidedOptions.length){
  const preferred=c.focus==='general'&&c.posture==='seated'&&!walkable;
  const [first,...others]=guidedOptions;
  options.splice(preferred?0:2,0,first);
  options.push(...others);
 }
 return {options,preference};
}
export function lifeItems(d:AppData):LifeItem[]{
 return [...lifePresets.map(([key,label,time])=>d.courtyard.reminders.find(x=>x.id===`life:${key}`)??{id:`life:${key}`,label,time,enabled:false}),
  ...d.courtyard.reminders.filter(x=>!lifePresets.some(([key])=>x.id===`life:${key}`))].map(x=>({...x,enabled:x.enabled!==false&&!d.restJournal?.disabledLife.includes(x.id)}));
}
export function dueLife(d:AppData,now:Date){
 const h=now.getHours();
 if(inHourWindow(h,d.reminder.dndStartHour,d.reminder.dndEndHour,false))return [];
 const day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return lifeItems(d).filter(x=>x.enabled&&x.lastDay!==day&&x.time===now.toTimeString().slice(0,5)).map(x=>({...x,lastDay:day}));
}
