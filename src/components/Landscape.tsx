'use client';

import {useEffect,useRef,useState} from 'react';
import {chapterTitle,journeyStops,type JourneyVisit} from '../lib/journey';

function StillLandscape({stage}:{stage:number}){
 const boat=stage>0?355:199;
 return <svg viewBox="0 0 840 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <path fill="#e5ebe0" d="M0 0h840v340H0z"/>
  <circle cx="154" cy="66" r="34" fill="#efd2a2"/>
  <path fill="#b6cbbf" d="M0 164 100 72l78 74 107-94 98 89 104-65 96 80 135-100 122 89v98H0z"/>
  <path fill="#a3bdb0" d="m0 176 117-48 66 54 96-58 78 46 89-23 86 35 136-58 172 42v94H0z"/>
  <path fill="#aec8bb" d="M0 199h840v141H0z"/>
  <path fill="#cbdcd1" d="M18 218h130v2H18zm182 17h122v2H200zm-57 49h149v2H143zm204 28h116v2H347zM36 305h92v2H36z"/>
  <path fill="#779984" d="M403 305 522 213l71-20 93-111 154 103v155H423z"/>
  <path fill="#98b39e" d="m522 213 71-20 93-111-41 98-65 66-177 59z"/>
  <path fill="#628675" d="m686 82 154 103v155L707 213z"/>
  <path fill="#c7b69b" d="m374 295 117 4 32 12-117 5z"/>
  {stage>=2?<path fill="none" stroke="#dfcfb3" strokeWidth="7" d="M474 299h18v-10h18v-10h18v-10h18v-10h18v-10h18v-10h18v-10h18v-10h18v-10h18v-10h18"/>:<path fill="#e3ebdf" opacity=".8" d="M334 237q175 7 251-40t255-15v42q-149-18-242 29t-264-3z"/>}
  <path fill="#426c57" d="m561 229 16-39 17 39zm196-28 22-54 23 54zm-40 29 17-43 18 43zm-184 31 14-34 15 34z"/>
  <path fill="#e2cda8" d="m635 196 91 1 13 10-103 2z"/>
  <path stroke={stage===3?'#794936':'#8c7462'} strokeWidth="5" d="M647 195v-28m64 29v-29m-33 29v-29"/>
  <path fill={stage===3?'#335b4d':'#5f8174'} d="M625 172q30-10 54-39 25 27 57 37l-55 8z"/>
  {stage===3&&<path fill="#e8ba75" d="M687 178h8v10h-8z"/>}
  <g transform={`translate(${boat} 276)`}><path fill="#74533e" d="M0 0h83L68 13H16z"/><path fill="#d5b38b" d="M29 0 35-11h21l9 11z"/></g>
 </svg>;
}

export default function Landscape({stage,staticOnly=false}:{stage:number;staticOnly?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [rendered,setRendered]=useState<number|null>(null);
 useEffect(()=>{
  if(staticOnly)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let cancelled=false;
  async function render(){
   setRendered(null);
   const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
   const memory=(navigator as Navigator & {deviceMemory?:number}).deviceMemory;
   if(media.matches||connection?.saveData||(memory&&memory<4)||navigator.hardwareConcurrency<=2)return;
   try{
    const {paintLandscape}=await import('./landscape3d');
    if(cancelled||media.matches||!canvas.current)return;
    const started=performance.now();
    paintLandscape(canvas.current,stage);
    if(performance.now()-started<48)setRendered(stage);
   }catch{/* The static illustration is already in place. */}
  }
  const timer=setTimeout(()=>void render(),100);
  const onMotion=()=>void render();
  media.addEventListener('change',onMotion);
  return ()=>{cancelled=true;clearTimeout(timer);media.removeEventListener('change',onMotion);};
 },[stage,staticOnly]);
 const live=!staticOnly&&rendered===stage;
 return <div className="landscape-art" role="img" aria-label={stage?journeyStops[stage-1].title:'山水渡口，渡船尚在江面'} data-mode={live?'3d':'static'}>
  <StillLandscape stage={stage}/>
  {!staticOnly&&<canvas ref={canvas} width={840} height={340} hidden={!live} aria-hidden="true"/>}
 </div>;
}

export function JourneyCard({visits,staticOnly,onRecords}:{visits:JourneyVisit[];staticOnly:boolean;onRecords?:()=>void}){
 const stage=visits.length;
 return <section className="journey-card" aria-labelledby="journey-title">
  <div className="journey-heading"><div><span className="section-kicker">山水游历 · 首章</span><h2 id="journey-title">{chapterTitle}</h2></div><span className="journey-count">{stage} / 3 站</span></div>
  <Landscape stage={stage} staticOnly={staticOnly}/>
  <div className="journey-caption"><strong>{stage?journeyStops[stage-1].title:'渡口待船'}</strong><span>{stage===3?'长卷已解锁':'每个本地日历日首次确认完成，前进一步。'}</span>{onRecords&&<button className="text-button" onClick={onRecords}>查看路线</button>}</div>
  {!onRecords&&<ol className="route-list">{journeyStops.map((stop,index)=><li key={stop.place}><strong>{stop.place}</strong><span>{visits[index]?.day??'待到达'}</span></li>)}</ol>}
  {!onRecords&&stage===3&&<details className="journey-scroll"><summary><span className="journey-seal">松风<br/>游历</span> 展开完整长卷</summary><div className="scroll-scenes">{journeyStops.map((stop,index)=><figure key={stop.place}><Landscape stage={index+1} staticOnly/><figcaption>{stop.title} · {visits[index].day}</figcaption></figure>)}</div></details>}
 </section>;
}
