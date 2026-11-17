import {useId} from 'react';
import type {Weather} from '../lib/courtyard';
import {seasonalContents,type Season} from '../lib/seasonalContent';

export function RestIllustration({season,weather,term,variant='landscape'}:{season:Season;weather:Weather;term:string;variant?:'window'|'landscape'}){
 const id=useId();
 const blossom=season==='spring',leaves=season==='summer'||season==='autumn';
 const termIndex=Math.max(0,seasonalContents.findIndex(x=>x.name.zh===term));
 return <svg className="ink-landscape" viewBox="0 0 410 216" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${term}${variant==='window'?'窗景':'水墨插画'}`}>
  <defs><pattern id={id} width="6" height="5" patternUnits="userSpaceOnUse"><path d="M1 1h1m2 3h1" stroke="currentColor" strokeOpacity=".16"/></pattern></defs>
  <rect width="410" height="216" fill={`url(#${id})`} opacity=".24"/>
  <g className="art-orb" fill="currentColor"><circle cx="293" cy="63" r={22+termIndex%6}/></g>
  {variant==='landscape'?<>
  <path className="art-far" d="M0 158Q42 143 76 118L119 79Q131 66 146 79L180 107 215 86Q224 81 237 95L271 121 303 106Q313 100 329 113L410 159V216H0Z"/>
  <path className="art-mid" d="M0 176Q35 158 70 159Q87 156 118 132Q141 110 164 129L205 150Q233 142 264 156L293 169Q322 151 349 132Q374 118 410 142V216H0Z"/>
  <path className="art-near" d="M0 184Q39 158 74 172T146 194Q170 197 194 216H0ZM274 216Q317 192 342 190T410 161V216Z"/>
  <g className="art-ripples" fill="none" stroke="currentColor" strokeWidth="1"><path d="M130 176h43m28 13h61m-91 17h54m27-31h41m-109 9h12m79 14h27"/></g>
  </>:<>
   <defs><clipPath id={id+'-window'}><rect x="33" y="20" width="344" height="171" rx="81"/></clipPath></defs>
   <g clipPath={`url(#${id}-window)`}>
    <path className="art-far" d="M10 166L81 110l37-39q12-14 22-3l63 62 24-20q12-11 24 2l45 45 88-37 44 49v29H10Z"/>
    <path className="art-mid" d="M17 177q34-16 61-16 24 1 44-15l28-28q14-12 27 2l42 38 42 13 68-37q16-7 34 5l45 28v23H17Z"/>
    <path className="art-near" d="M17 191q59-19 114-13 49 6 82 13 46-7 88-11 49-4 109-24v39H17Z"/>
    <g stroke="currentColor" opacity=".24" strokeWidth=".7" fill="none"><path d="m96 106 29-32m-19 40 21-23m30 14 28 22m-42 19 15-15m158 22 20-10m-78 34 32-3"/></g>
   </g>
   <rect x="33" y="20" width="344" height="171" rx="81" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".78"/>
   <rect x="40" y="26" width="330" height="159" rx="75" fill="none" stroke="currentColor" strokeWidth="1" opacity=".43"/>
   <path d="M33 111h344M203 20v171M25 192h360" fill="none" stroke="currentColor" strokeWidth="2" opacity=".75"/>
   <path className="art-far" d="M0 194H410V216H0Z"/>
   <path className="art-near" d="M0 204H410V216H0Z"/>
   <path d="M86 166h66v13q-2 13-16 13h-34q-14-2-16-13Zm67 4h8q10 0 8 7-1 6-16 7" fill="var(--orb)" stroke="currentColor" strokeWidth="1.6"/>
   <path d="M102 158q-9-7 0-16m15 14q-10-8 0-18m12 20q-5-9 4-14" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".64"/>
  </>}
  <g className="art-tree" fill="none" stroke="currentColor" strokeLinecap="round"><path strokeWidth="3" d="M410 45Q375 30 340 34T288 22"/><path d="M371 33q-10-15-27-18m-8 19q-10 12-32 15m81-11q-15 12-20 24m-32-28q-20-12-35-15" strokeWidth="1.5"/></g>
  {(blossom||leaves)&&<g className="art-buds">{[[291,21],[305,47],[346,15],[365,62],[321,39],[332,25],[382,41]].map(([x,y],i)=><ellipse key={x} cx={x} cy={y} rx={blossom?4:6} ry={3} transform={`rotate(${i*29} ${x} ${y})`}/>)}</g>}
  {weather==='rain'&&<g className="art-rain" stroke="currentColor" strokeWidth="1.1" opacity=".55">{Array.from({length:43},(_,i)=><path key={i} d={`M${(i*67)%410} ${(i*49)%207}l-6 13`}/>)}</g>}
  {weather==='snow'&&<g fill="white" opacity=".9">{Array.from({length:38},(_,i)=><circle key={i} cx={(i*67)%410} cy={(i*49)%207} r={i%3+1}/>)}</g>}
  {weather==='cloud'&&<path d="M225 72h84m-55 8h79m-108 22h42" stroke="currentColor" opacity=".34"/>}
 </svg>;
}
export function SpecimenArt({kind}:{kind:'leaf'|'peel'}){
 return <svg className="specimen-art" viewBox="0 0 160 116" role="img" aria-label={kind==='leaf'?'紫苏叶原创形态示意':'陈皮原创形态示意'}>
  {kind==='leaf'?<><path d="M78 97C60 82 44 91 29 71l5-2-10-11 7 1-8-12 7 1-3-13 7 2 5-12 7 2 11-7 6 3L81 8l7 13 8-1 2 9 10-2-2 8 10 1-3 8 9 3-5 6 10 5-7 6 5 6-9 2 1 8-9-2c-8 10-19 13-30 19Z" fill="#647c63"/><path d="M78 108L81 18m-2 66L40 58m39 16l34-21M80 57 48 40m32 9l21-14" fill="none" stroke="#dfdfb9" strokeWidth="1.5"/><path d="M96 91q24-1 38-14 2 16-10 25-12 6-28 1Z" fill="#795c71"/></>:<><path d="M76 59Q35 13 23 55 12 83 64 99q12 0 20-12 8 13 27 11 44-14 26-43-13-21-53 5-7-44-28-47-24 5-10 23Z" fill="#aa6840" stroke="#764728" strokeWidth="2"/><path d="M83 72q26-22 51-9-2 20-26 29-15 2-25-20Z" fill="#dfb98c"/><g fill="#63391e" opacity=".55">{Array.from({length:21},(_,i)=><circle key={i} cx={29+i*7%39} cy={52+i*13%32} r="1.2"/>)}</g><path d="M95 73q19-10 30-9m-27 18q17-3 27-12" stroke="#b98b62" fill="none"/></>}
 </svg>;
}
