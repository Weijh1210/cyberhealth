import {useState} from 'react';
import {cities,type City} from '../lib/courtyard';
import {emptyJournal,lifeItems,calendarSource,type LifeItem} from '../lib/restJournal';
import {requestNotifications} from '../lib/notifications';
import type {AppData} from '../lib/types';
import ReminderFields from './ReminderFields';
import {Source} from './RestRecords';
import {planRestReminder,uid,type UpdateData} from './useRestReminders';

export function RestSettings({data,update,pause,focusLife,exportData,clear,notify}:{data:AppData;update:UpdateData;pause:()=>void;focusLife:boolean;exportData:()=>void;clear:()=>void;notify:(s:string)=>void}){
 const [name,setName]=useState('');
 const [time,setTime]=useState('15:00');
 const [priv,setPriv]=useState(false);
 const r=data.reminder;
 function write(item:LifeItem){
  update(d=>({...d,courtyard:{...d.courtyard,reminders:[...d.courtyard.reminders.filter(x=>x.id!==item.id),item]},
   restJournal:{...(d.restJournal??emptyJournal()),disabledLife:(d.restJournal?.disabledLife??[]).filter(id=>id!==item.id)}}));
 }
 function remove(id:string){update(d=>({...d,courtyard:{...d.courtyard,reminders:d.courtyard.reminders.filter(x=>x.id!==id)}}));}
 const next=data.companion?.nextReminderAt;
 const recent=(data.restJournal?.pending??[]).filter(x=>x.state!=='pending').slice(-8).reverse();
 const states={pending:'待处理',done:'已完成',skipped:'已跳过',snoozed:'已延后',paused:'已暂停'};
 return <>
  <h1>我的节奏</h1>
  <section className="rest-panel" aria-labelledby="interval-title">
   <div className="panel-heading"><h2 id="interval-title">间隙提醒</h2><label className="inline-field"><input type="checkbox" checked={r.enabled&&!r.quiet} onChange={e=>{const enabled=e.target.checked;update(d=>planRestReminder(d,{enabled,quiet:false,pausedUntil:null,snoozedUntil:null,pendingReminderId:null},Date.now()));}}/>启用间隙提醒</label></div>
   {r.enabled&&!r.quiet&&<p role="status">{r.pausedUntil?`已暂停至 ${new Date(r.pausedUntil).toLocaleString('zh-CN')}`:next?`下次提醒：${new Date(next).toLocaleString('zh-CN')}`:'当前时段规则下暂无安排'}</p>}
   <ReminderFields value={r} onChange={value=>update(d=>planRestReminder(d,value,Date.now()))}/>
   {r.enabled&&!r.quiet&&<div className="rest-actions"><button onClick={pause}>暂停到指定时间</button>{r.pausedUntil&&<button onClick={()=>update(d=>planRestReminder(d,{pausedUntil:null},Date.now()))}>恢复间隙提醒</button>}</div>}
   <p>前台显示站内提醒；系统通知需要浏览器授权，后台或设备休眠可能延迟。关闭 App 后不再调度。错过的生活提醒不会补发。</p>
   <div className="rest-actions"><button onClick={async()=>{const result=await requestNotifications();update(d=>({...d,reminder:{...d.reminder,browserNotifications:result.granted}}));notify(result.message);}}>授权系统通知</button>{r.browserNotifications&&<button onClick={()=>update(d=>({...d,reminder:{...d.reminder,browserNotifications:false}}))}>关闭系统通知</button>}</div>
  </section>
  <section className="rest-panel" id="life-settings" tabIndex={-1} aria-labelledby="life-title">
   <h2 id="life-title">生活提醒</h2><p>{focusLife?'为午饭留一个位置。':'按设备当地时间，每天提醒一次。'} 与间隙提醒共用免打扰时段。</p>
   <div className="life-list">{lifeItems(data).map(item=><div key={item.id} className="life-row">
    <label className="inline-field"><input type="checkbox" checked={item.enabled} onChange={e=>write({...item,enabled:e.target.checked})}/>{item.label}{item.private?' · 私密':''}</label>
    <input type="time" aria-label={item.label+'提醒时间'} value={item.time} onChange={e=>{if(e.target.value)write({...item,time:e.target.value});}}/>
    {!item.id.startsWith('life:')&&<button onClick={()=>remove(item.id)} aria-label={`移除${item.label}提醒`}>移除</button>}
   </div>)}</div>
   <form className="rest-form" onSubmit={e=>{e.preventDefault();if(!name.trim())return;write({id:uid(),label:name.trim(),time,private:priv,enabled:true});setName('');}}>
    <label>自定义提醒<input maxLength={60} required value={name} onChange={e=>setName(e.target.value)} placeholder="例如：执行已有的护理计划"/></label>
    <label>时间<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label>
    <label className="inline-field"><input type="checkbox" checked={priv} onChange={e=>setPriv(e.target.checked)}/>私密通知仅显示「歇一下」</label>
    <button>添加生活提醒</button>
   </form>
  </section>
  {recent.length>0&&<section className="rest-panel"><details><summary>最近处理的提醒</summary><ul className="journal-list">{recent.map(x=><li key={x.id}><div><strong>{x.label}</strong><small>{states[x.state]}</small></div><time dateTime={new Date(x.at).toISOString()}>{new Date(x.at).toLocaleString('zh-CN')}</time></li>)}</ul></details></section>}
  <section className="rest-panel"><h2>四时画面</h2><div className="rest-form">
   <label>天气城市<select value={data.courtyard.city} onChange={e=>{const city=e.target.value as City;update(d=>({...d,courtyard:{...d.courtyard,city}}));}}>{Object.entries(cities).map(([key,city])=><option key={key} value={key}>{city.name}</option>)}</select></label>
   <label className="inline-field"><input type="checkbox" checked={data.staticLandscape} onChange={e=>{const staticLandscape=e.target.checked;update(d=>({...d,staticLandscape}));}}/>始终使用静态画面</label>
  </div><p><Source href={calendarSource}>香港天文台交节时刻（2025–2028）</Source></p></section>
  <section className="rest-panel"><h2>本地数据</h2><p>导出包含旧运动历史、设置、收藏及游历。私密提醒的内容也会包含在导出文件中。</p>
   <div className="rest-actions"><button onClick={exportData}>导出个人数据 JSON</button><button onClick={clear}>清除全部本地数据</button></div>
  </section>
 </>;
}
