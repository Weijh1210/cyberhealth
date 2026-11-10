'use client';

import {useEffect,useRef,useState} from 'react';
import {activityById} from '../lib/activities';
import {candidates,matches,recommend,recommendationReason} from '../lib/recommend';
import {localDay} from '../lib/date';
import {inHourWindow,scheduleReminder,reminderDue,respondToReminder,withReminderPlan} from '../lib/reminders';
import {claimReminder,clearReminderClaims} from '../data/reminderClaim';
import {grantCompletion,initialData} from '../lib/store';
import type {Activity,AppData,Preference,Session} from '../lib/types';
import {remainingSeconds as remaining,transitionSession} from '../lib/execution';
import {localRepository} from '../data/repository';
import {growthStats} from '../lib/growth';
import {browserNotificationCapability,requestNotifications,displayNotification} from '../lib/notifications';
import {recordActivityFeedback,recordRecommendation} from '../lib/activityFeedback';
import {blockedActivities,restoreActivity} from '../lib/exclusions';
import {conditionsForPreset,durationLabel,supports,type PresetId} from '../lib/breakConditions';
import {currentSolarTerm} from '../lib/seasonal';
import ReminderFields from './ReminderFields';
import {useDialogFocus} from './useDialogFocus';
import {useAccount} from './useAccount';
import AccountPanel from './AccountPanel';
import ActivityFeedback from './ActivityFeedback';
import AdaptiveSettings from './AdaptiveSettings';
import PwaStatus from './PwaStatus';
import Onboarding from './Onboarding';
import TeachingCard from './TeachingCard';
import {ConditionFields,PresetPicker,focusLabels,sceneLabel} from './BreakConditions';
import {JourneyCard} from './Landscape';
import Courtyard,{CourtyardJournal,useCourtyardWeather} from './Courtyard';
import {quickBreaks,type Courtyard as Yard,type QuickBreak} from '../lib/courtyard';
import {activityCategory,TraditionalCard,TraditionalPreview} from './TraditionalCard';

type Page='home'|'move'|'activity'|'done'|'records'|'settings';
const nav=[{id:'home',label:'歇一下',icon:'⌂'},{id:'records',label:'手记',icon:'▤'},{id:'settings',label:'我的节奏',icon:'☷'}] as const;

function selectionOf(data:AppData):Preference {
 return {...data.preference,scene:data.currentScene,bodyNeed:data.currentNeed};
}
function emptyAdvice(selection:Preference,data:AppData){
 const available=(change:Partial<Preference>)=>candidates({...selection,...change},data.profile,data.feedback).length>0;
 const choices=[
  [available({duration:1200}),'增加可用时间'],
  [available({posture:'any'}),'允许坐姿或站姿'],
  [available({space:'outdoor'}),'选择更宽的活动空间'],
  [available({smallMovement:false}),'允许更大幅度的动作'],
  [available({quiet:false}),'允许轻声动作'],
  [available({availableEquipment:supports.map(([id])=>id)}),'确认现场的支撑条件'],
 ].filter(([possible])=>possible).map(([,label])=>label);
 return choices.length?`如果现场允许，可以${choices.join('、')}。`:'请核对场景、时间、姿势和空间，或在「我的」检查已排除动作。';
}

const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
const nextLabel=(value:number|null)=>{if(!value)return '未安排';const date=new Date(value);const day=localDay(date),today=localDay(new Date());const nextDay=new Date();nextDay.setDate(nextDay.getDate()+1);const tomorrow=localDay(nextDay);const prefix=day===today?'今天':day===tomorrow?'明天':date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});return `${prefix} ${date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`;};
export default function App(){const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);return mounted?<AccountGate/>:<main className="loading" aria-busy="true">正在打开摸鱼养生局…</main>;}
function AccountGate(){const account=useAccount();return account.loading?<main className="loading">正在核对账号…</main>:<AppContent key={account.user?.id||'guest'} account={account}/>;}

function AppContent({account}:{account:ReturnType<typeof useAccount>}){
 const [data,setData]=useState(()=>localRepository.read());
 const [activeId,setActiveId]=useState(()=>[...data.sessions].reverse().find(session=>['running','paused','ready'].includes(session.status))?.id??null);
 const [page,setPage]=useState<Page>(activeId?'activity':'home');
 const [now,setNow]=useState(Date.now);
 const [editingProfile,setEditingProfile]=useState<'first'|'edit'|null>(null);
 const [conditionsOpen,setConditionsOpen]=useState(false);
 const [quick,setQuick]=useState<QuickBreak|null>(null);
 const [check,setCheck]=useState(false);
 const [skipCamera,setSkipCamera]=useState(false);
 const [lifeDue,setLifeDue]=useState<string[]>([]);
 const [lifeLabel,setLifeLabel]=useState('');
 const [lifePrivate,setLifePrivate]=useState(false);
 const [walking,setWalking]=useState(false);
 const [lifeTime,setLifeTime]=useState('15:00');
 const [suggestion,setSuggestion]=useState<Activity|null>(null);
 const [seen,setSeen]=useState<string[]>([]);
 const [showReminder,setShowReminder]=useState(false);
 const [reason,setReason]=useState('正在专注');
 const [notice,setNotice]=useState('');
 const [note,setNote]=useState('');
 const [pauseUntil,setPauseUntil]=useState(()=>new Date(Date.now()+3600000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
 const checkingReminder=useRef(false);
 const committing=useRef(false);
 const scopeKey=localRepository.currentKey();
 const today=new Date(now);
 const selection=selectionOf(data);
 const options=candidates(selection,data.profile,data.feedback);
 const recommended=options.find(activity=>activity.id===suggestion?.id)??recommend(selection,data.feedback,data.sessions,'',[],data.profile,data.recommendationEvents);
 const active=data.sessions.find(session=>session.id===activeId);
 const activeActivity=active&&activityById(active.activityId);
 const weather=useCourtyardWeather(data.courtyard.city);
 const completed=data.sessions.filter(session=>session.status==='completed');
 const feedback=active&&[...data.feedback].reverse().find(item=>item.sessionId===active.id);
 const stats=growthStats(data.sessions,today);
 const monday=new Date(today);
 monday.setDate(today.getDate()-((today.getDay()+6)%7));
 const thisWeek=stats.days.filter(day=>day.day>=localDay(monday));
 const status=data.reminder.enabled?data.companion?.status??'ended':'ended';

 function updateData(change:(current:AppData)=>AppData){
  if(localRepository.currentKey()!==scopeKey)return;
  const current=localRepository.read();
  const changed=change(current);
  const next=changed===current?current:withReminderPlan(changed,Date.now());
  if(next!==current&&!localRepository.save(next))setNotice('浏览器无法保存本地数据，请检查存储权限。');
  setData(next);
  return next;
 }

 function changeYard(change:(current:Yard)=>Yard){
  updateData(current=>{const courtyard=change(current.courtyard);return courtyard===current.courtyard?current:{...current,courtyard};});
 }
 function showQuick(kind:QuickBreak){setQuick(kind);setCheck(false);setWalking(false);}
 function saveQuick(){
  if(!quick)return;
  changeYard(current=>({...current,peel:current.peel||quick==='walk'&&walking,notes:[...current.notes,{kind:quick,at:new Date().toISOString()}]}));
  setQuick(null);setNotice('已记入手记。');
 }
 useEffect(()=>{
  if(editingProfile||document.visibilityState!=='visible'||!data.courtyard.reminders.length)return;
  const day=localDay(today);
  const hhmm=today.toTimeString().slice(0,5);
  const hour=today.getHours();
  const {dndStartHour:start,dndEndHour:end}=data.reminder;
  if(inHourWindow(hour,start,end,false))return;
  const due=localRepository.read().courtyard.reminders.filter(item=>item.time===hhmm&&item.lastDay!==day);
  if(!due.length)return;
  const ids=new Set(due.map(item=>item.id));
  changeYard(current=>({...current,reminders:current.reminders.map(item=>ids.has(item.id)?{...item,lastDay:day}:item)}));
  setLifeDue(current=>[...new Set([...current,...due.map(item=>item.private?'该休息一下了':item.label)])]);
 },[now,data.courtyard.reminders,editingProfile]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>localRepository.subscribe(setData),[]);
 useEffect(()=>{
  const running=data.sessions.find(session=>session.status==='running'&&session.deadlineAt&&session.deadlineAt<=now);
  if(running)updateData(current=>({...current,sessions:current.sessions.map(session=>session.id===running.id?transitionSession(session,'tick',now):session)}));
 },[now,data.sessions]);
 useEffect(()=>{if(checkingReminder.current||showReminder||editingProfile||document.visibilityState!=='visible')return;
  const current=localRepository.read();
  if(current.companion?.status==='paused'&&current.reminder.pausedUntil&&now>=Date.parse(current.reminder.pausedUntil)){updateData(d=>({...d,reminder:{...d.reminder,pausedUntil:null},companion:d.companion?{...d.companion,status:'active',nextReminderAt:scheduleReminder(now,{...d.reminder,pausedUntil:null},d.reminderEvents,0)}:null}));return;}
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  if(current.reminder.timezone!==zone){updateData(d=>({...d,reminder:{...d.reminder,timezone:zone},companion:d.companion?{...d.companion,nextReminderAt:scheduleReminder(now,d.reminder,d.reminderEvents,d.reminder.intervalMinutes,d.adaptive)}:null}));return;}
  if(!reminderDue(current,now))return;
  checkingReminder.current=true;
  const isSnooze=current.reminder.snoozedUntil!==null&&Boolean(current.reminder.pendingReminderId);
  const occurrence=isSnooze?`${current.reminder.pendingReminderId}:snooze:${current.reminder.snoozedUntil}`:`${current.companion!.id}:${current.companion!.nextReminderAt}`;
  void claimReminder(`${scopeKey}:${occurrence}`).then(result=>{if(localRepository.currentKey()!==scopeKey)return;if(result==='unavailable'){endCompanion();setNotice('此浏览器无法保存标签页协调记录，自动提醒已关闭；仍可手动选择活动。');return;}if(result!=='claimed')return;const latest=localRepository.read();if(!reminderDue(latest,Date.now()))return;
   const p={...latest.preference,scene:latest.currentScene,bodyNeed:latest.currentNeed};const a=recommend(p,latest.feedback,latest.sessions,'',[],latest.profile,latest.recommendationEvents);
   const time=Date.now();const events:AppData['reminderEvents']=[...latest.reminderEvents,{id:occurrence,companionId:latest.companion!.id,type:isSnooze?'redisplayed':'due',scheduledAt:new Date(latest.companion!.nextReminderAt!).toISOString(),sentAt:new Date(time).toISOString(),systemDelivery:'unknown',notificationStatus:'not-requested',at:new Date(time).toISOString(),scene:latest.currentScene,activityId:a?.id}];
   const next=withReminderPlan({...recordRecommendation(latest,a,`${occurrence}:recommendation`,new Date(time)),reminder:{...latest.reminder,snoozedUntil:null},reminderEvents:events,companion:{...latest.companion!,nextReminderAt:scheduleReminder(time,latest.reminder,events,latest.reminder.intervalMinutes,latest.adaptive)}},time);
   if(!localRepository.save(next)){setNotice('无法保存提醒事件，请检查浏览器存储权限。');return;}setData(next);setSuggestion(a);setSeen(a?[a.id]:[]);setShowReminder(true);
   if(next.reminder.browserNotifications)void displayNotification().then(status=>updateData(d=>({...d,reminderEvents:d.reminderEvents.map(e=>e.id===occurrence?{...e,notificationStatus:status}:e)})));
  }).finally(()=>{checkingReminder.current=false;});
 },[now,showReminder,editingProfile]);
 useEffect(()=>{if(showReminder){const id=[...data.reminderEvents].reverse().find(e=>['due','redisplayed'].includes(e.type))?.id;if(id)updateData(d=>({...d,reminderEvents:d.reminderEvents.map(e=>e.id===id?{...e,foregroundDelivery:'shown'}:e)}));}},[showReminder]);
 useEffect(()=>{if(showReminder&&(!data.reminder.enabled||data.companion?.status!=='active'))setShowReminder(false);},[data.reminder.enabled,data.companion?.status,showReminder]);
 function startCompanion(){const time=Date.now();updateData(d=>{const id=uid();return {...d,companion:{id,startedAt:new Date(time).toISOString(),status:'active',currentScene:d.currentScene,nextReminderAt:scheduleReminder(time,{...d.reminder,pausedUntil:null},d.reminderEvents,d.reminder.intervalMinutes,d.adaptive)},reminder:{...d.reminder,enabled:true,quiet:false,pausedUntil:null,snoozedUntil:null,pendingReminderId:null},reminderEvents:[...d.reminderEvents,{id:uid(),companionId:id,type:'started',at:new Date(time).toISOString(),scene:d.currentScene}]};});}
 function respond(type:'postponed'|'skipped'|'already-active'|'paused'|'accepted',minutes=0,why=reason,at=Date.now()){const id=uid();updateData(d=>respondToReminder(d,type,at,id,why,minutes));setShowReminder(false);setLifeDue([]);}
 function pauseCompanion(){const at=Date.now();const minutes=(Date.parse(pauseUntil)-at)/60000;if(!Number.isFinite(minutes)||minutes<=0){setNotice('请选择未来的恢复时间。');return;}respond('paused',minutes,'用户主动暂停',at);}
 function resumeCompanion(){updateData(d=>d.companion?{...d,reminder:{...d.reminder,enabled:true,pausedUntil:null},companion:{...d.companion,status:'active',nextReminderAt:scheduleReminder(Date.now(),{...d.reminder,pausedUntil:null},d.reminderEvents,d.reminder.intervalMinutes,d.adaptive)},reminderEvents:[...d.reminderEvents,{id:uid(),companionId:d.companion.id,type:'resumed',at:new Date().toISOString(),scene:d.currentScene}]}:d);}
 function endCompanion(){updateData(d=>({...d,reminder:{...d.reminder,enabled:false,pausedUntil:null,snoozedUntil:null,pendingReminderId:null},companion:d.companion?{...d.companion,status:'ended',endedAt:new Date().toISOString(),nextReminderAt:null}:null}));setShowReminder(false);}
 async function enableBrowserNotifications(){const result=await requestNotifications();updateData(d=>({...d,reminder:{...d.reminder,browserNotifications:result.granted}}));setNotice(result.message);}
 function exportData(){const url=URL.createObjectURL(new Blob([localRepository.export(data)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`cyberhealth-${localDay(new Date())}.json`;link.click();URL.revokeObjectURL(url);}

 function changeConditions(part:Partial<Preference>){
  updateData(current=>{
   const preference={...selectionOf(current),preset:undefined,...part};
   const sceneChanged=current.currentScene!==preference.scene;
   const companion=current.companion;
   return {...current,preference,currentScene:preference.scene,currentNeed:preference.bodyNeed??'general',
    companion:companion&&sceneChanged?{...companion,currentScene:preference.scene}:companion,
    reminderEvents:companion&&sceneChanged?[...current.reminderEvents,{id:uid(),companionId:companion.id,type:'scene-changed',at:new Date().toISOString(),scene:preference.scene}]:current.reminderEvents};
  });
  setSuggestion(null);
  setSeen([]);
  setNotice('');
 }

 function pickPreset(id:PresetId){
  changeConditions(conditionsForPreset(id,selectionOf(localRepository.read())));
 }

 function shuffle(){
  const excluded=[...new Set([...seen,...(recommended?[recommended.id]:[])])];
  const available=options.some(activity=>!excluded.includes(activity.id));
  const next=recommend(selection,data.feedback,data.sessions,'',available?excluded:recommended?[recommended.id]:[],data.profile,data.recommendationEvents);
  if(!next){setNotice('当前条件只有这一项匹配，可以调整条件。');return;}
  setSuggestion(next);
  setSeen([...(available?excluded:[]),next.id]);
  const id=uid();
  updateData(current=>({...recordRecommendation(current,next,id,new Date()),swapCount:current.swapCount+1,
   reminderEvents:showReminder&&current.companion?[...current.reminderEvents,{id:uid(),companionId:current.companion.id,type:'swapped',at:new Date().toISOString(),scene:current.currentScene}]:current.reminderEvents}));
 }

 function begin(activity:Activity,source:'manual'|'reminder'='manual',replaceId?:string){
  const required=supports.filter(([id])=>activity.meta.equipmentRequired.includes(id));
  if(required.length&&!window.confirm(`请确认身边有${required.map(([,label])=>label).join('和')}，可以安全使用。`))return;
  const startedAt=Date.now();
  const id=uid();
  let started=false;
  updateData(current=>{
   const preference=selectionOf(current);
   if(!matches(activity,preference,current.profile,current.feedback)){
    setNotice('条件已变化，请重新选择适合的动作。');
    return current;
   }
   const ongoing=current.sessions.find(session=>['running','paused','ready'].includes(session.status));
   if(ongoing&&ongoing.id!==replaceId){
    setActiveId(ongoing.id);
    setPage('activity');
    setShowReminder(false);
    return current;
   }
   const reminderId=source==='reminder'?(current.reminder.pendingReminderId??current.reminderEvents.findLast(event=>event.type==='due')?.id):undefined;
   const next=source==='reminder'&&!replaceId?respondToReminder(current,'accepted',startedAt,uid(),'现在活动'):current;
   const session:Session={id,activityId:activity.id,preference,startedAt:new Date(startedAt).toISOString(),status:'paused',deadlineAt:null,
    remainingSeconds:activity.durationSeconds,source,reminderId:ongoing?.reminderId??reminderId};
   started=true;
   return {...recordRecommendation(next,activity,`${id}:start`,new Date(startedAt)),sessions:[
    ...next.sessions.map(item=>item.id===replaceId?transitionSession(item,'skip',startedAt):item),session]};
  });
  if(!started)return;
  setActiveId(id);
  setNote('');
  setShowReminder(false);
  setNotice('');
  setSkipCamera(false);
  setLifeDue([]);
  setPage('activity');
  window.scrollTo(0,0);
 }

 function act(action:'start'|'pause'|'skip'){
  if(!activeId)return;
  updateData(current=>({...current,sessions:current.sessions.map(session=>session.id===activeId?transitionSession(session,action,Date.now()):session)}));
 }

 function navigate(to:Page){
  if(page==='activity'&&to!=='activity')act('skip');
  setPage(to);
  setQuick(null);
  setCheck(false);
  setNotice('');
  window.scrollTo(0,0);
 }

 function stopUncomfortable(){
  if(!active)return;
  updateData(current=>({...current,sessions:current.sessions.map(session=>session.id===active.id?transitionSession(session,'skip',Date.now()):session),
   feedback:[...current.feedback,{id:uid(),activityId:active.activityId,value:'uncomfortable',reason:'用户在活动中停止',at:new Date().toISOString()}]}));
  navigate('home');
  setNotice('已停止并避开这项活动。如出现疼痛加重、眩晕、麻木或无力，请寻求适当医疗评估。');
 }

 function swapActivity(){
  if(!active)return;
  const next=recommend(selection,data.feedback,data.sessions,'',[active.activityId],data.profile,data.recommendationEvents);
  if(!next){setNotice('当前条件没有其他合适动作。');return;}
  begin(next,active.source==='reminder'?'reminder':'manual',active.id);
 }

 async function finish(){
  if(!activeId||committing.current)return;
  committing.current=true;
  try{
   const save=()=>updateData(current=>{
    const at=new Date();
    const target=current.sessions.find(session=>session.id===activeId);
    const next=grantCompletion(current,activeId,at,note.trim().slice(0,120));
    if(next===current)return current;
    const reminderEvents:AppData['reminderEvents']=target?.reminderId?[...next.reminderEvents,{id:`${activeId}:completed`,companionId:current.companion?.id??'',
     type:'activity-completed',at:at.toISOString(),reminderId:target.reminderId,sessionId:activeId,activityId:target.activityId}]:next.reminderEvents;
    const companion=next.companion?.status==='active'&&!next.reminder.snoozedUntil?{...next.companion,
     nextReminderAt:scheduleReminder(at.getTime(),next.reminder,reminderEvents,next.reminder.intervalMinutes,next.adaptive)}:next.companion;
    return {...next,reminderEvents,companion};
   });
   const saved=navigator.locks?await navigator.locks.request(`${scopeKey}:completion`,save):save();
   if(saved?.sessions.some(session=>session.id===activeId&&session.status==='completed')){
    setPage('done');
    window.scrollTo(0,0);
   }
  }finally{committing.current=false;}
 }

 function saveProfile(profile:AppData['profile'],reminder:AppData['reminder']){
  updateData(current=>{
   const scene=profile.commonScenes[0]??current.currentScene;
   const need=profile.focusAreas[0]??'general';
   const companion=current.companion;
   return {...current,profile,reminder,currentScene:scene,currentNeed:need,
    preference:{...current.preference,preset:undefined,scene,bodyNeed:need,quiet:profile.quiet,smallMovement:profile.smallMovement},
    companion:reminder.enabled?{id:companion?.id??uid(),startedAt:companion?.startedAt??new Date().toISOString(),
     status:companion?.status==='paused'?'paused':'active',currentScene:scene,
     nextReminderAt:reminder.snoozedUntil??scheduleReminder(Date.now(),reminder,current.reminderEvents,reminder.intervalMinutes,current.adaptive)}
     :companion?{...companion,status:'ended',nextReminderAt:null}:null};
  });
  setSuggestion(null);
  setSeen([]);
  setEditingProfile(null);
 }

 function clearLocalData(){
  if(!window.confirm('确定清除全部本地数据吗？此操作无法撤销。'))return;
  if(!localRepository.clear()){setNotice('未能清除本地数据，请检查浏览器存储权限后重试。');return;}
  void clearReminderClaims();
  setData(initialData());
  setActiveId(null);
  setSuggestion(null);
  setSeen([]);
  setConditionsOpen(false);
  setLifeDue([]);
  setNotice('本地数据已清除。');
 }

 useDialogFocus(showReminder||lifeDue.length>0,showReminder?'[aria-label="休息提醒"]':'[aria-label="生活提醒"]',()=>showReminder?respond('skipped',0,'关闭提醒'):setLifeDue([]));

 const fields=<ConditionFields value={selection} onChange={changeConditions} quiet={selection.quiet??data.profile.quiet} smallMovement={selection.smallMovement??data.profile.smallMovement}/>;
 const empty=<div className="empty-recommendation"><strong>当前没有匹配的活动</strong><p>{emptyAdvice(selection,data)}</p></div>;
 const term=currentSolarTerm(today);
 const firstSetup=!data.profile.onboardingComplete;
 const closeSetup=()=>setEditingProfile(null);
 const setup=()=>setEditingProfile(firstSetup?'first':'edit');

 const home=page==='home';
 const termName=term?.name??'节气资料暂缺';
 const reminderLabel=status==='active'?'提醒已开启':status==='paused'?'提醒已暂停':'提醒已关闭';
 const reminderTime=status==='active'?(data.companion?.nextReminderAt?nextLabel(data.companion.nextReminderAt):'暂无可用时段'):
  status==='paused'?nextLabel(data.reminder.pausedUntil?Date.parse(data.reminder.pausedUntil):null):null;
 const recommendation=<>
  <div className="break-result">
   {recommended?<div className="result-copy">
    <span className="section-kicker">{activityCategory(recommended)} · {recommended.meta.posture==='seated'?'坐着做 · ':''}{durationLabel(recommended.durationSeconds)}</span>
    <h2>{recommended.title}</h2>
    <p>{recommended.description}</p>
    {!home&&<small>{recommendationReason(recommended,selection,data.feedback)}</small>}
    {recommended.content?.type==='traditional'&&<details><summary>查看传统导引资料</summary><TraditionalCard guide={recommended.content.guide}/></details>}
   </div>:empty}
   <div className="break-actions">
    {recommended&&<button className="primary" onClick={()=>begin(recommended)}>{home?'歇一下':'开始'}</button>}
    {recommended&&<button className="outline-button" onClick={shuffle}>换一个</button>}
    <button className="text-button" aria-expanded={conditionsOpen} aria-controls="break-conditions" onClick={()=>setConditionsOpen(!conditionsOpen)}>调整条件</button>
    {home&&<button className="text-button" onClick={()=>showQuick('quiet')}>现在不方便</button>}
    {!home&&recommended&&<button className="text-button" onClick={()=>{updateData(current=>({...current,feedback:[...current.feedback,{id:uid(),activityId:recommended.id,value:'unsuitable',at:new Date().toISOString()}]}));setSuggestion(null);}}>不适合我</button>}
   </div>
  </div>
  <div id="break-conditions" hidden={!conditionsOpen}>{fields}</div>
 </>;

 const lesson=page==='activity'&&active&&activeActivity;
 const shoulder=options.find(activity=>activity.id==='scapular-squeeze');
 function collectFromBasket(){
  if(shoulder){begin(shoulder);return;}
  if(recommended){begin(recommended);return;}
  setConditionsOpen(true);
 }
 return <div className="app-shell world-shell">
  <div className="app-layout" inert={Boolean(editingProfile)||showReminder||lifeDue.length>0}>
   <main className="main-content">
    <PwaStatus/>
    {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="关闭提示">×</button></div>}
    <section className="world-home" aria-labelledby="world-title" data-view={page}>
     <header className="yard-header">
      <div className="yard-brand"><span aria-hidden="true">草</span><div><small>摸鱼养生局</small><h1 id="world-title">节气百草局</h1></div></div>
      <nav aria-label="主导航" className="yard-nav">{nav.map(item=><button key={item.id} aria-current={(item.id===page||item.id==='home'&&['move','activity','done'].includes(page))?'page':undefined} onClick={()=>navigate(item.id)}>{item.label}</button>)}</nav>
      <details className="world-reminders">
       <summary><span className={`status-dot ${status}`}/><span>{reminderLabel}{reminderTime&&<small>{status==='paused'?'恢复':'下次'} · {reminderTime}</small>}</span></summary>
       <div className="world-reminder-panel">
        <p>前台网页提醒 · 间隔至少 {data.reminder.intervalMinutes} 分钟 · 每天最多 {data.reminder.dailyLimit} 次</p>
        {status==='active'?<>
         <label className="pause-control">暂停至<input aria-label="恢复提醒时间" type="datetime-local" value={pauseUntil} onChange={event=>setPauseUntil(event.target.value)}/></label>
         <button className="outline-button" onClick={pauseCompanion}>暂停提醒</button>
         <button className="text-button" onClick={endCompanion}>关闭提醒</button>
        </>:<button className="outline-button" onClick={status==='paused'?resumeCompanion:startCompanion}>{status==='paused'?'继续提醒':'开启休息提醒'}</button>}
        <button className="text-button" onClick={()=>navigate('settings')}>修改提醒设置</button>
       </div>
      </details>
     </header>

     <div className="yard-layout">
      <div className={`yard-main ${lesson?'yard-camera':''} ${skipCamera||data.staticLandscape?'still':''}`}>
       <Courtyard yard={data.courtyard} now={today} term={termName} weather={weather} staticOnly={data.staticLandscape} change={changeYard} onQuick={kind=>{if(!home)navigate('home');showQuick(kind);}} onJournal={()=>navigate('records')} onRhythm={()=>navigate('settings')} onStart={collectFromBasket}
        lesson={Boolean(lesson)} pose={lesson&&(activeActivity.id==='chin-tuck'||activeActivity.id==='scapular-squeeze')?activeActivity.id:undefined} elapsed={lesson?activeActivity.durationSeconds-remaining(active,now):0}/>
       {lesson&&!skipCamera&&!data.staticLandscape&&<button className="yard-skip outline-button" onClick={()=>setSkipCamera(true)}>跳过镜头过渡</button>}
      </div>
      {home&&      <aside className="yard-desk">
       <div className="yard-desk-label"><span>廊下木案</span><time>{today.toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}</time></div>
       <section aria-label="当前推荐">{recommendation}{conditionsOpen&&<PresetPicker value={selection.preset} onChange={pickPreset}/>}</section>
       <div className="yard-desk-tools"><button onClick={()=>navigate('move')}>其他休息</button><button onClick={()=>{setCheck(!check);setQuick(null);}}>工位自查</button></div>
       {firstSetup&&<div className="yard-desk-tools"><button onClick={setup}>设置活动偏好</button><button onClick={()=>updateData(current=>({...current,profile:{...current.profile,onboardingComplete:true}}))}>先跳过</button></div>}
       {check&&<section className="yard-desk-detail" aria-label="工位自查">
        <details><summary>眼睛总想凑近</summary><p>先放大字，再检查屏幕是否有反光。</p></details>
        <details><summary>肩颈总紧</summary><p>让肘部自然靠近身体。把常用物件挪到容易够到的位置。</p></details>
        <details><summary>脚缺少支撑</summary><p>坐稳后让双脚平放；够不到地时，用稳固脚踏垫高。</p></details>
       </section>}
       {quick&&<section className="yard-desk-detail" aria-live="polite"><h2>{quick==='walk'?'门外采集路':quick==='look'?'窗边观叶':quickBreaks[quick][0]}</h2><p>{quick==='walk'&&walking?'沿方便通行的路走一小圈。可以把手机收起来，回来再点门环。':quickBreaks[quick][1]}</p><div className="break-actions">
        {quick==='walk'&&!walking?<><button onClick={()=>setWalking(true)}>可以离座 · 出门走走</button><button onClick={collectFromBasket}>只能坐着 · 廊下收叶</button></>:<button onClick={saveQuick}>{quick==='walk'?'扣门环 · 我回来了':quick==='look'?'看过了 · 挂叶影笺':'记到手记'}</button>}
        <button onClick={()=>setQuick(null)}>收起</button></div></section>}
      </aside>}

    {page==='move'&&<div className="break-page">
     <div className="break-heading"><div><span className="section-kicker">办公间隙 · 微运动</span><h1>适合此刻的小动作</h1></div><span>今日确认 {stats.today.count} 次</span></div>
     <section className="break-panel" aria-label="当前推荐">
      <PresetPicker value={selection.preset} onChange={pickPreset}/>
      {recommendation}
     </section>
     <section className="break-panel"><h2>放下设备，歇一会儿</h2><div className="break-actions">{(Object.keys(quickBreaks) as QuickBreak[]).map(kind=><button className="outline-button" key={kind} onClick={()=>showQuick(kind)}>{quickBreaks[kind][0]}</button>)}</div>{quick&&<div className="yard-desk-detail"><p>{quickBreaks[quick][1]}</p><div className="break-actions"><button className="outline-button" onClick={saveQuick}>记到手记</button><button className="text-button" onClick={()=>setQuick(null)}>收起</button></div></div>}</section>
     <TraditionalPreview/>
    </div>}

    {lesson&&<div className="yard-activity">
     <TeachingCard activity={activeActivity} session={active} secondsLeft={remaining(active,now)}
     note={note} onNoteChange={setNote} onExit={()=>navigate('home')} onStart={()=>act('start')} onPause={()=>act('pause')}
     onFinish={()=>void finish()} onDiscomfort={stopUncomfortable} onSwap={swapActivity}/></div>}
    {page==='activity'&&(!active||!activeActivity)&&<section className="plain-page"><h1>这次活动已结束</h1><button className="primary" onClick={()=>navigate('home')}>返回首页</button></section>}

    {page==='done'&&active?.status==='completed'&&<section className="break-page completion-page">
     <div className="break-heading"><div><span className="section-kicker">已记入手记</span><h1>紫苏苗已入篓</h1></div><button className="text-button" onClick={()=>navigate('home')}>关闭</button></div>
     <section className="break-panel"><p>你完成了「{activeActivity?.title??active.activityId}」。小药童把一株紫苏苗放进了药篓。回院可以种在窗边或水渠旁。</p></section>
     <details className="break-panel feedback-disclosure"><summary>给这次活动一点反馈</summary><ActivityFeedback value={feedback?.value} onChange={value=>updateData(current=>recordActivityFeedback(current,active,value,new Date()))}/></details>
     <div className="break-actions"><button className="primary" onClick={()=>navigate('home')}>回院种紫苏</button><button className="outline-button" onClick={()=>navigate('records')}>查看手记</button></div>
    </section>}

    {page==='records'&&<section className="break-page">
     <div className="break-heading"><div><span className="section-kicker">窗边 · 草木册</span><h1>手记</h1></div><span>累计确认 {completed.length} 次</span></div>
     <CourtyardJournal yard={data.courtyard} change={changeYard}/>
     <section className="break-panel"><h2>随手休息记录</h2>{data.courtyard.notes.length?<ul>{[...data.courtyard.notes].reverse().map((item,index)=><li key={index}>{quickBreaks[item.kind][0]} · {new Date(item.at).toLocaleString('zh-CN')}</li>)}</ul>:<p>还没有随手记录。</p>}</section>
     {data.journey.length>0&&<details className="break-panel"><summary>旧游历长卷</summary><JourneyCard visits={data.journey} staticOnly={data.staticLandscape}/></details>}
     <details className="break-panel seasonal-note"><summary>节气短笺{term?` · ${term.content.name[data.cultureLanguage]}`:''}</summary>
      <p>{term?.content.description[data.cultureLanguage]??'窗外光影在变化，留一点时间看看今天的天色。'}</p>
     </details>
     <section className="break-panel"><h2>本周活动</h2><div className="week-grid">{thisWeek.map(day=><div key={day.day}><span>{day.day.slice(5)}</span><strong>{day.count} 次</strong><small>{day.seconds} 秒</small></div>)}</div></section>
     <section className="break-panel"><h2>历史明细</h2>{completed.length?<div className="history-list">{[...completed].reverse().map(session=><div key={session.id}>
      <div><strong>{activityById(session.activityId)?.title??session.activityId}</strong><small>{new Date(session.completedAt??session.startedAt).toLocaleString('zh-CN')} · {sceneLabel(session.preference.scene)}{session.note?` · ${session.note}`:''}</small></div>
      <span>{activityById(session.activityId)?durationLabel(activityById(session.activityId)!.durationSeconds):'—'}</span>
     </div>)}</div>:<p>还没有完成记录</p>}</section>
    </section>}

    {page==='settings'&&<section className="break-page">
     <div className="break-heading"><div><span className="section-kicker">廊柱 · 时辰簿</span><h1>我的节奏</h1></div></div>
     <div className="settings-block">
      <h2>活动偏好</h2><p>当前关注 {data.profile.focusAreas.map(focus=>focusLabels[focus]).join('、')}。</p>
      <button className="outline-button" onClick={setup}>修改偏好与时段</button>
      {blockedActivities(data.feedback).length>0&&<div className="blocked-actions"><strong>已避开的活动</strong>{blockedActivities(data.feedback).map(item=><div key={item.activityId}><span>{activityById(item.activityId)?.title??item.activityId}</span><button className="text-button" onClick={()=>updateData(current=>restoreActivity(current,item.activityId,new Date()))}>重新启用</button></div>)}</div>}
     </div>
     <div className="settings-block"><h2>提醒设置</h2>
      <ReminderFields value={data.reminder} onChange={reminder=>updateData(current=>({...current,reminder,companion:current.companion?{...current.companion,
       nextReminderAt:reminder.snoozedUntil??scheduleReminder(Date.now(),reminder,current.reminderEvents,reminder.intervalMinutes,current.adaptive)}:null}))}/>
      <p>前台页面到点时可显示站内提醒。网页处于后台、设备休眠或页面关闭时，提醒可能延迟或不可用。</p>
      <p>{browserNotificationCapability().message}</p>
      <div className="companion-actions"><button className="outline-button" onClick={data.reminder.enabled?endCompanion:startCompanion}>{data.reminder.enabled?'关闭提醒':'开启提醒'}</button>
       <button className="text-button" onClick={enableBrowserNotifications}>{data.reminder.browserNotifications?'检查通知权限':'开启浏览器通知'}</button></div>
     </div>
     <div className="settings-block"><h2>生活提醒</h2><p>每日按本机时间在前台显示。与休息提醒同时到期时会合并。关闭页面后停止提醒。</p>
      <form className="yard-life-form" onSubmit={event=>{event.preventDefault();const label=lifeLabel.trim();if(!label||!lifeTime)return;changeYard(current=>({...current,reminders:[...current.reminders,{id:uid(),label,time:lifeTime,private:lifePrivate}]}));setLifeLabel('');setLifePrivate(false);}}>
       <button type="button" className="outline-button" onClick={()=>setLifeLabel('喝水')}>填入喝水提醒</button>
       <label>提醒事项<input required maxLength={40} value={lifeLabel} onChange={event=>setLifeLabel(event.target.value)} placeholder="如吃饭、收工、摘耳机"/></label>
       <label>时间<input required type="time" value={lifeTime} onChange={event=>setLifeTime(event.target.value)}/></label>
       <label className="checkbox-line"><input type="checkbox" checked={lifePrivate} onChange={event=>setLifePrivate(event.target.checked)}/>提示中隐藏事项</label>
       <button className="outline-button">添加提醒</button>
      </form>
      {data.courtyard.reminders.map(item=><div className="yard-life-row" key={item.id}><span>{item.time} · {item.label}</span><button className="text-button" onClick={()=>changeYard(current=>({...current,reminders:current.reminders.filter(row=>row.id!==item.id)}))}>移除</button></div>)}
     </div>
     <AdaptiveSettings data={data} onChange={updateData}/>
     <div className="settings-block"><h2>院落画面</h2><label className="checkbox-line"><input type="checkbox" checked={data.staticLandscape} onChange={event=>updateData(current=>({...current,staticLandscape:event.target.checked}))}/>减少动效，使用静态画面</label><p>系统的减少动态效果设置也会启用静态画面。</p></div>
     <div className="settings-block"><h2>本地数据</h2><p>偏好、手记和庭院进度保存在当前浏览器。</p><div className="companion-actions"><button className="outline-button" onClick={exportData}>导出个人数据 JSON</button><button className="danger-button" onClick={clearLocalData}>清除全部本地数据</button></div></div>
     <AccountPanel user={account.user} error={account.error} data={data} onData={setData}/>
    </section>}
     </div>
    </section>
   </main>
  </div>
  <nav inert={Boolean(editingProfile)||showReminder||lifeDue.length>0} className="mobile-nav" aria-label="手机导航">{nav.map(item=><button key={item.id} className={page===item.id?'active':''} aria-current={page===item.id?'page':undefined} onClick={()=>navigate(item.id)}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></button>)}</nav>

  {lifeDue.length>0&&!showReminder&&<div className="reminder-overlay"><section className="reminder-dialog" role="dialog" aria-modal="true" aria-label="生活提醒"><h2>到时间了</h2><ul>{lifeDue.map(label=><li key={label}>{label}</li>)}</ul><button className="primary" autoFocus onClick={()=>setLifeDue([])}>知道了</button></section></div>}
  {showReminder&&<div className="reminder-overlay"><section className="reminder-dialog" role="dialog" aria-modal="true" aria-label="休息提醒">
   <span className="section-kicker">前台休息提醒</span><h2>给自己一个小间隙？</h2>{lifeDue.length>0&&<ul>{lifeDue.map(label=><li key={label}>{label}</li>)}</ul>}
   {notice&&<p role="status">{notice}</p>}
   {recommended?<div className="reminder-pick"><div><strong>{recommended.title}</strong><small>{durationLabel(recommended.durationSeconds)} · {activityCategory(recommended)} · {sceneLabel(selection.scene)}</small></div></div>:empty}
   <div className="reminder-buttons">
    {recommended&&<button className="primary" onClick={()=>begin(recommended,'reminder')}>现在活动</button>}
    {recommended&&<button className="outline-button" onClick={shuffle}>换一个</button>}
    {[15,30,60].map(minutes=><button key={minutes} className="outline-button" onClick={()=>respond('postponed',minutes)}>延后 {minutes} 分钟</button>)}
   </div>
   <details className="reminder-more"><summary>调整条件</summary><PresetPicker value={selection.preset} onChange={pickPreset}/>{fields}</details>
   <div className="reminder-buttons">
    <button className="text-button" onClick={()=>respond('skipped')}>跳过本次</button>
    <button className="text-button" onClick={()=>respond('already-active',0,'已经活动过')}>我已经活动过了</button>
    <button className="text-button" onClick={()=>respond('paused',Math.max(1,Math.ceil((new Date().setHours(24,0,0,0)-Date.now())/60000)),'今天不想被打扰')}>今天不想被打扰</button>
    <label className="reminder-label">原因（可选）<select aria-label="提醒反馈原因" value={reason} onChange={event=>setReason(event.target.value)}>{['','正在专注','正在开会 / 上课','当前不方便活动','已经活动过','今天不想被打扰'].map(item=><option key={item} value={item}>{item||'不说明原因'}</option>)}</select></label>
   </div>
  </section></div>}
  {editingProfile&&<Onboarding initial={data} editing={editingProfile==='edit'} onSave={saveProfile} onSkip={()=>{if(editingProfile==='first')updateData(current=>({...current,profile:{...current.profile,onboardingComplete:true}}));closeSetup();}}/>}
 </div>;
}
