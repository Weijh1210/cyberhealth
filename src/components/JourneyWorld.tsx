'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {chapterTitle,journeyStops} from '../lib/journey';
import {waypointPosition,worldWaypoints} from './worldGeometry';

function StillWorld({stage}:{stage:number}){
 return <svg viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true">
  <defs><linearGradient id="world-water" x2="0" y2="1"><stop stopColor="#d4ddc8"/><stop offset="1" stopColor="#547e73"/></linearGradient></defs>
  <path fill="url(#world-water)" d="M0 0h1000v720H0z"/>
  <circle fill="#f5dfa7" cx="267" cy="147" r="48"/>
  <path fill="#a3b9aa" d="m0 200 80-65 55 47 73-64 93 72 72-69 91 82 77-62 97 53 56-49 93 51 108-79 105 72v164H0z"/>
  <path fill="#83a395" d="m0 239 83-48 115 52 84-46 79 36 102-30 94 46 129-49 82 40 108-58 124 57v95H0z"/>
  <path fill="#b3c9b7" d="M122 501h71v2h-71zm41 63h105v2H163zm582-158h88v2h-88zm58 162h103v2H803zm-249 78h75v2h-75zm-220 13h65v2h-65z"/>
  <path fill="#506f61" d="m286 459 56-92 105-62 112-38 139 67 66 75-8 80-118 61-129 52-115-31-82-44z"/>
  <path fill="#759482" d="m286 447 56-92 105-62 112-38 139 67 66 75-8 80-118 61-129 52-115-31-82-44z"/>
  <path fill="#8ba58a" d="m342 355 105-62 112-38-35 115-130 57-108 20zm182 15 174-48 66 75-122 27-133 166-115-31z"/>
  <path fill="#a58d65" d="m315 442 50-14 32 28-58 18-25-12z"/>
  <path fill="none" stroke={stage>=2?'#ddc99f':'#abb697'} strokeWidth="12" strokeDasharray="5 4" d="m352 444 45 12 47-12 52-32 31-36 40-18 46-20"/>
  <path fill="#4a7462" d="m394 422 17-55 20 55zm43-53 14-41 16 41zm226 53 18-55 20 55zm-19 67 22-57 21 57zm-158 39 17-55 20 55zm-31-19 12-39 15 39zm248-107 15-49 20 49zm-168-67 15-52 18 52zm-163 57 12-37 14 37z"/>
  <path fill="#b4a283" d="m576 330 64-19 26 19-65 24z"/>
  <path fill="none" stroke="#84583e" strokeWidth="4" d="M593 342v-30m50 17v-26m-27 35v-22M345 449v-17m32 7v-17"/>
  <path fill="#365f53" d="m573 320 34-43 59 22-29 17zm-238 116 17-28 37 14-14 10z"/>
  {stage===3&&<path fill="#f7cc82" d="M599 321h5v8h-5zm36-10h5v8h-5z"/>}
  {stage<2&&<path fill="#d8dfc5" opacity=".55" d="M412 413q70-26 185-18l-47 30q-89 23-138 2z"/>}
  <path fill="#946849" transform={stage>=1?'translate(29 7)':undefined} d="m238 440 51-13-11 17-26 8z"/>
 </svg>;
}

export default function JourneyWorld({stage,staticOnly,children}:{stage:number;staticOnly:boolean;children:ReactNode}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [rendered,setRendered]=useState<number|null>(null);
 useEffect(()=>{
  if(staticOnly)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let cancelled=false;
  async function render(){
   setRendered(null);
   const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
   if(reduced.matches||device.hardwareConcurrency<=2||(device.deviceMemory??4)<4||device.connection?.saveData)return;
   try{
    const {paintWorld}=await import('./paintWorld');
    if(cancelled||reduced.matches||!canvas.current)return;
    const started=performance.now();
    paintWorld(canvas.current,stage);
    if(performance.now()-started<48)setRendered(stage);
   }catch{/* The full-screen SVG is already visible. */}
  }
  const timer=setTimeout(()=>void render(),100);
  const onMotion=()=>void render();
  reduced.addEventListener('change',onMotion);
  return ()=>{cancelled=true;clearTimeout(timer);reduced.removeEventListener('change',onMotion);};
 },[stage,staticOnly]);
 const live=!staticOnly&&rendered===stage;
 return <div className="world-scene">
  <div className="landscape-art world-art" role="img" aria-label={`${chapterTitle}，${stage?journeyStops[stage-1].title:'山水渡口'}`} data-mode={live?'3d':'static'}>
   <StillWorld stage={stage}/>
   {!staticOnly&&<canvas ref={canvas} width={1600} height={1152} hidden={!live} aria-hidden="true"/>}
  </div>
  {children}
 </div>;
}

export function WorldWaypoints({stage,onPick}:{stage:number;onPick:(index:number)=>void}){
 const current=Math.min(stage,worldWaypoints.length-1);
 return <div className="world-waypoints" role="group" aria-label="地图站点">
  {worldWaypoints.map(({place},index)=><button key={place} type="button" style={waypointPosition(index)} className="world-pin"
   aria-current={index===current?'location':undefined} onClick={()=>onPick(index)}>
   <span className="world-pin-number">0{index+1}</span><span>{place}</span>
  </button>)}
 </div>;
}
