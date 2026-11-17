import {localDay} from './date';

export const sites = {window:'窗边', canal:'水渠旁'} as const;
export type Site = keyof typeof sites;
export type Route = 'jar' | 'bed';
export type Weather = 'rain' | 'snow' | 'cloud' | 'clear' | 'unknown';
export const cities = {
 hangzhou:{name:'杭州',lat:30.27,lon:120.15},
 suzhou:{name:'苏州',lat:31.30,lon:120.58},
 shanghai:{name:'上海',lat:31.23,lon:121.47},
 beijing:{name:'北京',lat:39.90,lon:116.41},
 hongkong:{name:'香港',lat:22.32,lon:114.17},
 tokyo:{name:'东京',lat:35.68,lon:139.69},
 london:{name:'伦敦',lat:51.51,lon:-0.13},
 vancouver:{name:'温哥华',lat:49.28,lon:-123.12},
} as const;
export type City = keyof typeof cities;
export const slips = {
 gather:{number:'肆',name:'檐下收叶',line:'檐下还留着水声。提上药篓，在廊下歇一歇，带一株紫苏回院。',source:'香港浸会大学 · 紫苏叶',url:'https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00338'},
 rain:{number:'壹',name:'借雨',line:'檐声落竹，借一槽雨，送入缸中或药圃。',source:'香港天文台 · 二十四节气',url:'https://www.hko.gov.hk/en/gts/astronomy/Solar_Term.htm'},
 leaf:{number:'贰',name:'辨苏',line:'翻过一片苏叶，看看叶缘的齿、叶背的紫。',source:'香港浸会大学 · 紫苏叶',url:'https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00338'},
 peel:{number:'叁',name:'藏陈',line:'转一转陈皮，向光看橙褐外皮与浅色内面。',source:'香港浸会大学 · 陈皮',url:'https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00162'},
} as const;
export type Slip = keyof typeof slips;
type Draw = {id:Slip; term:string; weather:Weather; revealed:boolean};
export const quickBreaks = {walk:['离座走动','推开门后放下设备，在方便通行的地方慢慢走一小圈。'],look:['离屏看远','放下屏幕，看看窗外或房间远处，眼睛保持放松。'],drink:['喝水','如果手边有水，停下来喝几口。'],posture:['换姿势','松开肩膀，换到双脚有支撑、背部舒适的坐姿。'],hands:['松手停笔','放下笔或鼠标，让双手自然摊开，歇一会儿。'],quiet:['安静休息','把屏幕放到一边，安静坐一会儿。']} as const;
export type QuickBreak = keyof typeof quickBreaks;
export type Courtyard = {
 city:City; seeds:number; plants:Partial<Record<Site,string>>; wet:Site[]; jar:number; route:Route|null;
 draws:Record<string,Draw>; leaf:'尖叶'|'宽叶'|null; peel:boolean; displayed:('leaf'|'peel')[];
 notes:{kind:QuickBreak;at:string}[]; reminders:{id:string;label:string;time:string;lastDay?:string;private?:boolean;enabled?:boolean}[];
};
export const emptyCourtyard = ():Courtyard => ({city:'hangzhou',seeds:0,plants:{},wet:[],jar:0,route:null,draws:{},leaf:null,peel:false,displayed:[],notes:[],reminders:[]});
const inRecord = (record:object,key:unknown) => typeof key==='string'&&Object.hasOwn(record,key);
export function readCourtyard(value:unknown):Courtyard {
 const base=emptyCourtyard();
 if(!value||typeof value!=='object')return base;
 const d=value as Partial<Courtyard>;
 return {
  city:inRecord(cities,d.city)?d.city!:base.city,
  seeds:Number.isSafeInteger(d.seeds)&&d.seeds!>=0?d.seeds!:0,
  plants:Object.fromEntries((Object.keys(sites) as Site[]).filter(site=>typeof d.plants?.[site]==='string').map(site=>[site,d.plants![site]])),
  wet:Array.isArray(d.wet)?d.wet.filter(site=>inRecord(sites,site)):[],
  jar:Number.isFinite(d.jar)?Math.max(0,Math.min(4,d.jar!)):0,
  route:d.route==='jar'||d.route==='bed'?d.route:null,
  draws:d.draws&&typeof d.draws==='object'?Object.fromEntries(Object.entries(d.draws).filter(([day,draw])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&draw&&inRecord(slips,draw.id)&&typeof draw.term==='string')):{},
  leaf:d.leaf==='尖叶'||d.leaf==='宽叶'?d.leaf:null,
  peel:d.peel===true,
  displayed:Array.isArray(d.displayed)?d.displayed.filter(id=>(id==='leaf'&&d.leaf)||(id==='peel'&&d.peel)):[],
  notes:Array.isArray(d.notes)?d.notes.filter(note=>note&&inRecord(quickBreaks,note.kind)&&Number.isFinite(Date.parse(note.at))):[],
  reminders:Array.isArray(d.reminders)?d.reminders.filter(item=>item&&typeof item.id==='string'&&typeof item.label==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)):[],
 };
}

export function plantSeed(state:Courtyard,site:Site,now:Date):Courtyard {
 if(!state.seeds||state.plants[site])return state;
 return {...state,seeds:state.seeds-1,plants:{...state.plants,[site]:now.toISOString()}};
}

export function turnTrough(state:Courtyard,route:Route):Courtyard {
 const beds=(Object.keys(sites) as Site[]).filter(site=>state.plants[site]);
 return {...state,route,jar:route==='jar'?Math.min(state.jar+1,4):state.jar,
  wet:route==='bed'?[...new Set([...state.wet,...(beds.length?beds:['canal' as const])])]:state.wet};
}

export function drawSlip(state:Courtyard,now:Date,term:string,weather:Weather,random=Math.random):Courtyard {
 const day=localDay(now);
 if(state.draws[day])return state;
 // The working bamboo trough and jar are part of the first courtyard.
 const pool:Slip[]=weather==='rain'?['rain']:['gather'];
 if(weather!=='rain'&&(state.seeds||Object.keys(state.plants).length))pool.push('leaf');
 if(weather!=='rain'&&state.peel)pool.push('peel');
 if(weather!=='rain'&&state.peel&&/冬|雪|寒|霜/.test(term))pool.push('peel');
 if(weather!=='rain'&&Object.keys(state.plants).length)pool.push('leaf');
 return {...state,draws:{...state.draws,[day]:{id:pool[Math.floor(random()*pool.length)],term,weather,revealed:false}}};
}

export function weatherForCode(code:number):Weather {
 if(!Number.isInteger(code))return 'unknown';
 if([71,73,75,77,85,86].includes(code))return 'snow';
 if(code>=51)return 'rain';
 return code>=1?'cloud':code===0?'clear':'unknown';
}
