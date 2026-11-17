import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {SlipEntry} from '../lib/restJournal';

type MotionAPI=typeof DeviceMotionEvent&{requestPermission?:()=>Promise<'granted'|'denied'>};

export function SlipDraw({entry,archived,staticOnly,onDraw,children}:{entry?:SlipEntry;archived:boolean;staticOnly:boolean;onDraw:()=>void;children:ReactNode}){
 const [phase,setPhase]=useState<'idle'|'drawing'|'lifted'|'revealed'>('idle');
 const [armed,setArmed]=useState(false);
 const [message,setMessage]=useState('');
 const started=useRef(false);
 const mounted=useRef(false);
 const timer=useRef<number|undefined>(undefined);
 const reveal=useRef<HTMLButtonElement>(null);
 const runRef=useRef<()=>void>(()=>{});
 const available=!archived&&!entry;
 const showResult=Boolean(entry&&(phase==='idle'||phase==='revealed'));
 const motionCapable=typeof window!=='undefined'&&window.isSecureContext&&'DeviceMotionEvent' in window;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;window.clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(phase==='lifted')reveal.current?.focus({preventScroll:true});},[phase]);
 function draw(){
  if(!available||started.current)return;
  started.current=true;
  setArmed(false);setMessage('');
  const still=staticOnly||matchMedia('(prefers-reduced-motion: reduce)').matches;
  setPhase(still?'lifted':'drawing');
  onDraw();
  if(!still)timer.current=window.setTimeout(()=>setPhase('lifted'),1080);
 }
 runRef.current=draw;
 useEffect(()=>{
  if(!armed||!available)return;
  let last:number[]|null=null,peak=0;
  const handle=(event:DeviceMotionEvent)=>{
   if(document.visibilityState==='hidden')return;
   const value=event.accelerationIncludingGravity;
   const raw=event.acceleration;
   const valid=(v:DeviceMotionEventAcceleration|null)=>v&&[v.x,v.y,v.z].every(x=>typeof x==='number'&&Number.isFinite(x));
   const axes=valid(value)?[value!.x!,value!.y!,value!.z!]:valid(raw)?[raw!.x!,raw!.y!,raw!.z!]:null;
   if(!axes)return;
   const impulse=last?Math.hypot(...axes.map((x,i)=>x-last![i])):0;
   last=axes;
   if(impulse<9)return;
   const stamp=performance.now();
   if(peak&&stamp-peak>=45&&stamp-peak<=650){runRef.current();return;}
   if(!peak||stamp-peak>650)peak=stamp;
  };
  window.addEventListener('devicemotion',handle,{passive:true});
  const expires=window.setTimeout(()=>{setArmed(false);setMessage('没检测到晃动。可以重试，也可以直接点抽一支。');},18000);
  return()=>{window.removeEventListener('devicemotion',handle);window.clearTimeout(expires);};
 },[armed,available]);
 async function enable(){
  if(!motionCapable){setMessage('这个浏览器当前无法读取晃动，可以直接点抽一支。');return;}
  try{
   const Motion=window.DeviceMotionEvent as MotionAPI;
   if(Motion.requestPermission&&await Motion.requestPermission()!=='granted')throw new Error('denied');
   if(mounted.current&&!started.current){setArmed(true);setMessage('已就绪，轻轻来回晃两下手机。');}
  }catch{if(mounted.current)setMessage('未取得动作感应权限，可以直接点抽一支。');}
 }
 return <section className="slip-ritual" aria-labelledby="slip-title" data-phase={phase} data-static={staticOnly}>
  <div className="slip-ritual-art" aria-hidden="true">
   <svg viewBox="0 0 184 170" focusable="false">
    <path d="M13 147h158m-141 7h126" stroke="currentColor" opacity=".25"/>
    <g className="slip-cylinder">
     <g stroke="#865b32" strokeWidth="5" strokeLinecap="round"><path d="m75 77-18-45m27 42L80 22m11 53 10-45m-2 51 23-45m-45 47L67 47m34 34 30-37"/></g>
     <path d="M55 77q35-15 70 0l-8 63q-27 15-54 0Z" fill="#ab7849" stroke="#654628" strokeWidth="2"/>
     <path d="M61 91q29 12 59 0m-57 37q28 12 55 0M75 90l3 52m24-49-2 50" fill="none" stroke="#654628" opacity=".65"/>
     <ellipse cx="90" cy="78" rx="35" ry="8" fill="#c79c6d" stroke="#654628" strokeWidth="2"/>
     <text x="90" y="117" textAnchor="middle" fill="#fdf4df" fontSize="20">签</text>
    </g>
    {(phase!=='idle'||entry)&&<g className="slip-flying"><rect x="82" y="7" width="20" height="88" rx="2" fill="#f7e7ba" stroke="#865b32" strokeWidth="1.5"/><path d="M87 21h10m-10 5h10m-10 5h10" stroke="#a3403d"/><text x="92" y="53" textAnchor="middle" fill="#644331" fontSize="12">节<tspan x="92" dy="15">气</tspan></text></g>}
   </svg>
  </div>
  <div className="slip-ritual-copy"><h2 id="slip-title">今日节气签</h2>
   {available&&<><p>每个当地日期抽一支，签文会收进手记。</p><div className="rest-actions">
    <button className="rest-primary" onClick={draw}>抽一支</button>
    <button onClick={()=>void enable()} disabled={armed}>晃动手机抽签</button>
   </div>{message&&<p role="status">{message}</p>}</>}
   {phase==='drawing'&&<p role="status">签筒里有一支签要出来了。</p>}
   {phase==='lifted'&&entry&&<><p>签已出筒，翻开看看今天抽到什么。</p><button ref={reveal} className="rest-primary" onClick={()=>setPhase('revealed')}>揭签</button></>}
   {(showResult||archived)&&children}
  </div>
 </section>;
}
