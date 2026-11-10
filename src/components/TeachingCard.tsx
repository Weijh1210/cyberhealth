'use client';

import type {CSSProperties} from 'react';
import {sourcesFor} from '../lib/evidenceSources';
import {durationLabel} from '../lib/breakConditions';
import type {Activity,Session} from '../lib/types';
import {activityCategory,TraditionalCard} from './TraditionalCard';

const clock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

export default function TeachingCard({activity,session,secondsLeft,note,onNoteChange,onExit,onStart,onPause,onFinish,onDiscomfort,onSwap}:{
 activity:Activity;session:Session;secondsLeft:number;note:string;onNoteChange:(value:string)=>void;
 onExit:()=>void;onStart:()=>void;onPause:()=>void;onFinish:()=>void;onDiscomfort:()=>void;onSwap:()=>void;
}){
 const elapsed=activity.durationSeconds-secondsLeft;
 const stepIndex=Math.min(activity.steps.length-1,Math.floor(elapsed/activity.durationSeconds*activity.steps.length));
 const sources=sourcesFor(activity.id);
 const ready=session.status==='ready';
 const running=session.status==='running';
 const firstStep=elapsed===0;
 return <section className="break-page execution-page">
  <div className="break-heading"><div><span className="section-kicker">{activityCategory(activity)} · {durationLabel(activity.durationSeconds)}</span><h1>{activity.title}</h1></div><button className="text-button" onClick={onExit}>退出活动</button></div>
  <div className="execution-layout">
   <section className="break-panel current-instruction" aria-label="当前步骤">
    <span className="section-kicker">{ready?'动作时间已到':`第 ${stepIndex+1} 步 / 共 ${activity.steps.length} 步`}</span>
    <h2>{ready?'结束动作，放松一下。':activity.steps[stepIndex]}</h2>
    <p>{activity.precautions}</p>
    <p className="stop-hint">如果出现疼痛、眩晕、麻木或无力，请立即停止。</p>
    <progress max={activity.durationSeconds} value={elapsed} aria-label="计时进度"/>
   </section>
   <aside className="break-panel execution-timer">
    <span className="section-kicker" role="status">{ready?'计时结束，等你确认':running?'计时中':firstStep?'准备好了再开始':'计时已暂停'}</span>
    <div className="timer-value yard-water-clock" style={{'--remaining':`${secondsLeft/activity.durationSeconds*360}deg`} as CSSProperties}><strong aria-label="剩余时间">{clock(secondsLeft)}</strong></div>
    <div className="timer-actions">
     {session.status==='paused'&&<button className="primary" onClick={onStart}>{firstStep?'开始计时':'继续计时'}</button>}
     {running&&<button className="primary" onClick={onPause}>暂停计时</button>}
     {ready&&<button className="primary" onClick={onFinish}>我已完成，确认记录</button>}
     {!ready&&<p>计时结束后，由你确认是否完成。</p>}
     <button className="text-button" onClick={onSwap}>换一个动作</button>
     <button className="text-button" onClick={onExit}>跳过这次活动</button>
    </div>
   </aside>
  </div>
  <div className="break-actions"><button className="danger-button" onClick={onDiscomfort}>不舒服，停止并避开此动作</button></div>
  {ready&&<label className="execution-note">活动手记（可选）<input value={note} onChange={event=>onNoteChange(event.target.value)} maxLength={120}/></label>}
  <details className="break-panel execution-details"><summary>完整步骤与安全提示</summary>
   <ol>{activity.steps.map((step,index)=><li key={step} aria-current={!ready&&index===stepIndex?'step':undefined}>{step}</li>)}</ol>
   <ul>{activity.meta.safetyWarnings.map(warning=><li key={warning}>{warning}</li>)}</ul>
   {activity.meta.contraindications.map(condition=><p key={condition}>{condition}</p>)}
  </details>
  <details className="break-panel execution-details"><summary>来源与动作资料</summary>
   {activity.content?.type==='traditional'?<TraditionalCard guide={activity.content.guide}/>:<p>{activity.source}</p>}
   {sources.map(source=><p key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.organization} · {source.title} ↗</a></p>)}
  </details>
 </section>;
}
