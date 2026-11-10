'use client';

import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {beds,flowSites,objects,paintCourtyard,project,view,waterPath,type Point} from './courtyardArt';
import {cities,drawSlip,plantSeed,sites,slips,turnTrough,weatherForCode,type City,type Courtyard as Yard,type QuickBreak,type Route,type Site,type Weather} from '../lib/courtyard';
import {localDay} from '../lib/date';

type Update=(change:(yard:Yard)=>Yard)=>void;
const weatherLabels:Record<Weather,string>={clear:'晴',cloud:'多云或雾',snow:'雪',rain:'雨',unknown:'天气暂不可用'};
const herbSource='https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00338';
const peelSource='https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00162';
const formulaSource='https://sys01.lib.hkbu.edu.hk/cmed/cmfid/detail.php?id=F00004&lang=chs';

export function useCourtyardWeather(city:City){
 const [current,setCurrent]=useState<{city:City;weather:Weather;time:string;lastRain?:number}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  let request:AbortController|undefined;
  async function refresh(){
   request?.abort();
   request=new AbortController();
   const signal=request.signal;
   const {lat,lon}=cities[city];
   const pending=request;
   const timeout=setTimeout(()=>pending.abort(),8000);
   try{
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code&timezone=auto`,{signal});
    if(!response.ok)throw new Error('weather');
    const {current}=await response.json();
    if(typeof current?.time!=='string'||!Number.isInteger(current?.weather_code))throw new Error('weather');
    if(!controller.signal.aborted&&!signal.aborted)setCurrent(previous=>{const weather=weatherForCode(current.weather_code);return {city,weather,time:current.time,lastRain:weather==='rain'?Date.now():previous?.city===city?previous.lastRain:undefined};});
   }catch{
    if(!controller.signal.aborted&&request?.signal===signal)setCurrent({city,weather:'unknown',time:''});
   }finally{clearTimeout(timeout);}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),15*60000);
  return ()=>{controller.abort();request?.abort();clearInterval(timer);};
 },[city]);
 return current?.city===city?current:{city,weather:'unknown' as const,time:'',lastRain:undefined};
}

function position(point:Point):CSSProperties{
 const [x,y]=project(point);
 return {left:`${x/view.width*100}%`,top:`${y/view.height*100}%`};
}
export function YardArt({yard,weather,hour,term,staticOnly,lesson=false,flow=0,pose,elapsed=0,damp=false,children}:{yard:Yard;weather:Weather;hour:number;term:string;staticOnly:boolean;lesson?:boolean;flow?:number;pose?:'chin-tuck'|'scapular-squeeze';elapsed?:number;damp?:boolean;children?:ReactNode}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [ready,setReady]=useState(false);
 const [motion,setMotion]=useState(false);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>setMotion(!media.matches&&!staticOnly);
  sync();media.addEventListener('change',sync);
  return ()=>media.removeEventListener('change',sync);
 },[staticOnly]);
 useEffect(()=>{
  if(!canvas.current)return;
  try{setReady(paintCourtyard(canvas.current,yard,weather,hour,term,lesson,pose,motion?elapsed:0,damp));}
  catch{setReady(false);}
 },[yard,weather,hour,term,lesson,pose,elapsed,motion,damp]);
 const paths=flowSites(yard);
 return <div className={`yard-scene ${lesson?'yard-lesson':''}`} data-mode={ready&&motion?'3d':'static'}>
  <svg viewBox="0 0 1200 680" preserveAspectRatio="none" className="yard-still" aria-hidden="true">
   <rect width="1200" height="680" fill="#96ada1"/><path d="M0 228 143 115 247 202 390 134 530 231 709 148 845 190 1020 123 1200 211V390H0Z" fill="#76968a"/>
   <path d="M0 415H1200V680H0Z" fill={weather==='rain'?'#62756c':'#909783'}/>
   <path d="M0 0H1200V91H0ZM52 85h48v536H52Zm1047 0h48v536h-48Z" fill="#413e32"/>
   <path d="M152 376h309v22H152Zm16 22h18v118h-18Zm257 0h18v118h-18Z" fill="#745139"/>
   {Object.entries(beds).map(([key,p])=>{const [x,y]=project(p);return <g key={key}><ellipse cx={x} cy={y-14} rx="64" ry="22" fill={yard.wet.includes(key as Site)?'#3f3028':'#775740'}/>{yard.plants[key as Site]&&<path d={`M${x} ${y-14}q-33-43-22-80 34 13 25 48 12-36 39-36-5 40-42 68`} fill="#594458"/>}</g>;})}
   <ellipse cx="966" cy="425" rx="57" ry="62" fill="#81593f"/><ellipse cx="966" cy="375" rx="38" ry="15" fill={yard.jar?'#83afa5':'#3e3027'}/>
  </svg>
  <canvas ref={canvas} width={1440} height={816} hidden={!ready} aria-hidden="true"/>
  <svg className="yard-effects" viewBox="0 0 1200 680" preserveAspectRatio="none" aria-hidden="true">
   {weather==='rain'&&Array.from({length:68},(_,i)=><line key={i} x1={80+i*197%1040} y1={110+i*73%410} x2={72+i*197%1040} y2={128+i*73%410} className={motion?'yard-rain':''} style={{animationDelay:`-${i%13*.09}s`}}/>)}
   {damp&&weather!=='rain'&&[0,1,2,3].map(i=><line key={i} x1={793+i*4} x2={793+i*4} y1={116+i*34} y2={123+i*34} className={motion?'yard-rain':''} style={{animationDelay:`-${i*.28}s`}}/>)}
   {weather==='snow'&&Array.from({length:37},(_,i)=><circle key={i} cx={80+i*197%1040} cy={108+i*73%430} r={1+i%3} fill="#ebf0e7" className={motion?'yard-rain':''} style={{animationDelay:`-${i%13*.09}s`}}/>)}
   {yard.route&&paths.map(site=><polyline key={`${site}-${flow}`} points={waterPath(yard.route,site).map(p=>project(p).join(',')).join(' ')} className={motion&&flow?'yard-flow moving':'yard-flow'}/>)}
  </svg>
  {children}
 </div>;
}

export default function Courtyard({yard,now,term,staticOnly,weather,change,onStart,onQuick,onJournal,onRhythm,lesson=false,pose,elapsed=0}:{yard:Yard;now:Date;term:string;staticOnly:boolean;weather:{weather:Weather;time:string;lastRain?:number};change:Update;onStart:()=>void;onQuick:(kind:QuickBreak)=>void;onJournal:()=>void;onRhythm:()=>void;lesson?:boolean;pose?:'chin-tuck'|'scapular-squeeze';elapsed?:number}){
 const [panel,setPanel]=useState<'slips'|'water'|'leaf'|'peel'|null>(null);
 const [selected,setSelected]=useState(false);
 const [leaf,setLeaf]=useState<'尖叶'|'宽叶'>('尖叶');
 const [back,setBack]=useState(false);
 const [turned,setTurned]=useState(false);
 const [sound,setSound]=useState(false);
 const [flow,setFlow]=useState(0);
 const [message,setMessage]=useState('');
 const day=localDay(now);
 const damp=weather.lastRain!==undefined&&now.getTime()-weather.lastRain<45*60000;
 const draw=yard.draws[day];
 const saved=draw&&slips[draw.id];
 useEffect(()=>{
  if(!sound)return;
  const audio=new AudioContext();
  const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);
  const samples=buffer.getChannelData(0);
  let value=0;
  for(let i=0;i<samples.length;i++){value=value*.93+(Math.random()-.5)*.07;samples[i]=value;}
  const source=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter();
  source.buffer=buffer;source.loop=true;gain.gain.value=.27;filter.type='lowpass';filter.frequency.value=weather.weather==='rain'?1700:460;
  source.connect(filter).connect(gain).connect(audio.destination);source.start();
  void audio.resume().catch(()=>{});
  return ()=>{void audio.close();};
 },[sound,weather.weather]);
 function open(next:typeof panel){setPanel(next);setMessage('');}
 function drop(site:Site){
  if(!yard.seeds||yard.plants[site])return;
  change(current=>plantSeed(current,site,now));
  setSelected(false);setMessage(`紫苏已种在${sites[site]}。`);
 }
 function water(route:Route){
  change(current=>turnTrough(current,route));
  setFlow(value=>value+1);
  setMessage(route==='jar'?(yard.jar>=4?'水已到缸口。':'水沿竹槽入缸，水位升了一格。'):'浅渠把水送进药圃，土色变深了。');
 }
 const pin=(label:string,point:Point,onClick:()=>void)=> <button type="button" className="yard-pin" style={position(point)} onClick={onClick}>{label}</button>;
 return <>
  <div className="yard-caption">
   <span><i/> {term} · {weatherLabels[weather.weather]}</span>
   <label><span className="yard-sr">天气城市</span><select aria-label="天气城市" value={yard.city} onChange={e=>change(current=>({...current,city:e.target.value as City}))}>{Object.entries(cities).map(([id,{name}])=><option key={id} value={id}>{name}</option>)}</select></label>
   <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo</a>
   {damp&&weather.weather!=='rain'&&<small>檐下还在滴水</small>}
   <small>{weather.time?weather.time.replace('T',' '):'暂无更新时间，可照常入院'}</small>
   <button type="button" onClick={()=>setSound(!sound)} aria-pressed={sound}>{sound?'静音':'开启院声'}</button>
  </div>
  <YardArt yard={yard} weather={weather.weather} hour={now.getHours()} term={term} staticOnly={staticOnly} flow={flow} damp={damp} lesson={lesson} pose={pose} elapsed={elapsed}>
   {!lesson&&<>
   {pin('竹签筒',objects.slips,()=>open('slips'))}
   <button className="yard-pin" style={position(objects.basket)} draggable={yard.seeds>0} onDragStart={e=>{e.dataTransfer.setData('text/plain','perilla');setSelected(true);}} onClick={()=>yard.seeds?setSelected(!selected):onStart()} aria-pressed={selected}>药篓{yard.seeds>0&&` · ${yard.seeds} 苗`}</button>
   {pin('扳竹槽',objects.trough,()=>open('water'))}
   {pin(`陶缸 · ${yard.jar}/4`,objects.jar,()=>open('water'))}
   {pin('木门',objects.door,()=>onQuick('walk'))}
   {pin('竹帘',objects.blind,()=>onQuick('look'))}
   <div className="yard-books">{pin('手记册',objects.journal,onJournal)}{pin('时辰簿',objects.rhythm,onRhythm)}</div>
   {(Object.keys(sites) as Site[]).map(site=><button key={site} className={`yard-pin yard-site ${selected&&!yard.plants[site]?'available':''}`} style={position(beds[site])} onDragOver={e=>{if(selected&&!yard.plants[site])e.preventDefault();}} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')==='perilla')drop(site);}} onClick={()=>yard.plants[site]?open('leaf'):selected?drop(site):setMessage('先从药篓选一株紫苏苗。')}>{sites[site]}{yard.plants[site]?' · 紫苏':''}</button>)}
   </>}
  </YardArt>
  <div className="yard-object-bar" hidden={lesson}>
   <button onClick={()=>open('slips')}>抽节气签</button>
   {yard.seeds>0&&<button onClick={onStart}>再去收叶</button>}
   <button onClick={()=>yard.seeds?setSelected(!selected):onStart()} aria-pressed={selected}>药篓{yard.seeds>0&&`（${yard.seeds} 苗）`}</button>
   <button onClick={()=>open('water')}>扳竹槽</button>
   <button onClick={()=>open('leaf')}>紫苏叶</button>
   <button onClick={()=>open('peel')}>陈皮匣</button>
   <button onClick={()=>onQuick('look')}>拨竹帘</button>
   <button onClick={()=>onQuick('walk')}>推木门</button>
   <button onClick={onJournal}>手记册</button><button onClick={onRhythm}>时辰簿</button>
  </div>
  {!lesson&&(selected||message)&&<div className="yard-action" role="status">
   {selected?<><strong>已选紫苏苗</strong><span>点选或拖到空着的种植位。</span>{(Object.keys(sites) as Site[]).map(site=><button key={site} onClick={()=>drop(site)} disabled={Boolean(yard.plants[site])}>种在{sites[site]}</button>)}<button onClick={()=>setSelected(false)}>取消</button></>:message}
  </div>}
  {!lesson&&panel&&<section className="yard-action yard-workbench" aria-label={{slips:'节气签',water:'竹槽水路',leaf:'紫苏标本',peel:'陈皮标本'}[panel]}>
   <button className="yard-close" onClick={()=>open(null)} aria-label="收起院中操作">×</button>
   {panel==='slips'&&<>
    <h2>节气签</h2>
    {!draw?<button className="primary" onClick={()=>change(current=>drawSlip(current,now,term,weather.weather))}>从竹筒抽一支</button>:<>
     <div className="yard-slip"><b>{saved.number}</b><span>{draw.revealed?saved.name:'签背朝上'}</span></div>
     {!draw.revealed?<button onClick={()=>change(current=>({...current,draws:{...current.draws,[day]:{...current.draws[day],revealed:true}}}))}>翻签看文</button>:<>
      <p>{saved.line}</p>
      <details><summary>翻看依据</summary><p>抽签时是{draw.term}，{weatherLabels[draw.weather]}。{draw.id==='rain'?'雨天且院中已有竹槽、陶缸与药圃。':draw.id==='gather'?'廊下有药篓与木凳，可以坐着收一株紫苏。':draw.id==='leaf'?'药篓或药圃已有紫苏。':'药柜已有陈皮标本，寒冷节气更常入签池。'}签文为原创院中活动。</p><a href={saved.url} target="_blank" rel="noreferrer">{saved.source}</a></details>
      <button onClick={()=>draw.id==='gather'?onStart():open(draw.id==='rain'?'water':draw.id)}>{draw.id==='rain'?(weather.weather==='rain'?'去扳竹槽':'用存雨试水路'):draw.id==='gather'?'拿起药篓':draw.id==='leaf'?'去翻紫苏叶':'去转陈皮'}</button>
     </>}
    </>}
   </>}
   {panel==='water'&&<>
    <h2>竹槽分水</h2><p>{weather.weather==='rain'?'檐下有雨。':'用院中存雨试两条水路。'}扳动竹槽，让水去你选的位置。</p>
    <button aria-pressed={yard.route==='jar'} onClick={()=>water('jar')}>引向陶缸</button>
    <button aria-pressed={yard.route==='bed'} onClick={()=>water('bed')}>引向药圃</button>
    <p>缸中水位 {yard.jar}/4 · 湿土 {yard.wet.map(site=>sites[site]).join('、')||'暂无'}</p>
   </>}
   {panel==='leaf'&&<>
    <h2>辨苏</h2>
    <svg className="yard-specimen" viewBox="0 0 120 96" role="img" aria-label={`紫苏${leaf}${back?'背面':'正面'}`}>
     <path fill={back?'#66435d':'#597246'} d={leaf==='尖叶'?'M57 85 46 77 35 76 39 70 26 64 31 58 23 49 31 45 30 35 40 34 42 24 51 23 57 10 64 18 71 4 75 21 85 23 84 31 96 37 90 43 99 52 91 57 93 67 82 67 79 77 69 77Z':'M57 85 45 78 32 79 34 72 20 66 24 59 15 50 22 45 21 36 33 34 37 24 48 25 55 13 63 19 71 10 78 23 88 23 87 32 102 39 95 46 104 55 96 60 97 70 85 71 80 80 69 78Z'}/>
     <path d="M50 93Q65 65 70 20M62 72 35 58m30 3 23-16M67 51 44 36m25 2 13-10" fill="none" stroke="#d2bd9e" strokeWidth="1.6"/>
    </svg>
    <p>{back?'叶背偏紫，主脉清楚。':'叶缘有锯齿，叶尖收细。'}</p>
    <button onClick={()=>setLeaf('尖叶')} aria-pressed={leaf==='尖叶'}>尖叶</button><button onClick={()=>setLeaf('宽叶')} aria-pressed={leaf==='宽叶'}>宽叶</button>
    <button onClick={()=>setBack(!back)}>翻看叶片</button>
    <button disabled={!Object.keys(yard.plants).length||yard.leaf===leaf} onClick={()=>change(current=>({...current,leaf}))}>{yard.leaf===leaf?'已收入手记':'制成紫苏标本页'}</button>
    {!Object.keys(yard.plants).length&&<p>先种一株紫苏，即可从自己的院子取样。</p>}
    <a href={herbSource} target="_blank" rel="noreferrer">香港浸会大学 · 紫苏叶</a>
   </>}
   {panel==='peel'&&<>
    <h2>藏陈</h2>
    <svg className="yard-specimen" viewBox="0 0 120 96" role="img" aria-label={turned?'陈皮内面':'陈皮外面'}>
     <path d="M23 62Q12 40 41 27q20-9 41 1 34 16 14 47-16 17-29 2-6-9-16-6-22 15-28-9Z" fill={turned?'#dcc7a2':'#ad6033'} stroke="#805536" strokeWidth="3"/>
     {Array.from({length:48},(_,i)=><circle key={i} cx={32+i*29%57} cy={34+i*17%32} r={.55+i%3*.18} fill={turned?'#a98b68':'#6f422b'}/>)}
    </svg>
    <p>{turned?'浅色内面，纹理像细纤维。':'橙褐外皮上能看到许多细小的点。'}</p>
    <button onClick={()=>setTurned(!turned)}>转动陈皮</button><button disabled={!turned||yard.peel} onClick={()=>change(current=>({...current,peel:true}))}>{yard.peel?'已收入手记':'收存陈皮标本'}</button>
    <a href={peelSource} target="_blank" rel="noreferrer">香港浸会大学 · 陈皮</a>
   </>}
  </section>}
 </>;
}

export function CourtyardJournal({yard,change}:{yard:Yard;change:Update}){
 const [picked,setPicked]=useState<'leaf'|'peel'|null>(null);
 const [hint,setHint]=useState('');
 function place(id:'leaf'|'peel'){
  if(picked!==id){setHint('先选标本，再找它在方剂中的位置。');return;}
  change(current=>current.displayed.includes(id)?current:{...current,displayed:[...current.displayed,id]});
  setPicked(null);setHint('标本已摆上本草案。');
 }
 return <>
  <section className="break-panel"><h2>院中手记</h2>
   <p>药篓 {yard.seeds} 苗 · 陶缸 {yard.jar}/4</p>
   {Object.keys(yard.plants).length?<ul>{(Object.keys(sites) as Site[]).filter(site=>yard.plants[site]).map(site=><li key={site}>{sites[site]} · 紫苏{yard.wet.includes(site)?' · 土壤已润':''}</li>)}</ul>:<p>两处药圃还空着。</p>}
   <details><summary>旧签 · {Object.keys(yard.draws).length} 支</summary><ul>{Object.entries(yard.draws).sort(([a],[b])=>b.localeCompare(a)).map(([day,draw])=><li key={day}>{day} · {draw.term} · {draw.revealed?slips[draw.id].name:`第 ${slips[draw.id].number} 签，未翻`}</li>)}</ul></details>
  </section>
  <section className="break-panel"><h2>本草案 · 香苏散</h2><p>选一份标本，再摆到历史方剂中的对应位置。</p>
   <div className="break-actions">
    <button className="outline-button" disabled={!yard.leaf} aria-pressed={picked==='leaf'} onClick={()=>setPicked('leaf')}>紫苏{yard.leaf||'叶'}标本</button>
    <button className="outline-button" disabled={!yard.peel} aria-pressed={picked==='peel'} onClick={()=>setPicked('peel')}>陈皮标本</button>
   </div>
   <div className="yard-formula">
    <button onClick={()=>place('leaf')} disabled={yard.displayed.includes('leaf')}>君 · 紫苏叶{yard.displayed.includes('leaf')?' · 已展出':''}</button>
    <span>臣 · 香附</span>
    <button onClick={()=>place('peel')} disabled={yard.displayed.includes('peel')}>佐 · 陈皮{yard.displayed.includes('peel')?' · 已展出':''}</button>
    <span>使 · 甘草</span>
   </div>
   {hint&&<p role="status">{hint}</p>}
   {yard.displayed.length===2&&<p>展陈已解锁。香苏散见《太平惠民和剂局方》，传统证候为外感风寒、气郁不舒。本页用于历史图谱展陈。</p>}
   <a href={formulaSource} target="_blank" rel="noreferrer">香港浸会大学 · 香苏散图谱</a>
  </section>
 </>;
}
