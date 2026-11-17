'use client';

import {useCallback,useEffect,useState} from 'react';
import {localRepository} from '../data/repository';
import {clearReminderClaims} from '../data/reminderClaim';
import {activityById} from '../lib/activities';
import {cities,slips} from '../lib/courtyard';
import {remainingSeconds,transitionSession} from '../lib/execution';
import {completeRest,initialData} from '../lib/store';
import {respondToReminder} from '../lib/reminders';
import {cityMoment,conditions,drawDaily,emptyJournal,plantState,readingWeather,restSuggestions,weatherName,weatherSource,calendarSource,type Pending,type RestKind,type RestSuggestion} from '../lib/restJournal';
import {plantHerb} from '../lib/herbGarden';
import {restSeason} from '../lib/restSeason';
import type {Activity,AppData,Session} from '../lib/types';
import {GardenGame} from './GardenGame';
import {gardenPlaces,type GardenPlace} from '../lib/gardenGame';
import {useDialogFocus} from './useDialogFocus';
import {LeafCompanion} from './LeafCompanion';
import {SlipDraw} from './SlipDraw';
import {RestIllustration} from './RestIllustration';
import {RestRecords,SlipFace,Source,type JournalTab} from './RestRecords';
import {RestActivityLibrary} from './RestActivityLibrary';
import {sourcesFor} from '../lib/evidenceSources';
import {RestSettings} from './RestSettings';
import {clearWeather,useRestWeather} from './useRestWeather';
import {planRestReminder,uid,useRestReminders,type UpdateData} from './useRestReminders';
import PwaStatus from './PwaStatus';
import AccountPanel from './AccountPanel';
import {useAccount} from './useAccount';
import {cloudConfigured} from '../lib/account';
import {recordRecommendation} from '../lib/activityFeedback';

type Page='home'|'records'|'settings';
const nav=[['home','游园','M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z'],['records','行囊','M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5'],['settings','我的节奏','M3 6h18M3 12h18M3 18h18M8 4v4m8 2v4m-7 2v4']] as const;
const checkSources=[
 ['https://www.hse.gov.uk/msd/dse/good-posture.htm','HSE · 工位摆放'],
 ['https://www.hse.gov.uk/msd/dse/good-posture.htm','HSE · 工位摆放'],
 ['https://www.hse.gov.uk/msd/uld/art/posture.htm','HSE · 支撑与姿势'],
 ['https://www.who.int/news-room/questions-and-answers/item/deafness-and-hearing-loss-safe-listening','世界卫生组织 · 安全聆听'],
 null,
 ['https://www.nhs.uk/symptoms/tiredness-and-fatigue/','NHS · 何时寻求帮助'],
] as const;
const lights={morning:'早晨',day:'白天',dusk:'黄昏',night:'夜晚'};
const seasons={spring:'春',summer:'夏',autumn:'秋',winter:'冬'};
const checks=[
 ['看屏幕总想凑近','试着放大字号，把屏幕放到不用探头也看得清的位置。若经常看不清，可考虑检查视力。'],
 ['肩颈紧','把鼠标移近一点，让肩膀放松；有条件就换个姿势。'],
 ['脚缺少支撑','调一下座高，或用稳固脚踏，让脚掌有支撑。'],
 ['戴耳机容易调大声','先调低音量，找个安静处摘下耳机歇一会儿。'],
 ['午饭常被挤掉','在日程里留出吃饭时间，也可以设一个吃饭提醒。'],
 ['反复疲劳','如果可以，离开工位歇久一点。若持续或影响日常生活，可联系校医、家庭医生或职业健康服务。'],
];
const dateInput=()=>{const x=new Date(Date.now()+3600000);return new Date(+x-x.getTimezoneOffset()*60000).toISOString().slice(0,16);};

export default function RestApp(){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 return mounted?<AccountGate/>:<main className="rest-loading" aria-busy="true">正在打开摸鱼养生局…</main>;
}
function AccountGate(){
 const account=useAccount();
 return account.loading?<main className="rest-loading">正在核对账号…</main>:<RestWorkspace key={account.user?.id??'guest'} account={account}/>;
}
function RestWorkspace({account}:{account:ReturnType<typeof useAccount>}){
 const [data,setData]=useState(()=>localRepository.read());
 const [now,setNow]=useState(Date.now);
 const [page,setPage]=useState<Page>('home');
 const [tab,setTab]=useState<JournalTab>('notes');
 const [specimen,setSpecimen]=useState<'leaf'|'peel'>();
 const [choice,setChoice]=useState(0);
 const [preview,setPreview]=useState<Activity|null>(null);
 const [quick,setQuick]=useState<RestSuggestion|null>(null);
 const [done,setDone]=useState<Session|null>(null);
 const [newSeed,setNewSeed]=useState(false);
 const [plantPulse,setPlantPulse]=useState(false);
 const [note,setNote]=useState('');
 const [fit,setFit]=useState<''|'合适'|'不方便'>('');
 const [busyOpen,setBusyOpen]=useState(false);
 const [check,setCheck]=useState(false);
 const [focusLife,setFocusLife]=useState(false);
 const [notice,setNotice]=useState('');
 const [pauseUntil,setPauseUntil]=useState(dateInput);
 const [reason,setReason]=useState('正在开会 / 上课');
 const [expanded,setExpanded]=useState(false);
 const [library,setLibrary]=useState(false);
 const [gamePanel,setGamePanel]=useState<'activity'|'slip'|'library'|'check'|null>(null);
 const [gamePlace,setGamePlace]=useState<GardenPlace>('hall');
 const [checkedSupport,setCheckedSupport]=useState(false);
 const journal=data.restJournal??emptyJournal();
 const pending=journal.pending.filter(x=>x.state==='pending');
 const active=[...data.sessions].reverse().find(s=>['running','paused','ready'].includes(s.status));
 const activeActivity=active&&activityById(active.activityId);
 const c=conditions(data);
 const {options,preference}=restSuggestions(data);
 const suggestion=options[choice%options.length];
 const city=data.courtyard.city;
 const moment=cityMoment(new Date(now),city);
 const season=restSeason(new Date(now));
 const weather=useRestWeather(city,now);
 const condition=readingWeather(weather.reading);
 const currentDraw=journal.draws[moment.day];
 const legacyDraw=data.courtyard.draws[moment.day];
 const oldDraw=data.dailyDraws[moment.day];
 const term=season.term??'当季';
 const firstReminder=pending.find(x=>x.kind==='break');

 const update=useCallback<UpdateData>(change=>{
  const current=localRepository.read();
  const next=change(current);
  if(current!==next&&!localRepository.save(next))setNotice('浏览器未保存更改；刷新后可能丢失。');
  setData(next);
  return next;
 },[]);
 const go=useCallback((target:Page)=>{
  setPage(target);setGamePanel(null);setBusyOpen(false);setCheck(false);setFocusLife(false);window.scrollTo({top:0,behavior:'instant'});
 },[]);
 useEffect(()=>{if(page!=='records'&&plantPulse)setPlantPulse(false);},[page,plantPulse]);
 const openReminder=useCallback(()=>{go('home');setChoice(0);setPreview(null);setQuick(null);setDone(null);setGamePanel('activity');},[go]);
 const claimFailed=useCallback(()=>setNotice('浏览器无法保存提醒协调记录，自动提醒未触达。'),[]);
 useRestReminders(now,update,openReminder,claimFailed);
 useEffect(()=>localRepository.subscribe(setData),[]);
 useEffect(()=>{
  const sync=()=>setNow(Date.now());
  const timer=setInterval(sync,1000);
  document.addEventListener('visibilitychange',sync);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
 },[]);
 useEffect(()=>{
  if(active?.status!=='running'||remainingSeconds(active,now)>0)return;
  update(d=>({...d,sessions:d.sessions.map(s=>s.id===active.id?transitionSession(s,'tick',now):s)}));
 },[active,now,update]);
 useEffect(()=>{
  const hash=()=>{if(location.hash==='#rest')openReminder();};
  const message=(e:MessageEvent)=>{if(e.data?.type==='cyberhealth-rest')openReminder();};
  hash();window.addEventListener('hashchange',hash);window.addEventListener('cyberhealth-rest',openReminder);navigator.serviceWorker?.addEventListener('message',message);
  return()=>{window.removeEventListener('hashchange',hash);window.removeEventListener('cyberhealth-rest',openReminder);navigator.serviceWorker?.removeEventListener('message',message);};
 },[openReminder]);
 useEffect(()=>{
  if(page!=='records'||tab!=='herbs'||!specimen)return;
  const el=document.getElementById(`specimen-${specimen}`);el?.scrollIntoView({block:'nearest',behavior:'instant'});el?.focus({preventScroll:true});
 },[page,tab,specimen]);
 useEffect(()=>{
  if(!focusLife)return;
  const el=document.getElementById('life-settings');el?.scrollIntoView();el?.focus({preventScroll:true});
 },[focusLife]);

 function edit(part:Partial<typeof c>){
  update(d=>({...d,restJournal:{...(d.restJournal??emptyJournal()),...part}}));setChoice(0);
 }
 function setPending(id:string,state:Pending['state']){
  update(d=>{const j=d.restJournal??emptyJournal();return {...d,restJournal:{...j,pending:j.pending.map(p=>p.id===id?{...p,state}:p)}};});
 }
 function respond(type:'accepted'|'skipped'|'postponed'|'paused',minutes=0,only?:string){
  const at=Date.now();
  update(d=>{
   const j=d.restJournal??emptyJournal();
   const item=j.pending.find(x=>x.kind==='break'&&x.state==='pending'&&(!only||x.id===only));
   let next=d;
   if(item&&d.companion&&d.reminder.enabled){
    const occurrence=item.id;
    next=respondToReminder(d,type,at,uid(),reason,minutes);
    if(type==='postponed'){
     const snoozed=next.reminder.snoozedUntil;
     next={...next,reminder:{...next.reminder,pendingReminderId:snoozed?occurrence:null}};
    }
   }else if(type==='paused'||type==='postponed'){
    const until=new Date(at+minutes*60000).toISOString();
    next=planRestReminder(d,{pausedUntil:until,snoozedUntil:null,pendingReminderId:null},at);
   }
   return {...next,restJournal:{...j,pending:j.pending.map(p=>p.kind==='break'&&p.state==='pending'&&(!only||p.id===only)?{...p,state:type==='accepted'?'done':type==='postponed'?'snoozed':type==='paused'?'paused':'skipped'}:p)}};
  });
  setBusyOpen(false);
  if(type!=='accepted')setNotice(type==='skipped'?'已跳过这次。':!data.reminder.enabled?'间隙提醒当前关闭，可在「我的节奏」开启。':type==='paused'?'已暂停间隙提醒。':'间隙提醒已延后。');
 }
 function startSuggestion(){
  setNotice('');setNote('');setFit('');setDone(null);
  if('activity' in suggestion){setCheckedSupport(false);setPreview(suggestion.activity);}
  else{setQuick(suggestion);if(firstReminder)respond('accepted');}
 }
 function startTimer(){
  if(!preview||preview.meta.equipmentRequired.length>0&&!checkedSupport)return;
  const at=Date.now();
  const session:Session={id:uid(),activityId:preview.id,preference,startedAt:new Date(at).toISOString(),status:'running',deadlineAt:at+preview.durationSeconds*1000,remainingSeconds:preview.durationSeconds,source:firstReminder?'reminder':'manual',reminderId:firstReminder?.id};
  update(d=>d.sessions.some(s=>['running','paused','ready'].includes(s.status))?d:recordRecommendation({...d,sessions:[...d.sessions,session]},preview,session.id,new Date(at)));
  if(firstReminder)respond('accepted');
  setPreview(null);
 }
 function timerAction(action:'start'|'pause'|'skip'){
  if(!active)return;
  update(d=>({...d,sessions:d.sessions.map(s=>s.id===active.id?transitionSession(s,action,Date.now()):s)}));
 }
 function finish(){
  if(!active)return;
  const key=localRepository.currentKey();
  const confirm=()=>{
   if(localRepository.currentKey()!==key)return;
   let granted=false,changed=false;
   const next=update(d=>{
    const result=completeRest(d,active.id,new Date(),note.trim());
    changed=result!==d;
    granted=changed&&!plantState(d).owned;
    return result;
   });
   if(!changed)return;
   const session=next.sessions.find(s=>s.id===active.id&&s.status==='completed');
   if(session){setDone(session);setNewSeed(granted);setNote('');}
  };
  if(navigator.locks)void navigator.locks.request(`${key}:completion`,confirm).catch(()=>setNotice('未能确认完成，请再试一次。'));
  else confirm();
 }
 function plant(){
  update(d=>plantHerb(d,new Date()));
  setNewSeed(false);setPlantPulse(true);openHerbs();
 }
 function saveQuick(){
  if(!quick)return;
  const entry={id:uid(),kind:quick.id as RestKind,title:quick.title,at:new Date().toISOString(),text:note.trim()||undefined,fit:fit||undefined};
  update(d=>{const j=d.restJournal??emptyJournal();return {...d,restJournal:{...j,notes:[...j.notes,entry]}};});
  setQuick(null);setNotice('已记入手记。');
 }
 function exportData(){
  const url=URL.createObjectURL(new Blob([localRepository.export(localRepository.read())],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`cyberhealth-${moment.day}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function clear(){
  if(!window.confirm('清除本机的休息历史、提醒设置、收藏和旧游历？此操作不能撤销。'))return;
  if(!localRepository.clear()){setNotice('浏览器未能清除本地数据。');return;}
  clearWeather();void clearReminderClaims();setData(initialData());openReminder();setNotice('本地数据已清除。');
 }
 function openHerbs(which?:'leaf'|'peel'){go('records');setTab('herbs');setSpecimen(which);}
 function enterPlace(place:GardenPlace){
  setGamePlace(place);
  if(place==='herbs'){openHerbs();return;}
  if(place==='oracle'){setGamePanel('slip');return;}
  const next=update(d=>({...d,restJournal:{...(d.restJournal??emptyJournal()),focus:gardenPlaces[place].focus,...(place==='bridge'?{minutes:Math.max(60,conditions(d).minutes)}:{})}}));
  const choices=restSuggestions(next).options;
  const index=place==='hall'?choices.findIndex(x=>'activity' in x):place==='bridge'?choices.findIndex(x=>x.id==='walk'):0;
  setChoice(Math.max(0,index));setGamePanel('activity');
 }
 function closeGamePanel(){setGamePanel(null);setPreview(null);setQuick(null);setDone(null);setBusyOpen(false);setLibrary(false);}
 const panelOpen=page==='home'&&Boolean(gamePanel||preview||quick||done||busyOpen);
 useDialogFocus(panelOpen,'.game-sheet',closeGamePanel);
 useEffect(()=>{if(!panelOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[panelOpen]);
 const shown=page==='home'&&(activeActivity||preview||quick||done);
 const headline=activeActivity?.title??preview?.title??quick?.title??(done?'小院收到了你的闲暇':`在${gardenPlaces[gamePlace].name}，歇一歇`);
 const seconds=active?remainingSeconds(active,now):0;
 const guide=activeActivity??preview;
 const checkButton=<button className="rest-text" onClick={()=>setCheck(v=>!v)} aria-expanded={check}>看看哪里卡住了 <span aria-hidden="true">↗</span></button>;
 return <div className="rest-app game-app" data-page={page} data-season={season.season} data-weather={condition} data-light={moment.light} data-static={data.staticLandscape}>
  <header className="rest-header"><div className="rest-frame">
   <button className="rest-brand" onClick={()=>go('home')}><span className="rest-seal" aria-hidden="true">歇</span><span>摸鱼养生局<small>一方山水，片刻自在</small></span></button>
   <div className="rest-header-meta"><span>{moment.day} · {lights[moment.light]}</span><span>{cities[city].name} · {weatherName[condition]}{weather.status==='cached'?'（缓存）':''}</span></div>
  </div></header>
  {page==='home'&&<div inert={panelOpen}><GardenGame data={data} day={moment.day} term={term} weather={weatherName[condition]} onEnter={enterPlace} onRecords={()=>go('records')}/></div>}
  {page==='home'&&!panelOpen&&(notice||pending.length>0||active)&&<div className="garden-world-notice" role="status">{notice&&<span>{notice}</span>}{pending.length>0&&<button onClick={()=>setGamePanel('activity')}>小竹捎来 {pending.length} 条提醒 →</button>}{active&&<button onClick={()=>setGamePanel('activity')}>继续这段休息 →</button>}</div>}
  {panelOpen&&<div className="game-scrim" onClick={closeGamePanel} aria-hidden="true"/>}
  <main className={`rest-frame rest-main ${page==='home'?'game-sheet':''}`} hidden={page==='home'&&!panelOpen} role={panelOpen?'dialog':undefined} aria-modal={panelOpen||undefined} aria-label={panelOpen?gardenPlaces[gamePlace].name:undefined}>
   {panelOpen&&<div className="game-sheet-top"><span>{gamePanel==='slip'?'拾光轩':gardenPlaces[gamePlace].name} · 一段小小的闲暇</span><button onClick={closeGamePanel} aria-label="回到庭园">回到庭园 ×</button></div>}
   <PwaStatus/>
   {notice&&<div role="status" className="rest-notice">{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}>×</button></div>}
   {page==='home'&&<>
    <div className="rest-page-title"><div>{!shown&&gamePanel==='activity'&&<p className="rest-greeting">{moment.light==='morning'?'早上好':moment.light==='night'?'晚上好':'给自己一点空闲'}</p>}<h1>{gamePanel==='slip'?'今日有何相遇':headline}</h1></div><span className="season-label"><span aria-hidden="true">{seasons[season.season]}</span>{term}</span></div>
    {!shown&&gamePanel==='activity'&&<section className="rest-hero" aria-label="当前推荐">
     <div className="rest-hero-copy">
      <div className="rest-conditions">
       <label>能否离座<select value={c.away?'yes':'no'} onChange={e=>edit({away:e.target.value==='yes'})}><option value="no">留在原位</option><option value="yes">方便离座</option></select></label>
       <label>可用时间<select value={c.minutes} onChange={e=>edit({minutes:Number(e.target.value)})}>{[[30,'半分钟'],[60,'1 分钟'],[120,'2 分钟'],[180,'3 分钟'],[300,'5 分钟'],[600,'10 分钟'],[1200,'20 分钟']].map(([n,label])=><option key={n} value={n}>{label}</option>)}</select></label>
       <button className="rest-text" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'收起条件':'更多条件'}</button>
      </div>
      {expanded&&<div className="rest-conditions rest-extra">
       <label>现在的姿势<select value={c.posture} onChange={e=>edit({posture:e.target.value as typeof c.posture})}><option value="seated">坐着</option><option value="standing">站着</option></select></label>
       <label>想让哪里歇一下<select value={c.focus} onChange={e=>edit({focus:e.target.value as typeof c.focus})}><option value="general">都可以</option><option value="eyes">眼睛</option><option value="hands">手</option><option value="brain">脑子</option></select></label>
       {c.away&&<label>可用空间<select value={c.room} onChange={e=>edit({room:e.target.value as typeof c.room})}><option value="small">身边有空位</option><option value="spacious">有宽敞空间</option><option value="outdoor">可以去户外</option></select></label>}
       <label>场景<select value={data.currentScene} onChange={e=>{const scene=e.target.value as AppData['currentScene'];update(d=>({...d,currentScene:scene,preference:{...d.preference,scene}}));setChoice(0);}}>
        {Object.entries({office:'办公室',library:'图书馆',classroom:'教室',home:'家中',transit:'公共交通',outdoor:'户外',other:'其他'}).map(([k,v])=><option key={k} value={k}>{v}</option>)}
       </select></label>
       <div className="rest-actions rest-equipment">
        <label className="inline-field"><input type="checkbox" checked={data.preference.smallMovement??data.profile.smallMovement} onChange={e=>{const smallMovement=e.target.checked;update(d=>({...d,preference:{...d.preference,smallMovement}}));setChoice(0);}}/>只做小动作</label>
        {([['stable-chair','有稳固椅'],['wall','有墙可扶']] as const).map(([id,label])=><label className="inline-field" key={id}><input type="checkbox" checked={data.preference.availableEquipment?.includes(id)??false} onChange={e=>{const checked=e.target.checked;update(d=>({...d,preference:{...d.preference,availableEquipment:[...(d.preference.availableEquipment??[]).filter(x=>x!==id),...(checked?[id]:[])]}}));setChoice(0);}}/>{label}</label>)}
       </div>
      </div>}
      <div className="suggestion-copy" aria-live="polite">
       <small>{'activity' in suggestion?`指导活动 · ${suggestion.activity.durationSeconds} 秒`:'短休息 · 无需计时'}</small>
       <h2>{suggestion.title}</h2><p>{suggestion.description}</p>
      </div>
      <div className="rest-actions"><button className="rest-primary" onClick={startSuggestion}>{'activity' in suggestion?'查看步骤':'歇一下'}</button>
       <button onClick={()=>setChoice(x=>x+1)}>换一个</button><button className="rest-text" onClick={()=>setBusyOpen(v=>!v)} aria-expanded={busyOpen}>现在不方便</button></div>
     </div>
     <div className="rest-visual"><RestIllustration season={season.season} term={term} weather={condition}/><LeafCompanion/><div className="rest-visual-caption"><span>{term} · {season.content?.description.zh??'随时令换一张纸。'}</span><span>四时窗笺</span></div></div>
    </section>}
    {(guide||quick)&&<div className="garden-quest-story"><LeafCompanion/><p>{gardenPlaces[gamePlace].line}<small>{active?.status==='paused'?'小竹在这里等你，随时可以继续。':'完成这段休息，庭园会添一朵小花。'}</small></p></div>}
    {guide&&<section className="rest-panel guide-panel" aria-label="活动步骤">
     <div className="panel-heading"><h2>活动步骤</h2><small>{guide.durationSeconds} 秒 · 按舒适程度进行</small></div>
     <ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol>
     <p>{guide.precautions} {guide.meta.safetyWarnings.join(' ')}</p>
     <p className="quiet-copy">动作来源：{guide.source}</p>
     {sourcesFor(guide.id).map(source=><p key={source.id}><Source href={source.url}>{source.organization} · {source.title}</Source></p>)}
     {!active&&guide.meta.equipmentRequired.length>0&&<p><label className="inline-field"><input type="checkbox" checked={checkedSupport} onChange={e=>setCheckedSupport(e.target.checked)}/>确认身边有{guide.meta.equipmentRequired.map(x=>x==='wall'?'可扶的墙':'稳固、不会滑动的椅子').join('、')}</label></p>}
     {!active&&<div className="rest-actions"><button className="rest-primary" disabled={guide.meta.equipmentRequired.length>0&&!checkedSupport} onClick={startTimer}>开始计时</button><button onClick={()=>setPreview(null)}>返回建议</button></div>}
     {active&&<><p className="rest-timer" role="timer" aria-label="剩余时间">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p><div className="rest-actions">
      {active.status==='running'&&<button className="rest-primary" onClick={()=>timerAction('pause')}>暂停计时</button>}
      {active.status==='paused'&&<button className="rest-primary" onClick={()=>timerAction('start')}>继续计时</button>}
      {active.status==='ready'&&<><label className="note-input">加一句手记（选填）<input value={note} onChange={e=>setNote(e.target.value)} maxLength={180}/></label><button className="rest-primary" onClick={finish}>我已完成，确认记录</button></>}
      <button onClick={()=>timerAction('skip')}>退出活动</button>
     </div></>}
    </section>}
    {quick&&<section className="rest-panel"><p>{quick.description}</p>
     <div className="rest-actions"><button className="rest-primary" onClick={()=>setQuick(null)}>不记录，返回</button><button onClick={saveQuick}>记入手记</button></div>
     <details open={quick.id==='quiet'?true:undefined}><summary>给这次休息留句话</summary>
      <div className="rest-form"><label>{quick.id==='quiet'?'回来从这里继续':'手记（选填）'}<input maxLength={180} value={note} onChange={e=>setNote(e.target.value)}/></label>
       <label>这种方式<select value={fit} onChange={e=>setFit(e.target.value as typeof fit)}><option value="">不标记</option><option>合适</option><option>不方便</option></select></label></div>
     </details>
    </section>}
    {done&&<section className="rest-panel"><h2>{newSeed?'山居初见绿，获得一株紫苏苗':'又收下了一段闲暇'}</h2>
     {newSeed&&<><p>紫苏苗已收入草木册。现在种下，也可以以后再种。</p><div className="rest-actions"><button className="rest-primary" onClick={plant}>种下</button><button onClick={()=>setNewSeed(false)}>先收起来</button></div></>}
     <div className="rest-actions"><button onClick={()=>openHerbs()}>{plantState(data).plantedAt?'去小圃照料':'打开草木册'}</button><button onClick={()=>setDone(null)}>返回建议</button></div>
     <p>庭园里又开了一朵小花，回去看看吧。这项活动适合当时的情况吗？</p><div className="rest-actions">{(['合适','不方便'] as const).map(value=><button key={value} aria-pressed={[...data.feedback].reverse().find(x=>x.sessionId===done.id)?.value===(value==='合适'?'liked':'unsuitable')} onClick={()=>update(d=>({...d,feedback:[...d.feedback.filter(x=>x.sessionId!==done.id),{id:uid(),sessionId:done.id,activityId:done.activityId,scene:done.preference.scene,value:value==='合适'?'liked':'unsuitable',at:new Date().toISOString()}]}))}>{value}</button>)}</div>
    </section>}
   </>}
   {busyOpen&&<section className="rest-panel" aria-label="现在不方便">
    <h2>给当前任务留点时间</h2><div className="rest-form"><label>现在的情况<select value={reason} onChange={e=>setReason(e.target.value)}><option>正在开会 / 上课</option><option>正在赶进度</option><option>暂时不想休息</option></select></label>
    <label>暂停到<input type="datetime-local" value={pauseUntil} onChange={e=>setPauseUntil(e.target.value)}/></label></div>
    <div className="rest-actions"><button onClick={()=>respond('postponed',15)}>延后 15 分钟</button><button onClick={()=>respond('skipped')}>跳过这次</button>
     <button onClick={()=>{const delta=Date.parse(pauseUntil)-Date.now();if(!Number.isFinite(delta)||delta<=0){setNotice('请选择未来的恢复时间。');return;}respond('paused',delta/60000);}}>确认暂停</button><button onClick={()=>setBusyOpen(false)}>返回</button></div>
    {!data.reminder.enabled&&<small>间隙提醒当前关闭，延后或暂停不会自动开启。</small>}
   </section>}
   {pending.length>0&&<section className="rest-panel reminder-bundle" aria-label="到期提醒"><div className="panel-heading"><h2>到期提醒</h2><small>{pending.length} 项待处理</small></div>
    <ul className="journal-list">{pending.map(item=><li key={item.id}><strong>{item.label}</strong><div className="rest-actions">
     {item.kind==='break'?<><button onClick={()=>{openReminder();if(page==='home')window.scrollTo({top:0,behavior:'instant'});}}>看休息建议</button><button onClick={()=>{go('home');setBusyOpen(true);}}>稍后处理</button></>:<button onClick={()=>setPending(item.id,'done')}>标为完成</button>}
     <button onClick={()=>item.kind==='break'?respond('skipped',0,item.id):setPending(item.id,'skipped')}>跳过{item.kind==='life'?item.label:''}</button>
    </div></li>)}</ul>
   </section>}
   {page==='home'&&<>
    {!shown&&gamePanel==='slip'&&<SlipDraw key={moment.day} entry={currentDraw} archived={Boolean(legacyDraw||oldDraw)} staticOnly={data.staticLandscape} onDraw={()=>update(d=>drawDaily(d,new Date(),term,weather.reading,weather.status==='live'))}>
     {currentDraw&&<SlipFace entry={currentDraw} openHerbs={()=>openHerbs(currentDraw.id==='leaf'?'leaf':'peel')}/>}
     {legacyDraw&&<p>{slips[legacyDraw.id].name} · {slips[legacyDraw.id].line}（旧签）</p>}
     {oldDraw&&!legacyDraw&&<button onClick={()=>{go('records');setTab('slips');}}>回看今日旧签</button>}
    </SlipDraw>}
    {!shown&&gamePanel==='activity'&&<section className="rest-panel"><div className="panel-heading"><div><h2>想自己挑个动作？</h2><p>在动作库按部位和当前条件查找。</p></div><button aria-expanded={library} onClick={()=>setLibrary(v=>!v)}>{library?'收起动作库':'浏览动作库'}</button></div></section>}
    {!shown&&library&&<RestActivityLibrary data={data} preference={preference} open={activity=>{setCheckedSupport(false);setNote('');setPreview(activity);window.scrollTo({top:0,behavior:'instant'});}}/>}
    {gamePanel==='activity'&&<section className="rest-panel check-panel"><h2>工位自查</h2><p>有哪里总不舒服，或者总被挤掉？可以从一件小事开始。</p>{checkButton}
     {check&&<div className="check-list">{checks.map(([name,description],i)=><details key={name}><summary>{name}</summary><p>{description}</p>
      {checkSources[i]&&<p><Source href={checkSources[i]![0]}>{checkSources[i]![1]}</Source></p>}
      {i===4&&<button onClick={()=>{go('settings');setFocusLife(true);}}>打开生活提醒</button>}
      {i===5&&<button onClick={()=>{setQuick({id:'quiet',title:'留一段更长的休息',description:'把设备放下，在方便的地方休息几分钟。回来时也可以选择不记录。'});setDone(null);setPreview(null);window.scrollTo({top:0,behavior:'instant'});}}>安排更长休息</button>}
     </details>)}</div>}
    </section>}
   </>}
   {page==='records'&&<RestRecords data={data} now={now} tab={tab} setTab={setTab} update={update} specimen={specimen} plantPulse={plantPulse} art={<RestIllustration season={season.season} term={term} weather={condition}/>}/>}
   {page==='settings'&&<><RestSettings data={data} update={update} pause={()=>{setPauseUntil(dateInput());setBusyOpen(true);window.scrollTo({top:0,behavior:'instant'});}} focusLife={focusLife} exportData={exportData} clear={clear} notify={setNotice}/>{cloudConfigured&&<AccountPanel user={account.user} error={account.error} data={data} onData={setData}/>}</>}
   <footer className="rest-footer"><div><span>天气 · {cities[city].name} · {weatherName[condition]}</span>{weather.reading&&<span>{weather.status==='cached'?'上次更新的天气':'更新时间'} {new Intl.DateTimeFormat('zh-CN',{timeZone:moment.zone,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(weather.reading.at)}</span>}<Source href={weatherSource}>Open-Meteo 当前模型天气</Source></div>
    <div><span>节气 · {season.term??'历表暂未覆盖'}</span><Source href={calendarSource}>香港天文台历表</Source>{season.at&&<span>交节 {new Intl.DateTimeFormat('zh-CN',{timeZone:moment.zone,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(season.at)}（城市当地时间）</span>}</div>
   </footer>
  </main>
  <nav className="rest-nav" aria-label="主导航" inert={panelOpen}><div className="rest-frame">{nav.map(([key,label,path])=><button key={key} aria-current={page===key?'page':undefined} onClick={()=>go(key)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path}/></svg>{label}</button>)}</div></nav>
 </div>;
}
