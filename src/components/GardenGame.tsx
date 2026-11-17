'use client';
import {useEffect,useRef,useState} from 'react';
import type {AppData} from '../lib/types';
import {gardenPlaces,gardenProgress,type GardenPlace} from '../lib/gardenGame';
import {LeafCompanion} from './LeafCompanion';

export function GardenGame({data,day,term,weather,onEnter,onRecords}:{data:AppData;day:string;term:string;weather:string;onEnter:(place:GardenPlace)=>void;onRecords:()=>void}){
 const [place,setPlace]=useState<GardenPlace>('hall');
 const [walking,setWalking]=useState(false);
 const [help,setHelp]=useState(false);
 const viewport=useRef<HTMLDivElement>(null);
 const art=useRef<HTMLImageElement>(null);
 const positioned=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const selected=gardenPlaces[place];
 const growth=gardenProgress(data,day);
 function centerWorld(){if(positioned.current)return;const el=viewport.current;if(el&&window.innerWidth>760)el.scrollTop=el.scrollHeight*.25;positioned.current=true;}
 useEffect(()=>{if(art.current?.complete)centerWorld();return()=>{if(timer.current)clearTimeout(timer.current);};},[]);
 function travel(target:GardenPlace){
  if(timer.current)clearTimeout(timer.current);
  setPlace(target);setWalking(true);
  timer.current=setTimeout(()=>setWalking(false),data.staticLandscape?0:750);
 }
 return <section className="garden-game" aria-label="山居庭园探索">
  <div className="garden-viewport" ref={viewport}>
   <div className="garden-map">
    {/* The supplied reference is the world itself, with interactive landmarks placed on its paths. */}
    <img ref={art} onLoad={centerWorld} className="garden-world-art" src="/art/garden-world.png" alt="青绿山水庭园，溪流串起亭台、庭院、石桥和草木小圃" draggable="false"/>
    <div className="garden-fireflies" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${15+(i*23)%76}%`,top:`${25+(i*17)%60}%`,animationDelay:`${i*.7}s`}}/>)}</div>
    {(Object.entries(gardenPlaces) as [GardenPlace,typeof selected][]).map(([key,p])=><button key={key} className="garden-landmark" data-selected={place===key} style={{left:`${p.x}%`,top:`${p.y}%`}} onClick={()=>travel(key)} aria-pressed={place===key}>
     <span className="landmark-pin" aria-hidden="true">{key==='herbs'&&data.restJournal?.plantedAt?'芽':'◇'}</span><span className="landmark-name">{p.name}<small>{p.verb}</small></span>
    </button>)}
    <div className="garden-player" data-walking={walking} style={{left:`${selected.x-8}%`,top:`${selected.y+5}%`}} aria-label={`小竹在${selected.name}`}><LeafCompanion/><span>小竹</span></div>
    {Array.from({length:Math.min(growth.total,9)},(_,i)=><div key={i} className="garden-bloom" style={{left:`${20+(i%3)*7}%`,top:`${68+Math.floor(i/3)*3}%`}} aria-label={i===0?'休息后，小圃长出了新花':undefined} aria-hidden={i>0}><svg viewBox="0 0 40 48" width="32" height="40" aria-hidden="true"><path d="M20 45V20M20 36Q4 35 8 25q11-2 12 11M20 39q15 0 14-12-12 0-14 12" fill="#7f986a" stroke="#6d885d" strokeWidth="1.5"/>{[0,72,144,216,288].map(angle=><ellipse key={angle} cx="20" cy="11" rx="5" ry="8" fill="#e6c5bf" stroke="#bc9f91" strokeWidth=".6" transform={`rotate(${angle} 20 18)`}/>)}<circle cx="20" cy="18" r="3" fill="#d3b373"/></svg></div>)}
    <span className="garden-map-end">溪山无事 · 随处可歇</span>
   </div>
  </div>
  <aside className="garden-intro">
   <span className="garden-stamp">闲</span><h1>半日闲</h1><p className="garden-subtitle">把片刻留给自己</p>
   <div className="garden-time">{term} · {weather}<span>一方山水，一点闲情</span></div>
   <div className="garden-chapter"><span>你的山居</span><h2>{growth.chapter}</h2><div className="garden-growth" role="progressbar" aria-label="山居生长" aria-valuenow={growth.progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${growth.progress}%`}}/></div><p>{growth.stage===3?'山居已成，随时回来坐坐。':`再歇 ${growth.remaining} 次，添一重山居新意。`}</p><small>今日歇息 {growth.today} 次 · 累计 {growth.total} 次</small></div>
   <button className="garden-help" onClick={()=>setHelp(v=>!v)} aria-expanded={help}>怎么玩 <span>?</span></button>
   {help&&<p className="garden-help-copy">点一处地标，让小竹去走走。进入后，在现实中完成一小段休息，再把这片闲暇留在山居。画卷可以上下滑动，没有排名，也不用赶进度。</p>}
  </aside>
  <div className="garden-top-tools"><button onClick={onRecords}>游园手记 <span>↗</span></button><span>{day.replaceAll('-',' . ')}</span></div>
  <div className="garden-scroll-hint" aria-hidden="true">滑动画卷，沿溪寻访 <span>↓</span></div>
  <div className="garden-dialogue" aria-live="polite"><div className="garden-portrait"><LeafCompanion/></div><div className="garden-dialogue-copy"><span>小竹 · {selected.name}</span><p>{walking?'这就来，沿着石阶慢慢走……':selected.line}</p></div><button className="garden-enter" onClick={()=>onEnter(place)} disabled={walking}>{selected.verb} <span>→</span></button></div>
 </section>;
}
