'use client';
import {useState} from 'react';
import type {AppData,FocusArea,Scene,UserProfile,Reminder} from '../lib/types';
import {useDialogFocus} from './useDialogFocus';
import ReminderFields from './ReminderFields';
import {requestNotifications} from '../lib/notifications';
const scenes:{id:Scene;name:string}[]=[{id:'library',name:'图书馆 / 自习室'},{id:'office',name:'办公室'},{id:'home',name:'家 / 宿舍'},{id:'outdoor',name:'户外'}];
const focuses:{id:FocusArea;name:string}[]=[{id:'neck',name:'颈肩'},{id:'lowerBack',name:'腰背'},{id:'eyes',name:'眼睛'},{id:'legs',name:'腿部'},{id:'fullBody',name:'全身'},{id:'general',name:'暂无特别关注'}];
function toggle<T>(items:T[],item:T){return items.includes(item)?items.filter(x=>x!==item):[...items,item];}
export default function Onboarding({initial,onSave,onSkip,editing=false}:{initial:AppData;onSave:(profile:UserProfile,reminder:Reminder)=>void;onSkip:()=>void;editing?:boolean}){
 const [profile,setProfile]=useState(initial.profile);const [reminder,setReminder]=useState(initial.reminder);const [step,setStep]=useState(editing?1:0);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useDialogFocus(true,'.onboard-card',onSkip);
 const titles=['给忙碌留一个小间隙','想照顾哪些部位？','你通常在哪里？','安排你的提醒节奏','由你决定是否通知'];
 const save=()=>onSave({...profile,onboardingComplete:true,commonScenes:profile.commonScenes.length?profile.commonScenes:['library'],focusAreas:profile.focusAreas.length?profile.focusAreas:['general']},reminder);
 return <div className="onboard-overlay"><section className="onboard-card" role="dialog" aria-modal="true" aria-label="简短设置"><div className="onboard-head"><span className="section-kicker">CyberHealth · {step+1} / 5</span><h2>{titles[step]}</h2><p>Small Moves, Lasting Habits.</p></div>
 {step===0&&<div className="onboard-field"><p>摸鱼养生局是你的智能微休息助手。在学习与工作的间隙，按你方便的时间提醒，推荐适合当前环境的小动作。</p><p>无需注册，记录保存在你的浏览器。一次半分钟，也可以是习惯的开始。</p></div>}
 {step===1&&<div className="onboard-field"><strong>身体关注部位 · 可多选</strong><p>这是活动偏好，不是疾病诊断。</p><div className="option-list">{focuses.map(x=><button key={x.id} className={profile.focusAreas.includes(x.id)?'selected':''} aria-pressed={profile.focusAreas.includes(x.id)} onClick={()=>setProfile({...profile,focusAreas:x.id==='general'?['general']:toggle(profile.focusAreas.filter(f=>f!=='general'),x.id)})}>{x.name}</button>)}</div></div>}
 {step===2&&<div className="onboard-field"><strong>常用场景 · 可多选</strong><div className="option-list">{scenes.map(x=><button key={x.id} className={profile.commonScenes.includes(x.id)?'selected':''} aria-pressed={profile.commonScenes.includes(x.id)} onClick={()=>setProfile({...profile,commonScenes:toggle(profile.commonScenes,x.id)})}>{x.name}</button>)}</div><p>每次活动时，只需确认当前场景。</p><div className="option-list"><button aria-pressed={profile.quiet} className={profile.quiet?'selected':''} onClick={()=>setProfile({...profile,quiet:!profile.quiet})}>安静动作优先</button><button aria-pressed={profile.smallMovement} className={profile.smallMovement?'selected':''} onClick={()=>setProfile({...profile,smallMovement:!profile.smallMovement})}>小幅度动作优先</button></div></div>}
 {step===3&&<div className="onboard-field"><strong>提醒偏好</strong><ReminderFields value={reminder} onChange={setReminder}/><label className="checkbox-line"><input type="checkbox" checked={reminder.enabled} onChange={e=>setReminder({...reminder,enabled:e.target.checked})}/>开启前台休息提醒</label><p>建议每日最多 3 次、间隔 60 分钟。你可随时关闭、暂停或延后。</p></div>}
 {step===4&&<div className="onboard-field"><p>通知用于在网页运行时提示休息。不授权也能使用站内提醒。本版本尚无关闭网页后的后台定时推送。</p><button className="outline-button" disabled={busy} onClick={async()=>{setBusy(true);const result=await requestNotifications();setReminder(r=>({...r,browserNotifications:result.granted}));setMessage(result.message);setBusy(false);}}>开启系统通知</button><p role="status">{message}</p></div>}
 <div className="onboard-actions">{step>0&&<button className="text-button" onClick={()=>setStep(step-1)}>上一步</button>}<button className="primary" onClick={()=>step===4?save():setStep(step+1)}>{step===4?'保存并开始':'下一步'}</button><button className="text-button" onClick={onSkip}>{editing?'取消':'先跳过'}</button></div></section></div>;
}
