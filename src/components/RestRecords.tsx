import {useState} from 'react';
import {journeyStops} from '../lib/journey';
import {activityById} from '../lib/activities';
import {cities,quickBreaks,slips} from '../lib/courtyard';
import {emptyJournal,herbSources,plantState,slipText,weatherSource,type SlipEntry} from '../lib/restJournal';
import {fortuneCards} from '../lib/seasonalContent';
import type {AppData} from '../lib/types';
import type {UpdateData} from './useRestReminders';
import {LeafCompanion} from './LeafCompanion';
import {HerbGarden} from './HerbGarden';
import {SpecimenArt} from './RestIllustration';

export function Source({href,children}:{href:string;children:React.ReactNode}){
 return <a href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}
export function SlipFace({entry,openHerbs}:{entry:SlipEntry;openHerbs:()=>void}){
 const slip=slipText[entry.id];
 return <div className="slip-face">
  <h3>{slip.name} <small>· {entry.term}</small></h3>
  <p className="slip-line">{slip.line}</p><small>原创签文</small>
  <p>{entry.reason}</p>
  {entry.weather&&<p><Source href={weatherSource}>Open-Meteo</Source> · {new Date(entry.weather.at).toISOString().replace('T',' ').slice(0,16)} UTC · WMO {entry.weather.code}</p>}
  {entry.id==='rain'&&<p>节气短笺：节气由太阳在黄道上的位置划分，每隔 15° 一节气。「雨水」是历法名，今天有没有雨，要看所在城市的天气。</p>}
  <p><Source href={slip.url}>{slip.basis}</Source></p>
  {(entry.id==='leaf'||entry.id==='peel')&&<button onClick={openHerbs}>打开{entry.id==='leaf'?'紫苏':'陈皮'}图鉴</button>}
 </div>;
}

export type JournalTab='notes'|'herbs'|'slips';
export function RestRecords({data,now,tab,setTab,update,specimen,art,plantPulse}:{data:AppData;now:number;tab:JournalTab;setTab:(tab:JournalTab)=>void;update:UpdateData;specimen?:'leaf'|'peel';art:React.ReactNode;plantPulse:boolean}){
 const j=data.restJournal??emptyJournal();
 const herbs=plantState(data);
 const [filter,setFilter]=useState('all');
 const [inspecting,setInspecting]=useState(false);
 const [leafPage,setLeafPage]=useState<'leaf'|'peel'|null>(null);
 const [turned,setTurned]=useState(0);
 const notes=[
  ...j.notes.map(n=>({...n,type:n.kind==='look'?'离屏':n.kind==='drink'?'喝水':['posture','feet','sit'].includes(n.kind)?'姿势调整':'短休息'})),
  ...data.courtyard.notes.map((n,i)=>({id:'old-'+i,title:quickBreaks[n.kind][0],at:n.at,text:undefined,fit:undefined,type:n.kind==='look'?'离屏':n.kind==='drink'?'喝水':n.kind==='posture'?'姿势调整':'短休息'})),
  ...data.sessions.filter(s=>s.status==='completed').map(s=>{
   const f=[...data.feedback].reverse().find(f=>f.sessionId===s.id);
   return {id:s.id,title:activityById(s.activityId)?.title??s.activityId,at:s.completedAt??s.startedAt,text:s.note,fit:f?.value==='liked'?'合适':f&&['unsuitable','uncomfortable','scene-mismatch','never'].includes(f.value)?'不方便':undefined,type:'指导活动'};
  }),
 ].sort((a,b)=>b.at.localeCompare(a.at)).filter(n=>filter==='all'||n.fit===filter||n.type===filter);
 const place=(kind:'leaf'|'peel')=>update(d=>{
  const owned=plantState(d);const journal=d.restJournal??emptyJournal();
  if(!(kind==='leaf'?owned.owned:owned.peel)||journal.exhibit.includes(kind))return d;
  return {...d,restJournal:{...journal,exhibit:[...journal.exhibit,kind]}};
 });
 return <>
  <h1>手记</h1>
  <div className="rest-tabs" aria-label="手记分类">{([['notes','休息记录'],['herbs','草木册'],['slips','节气签']] as const).map(([key,name])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{name}</button>)}</div>
  {tab==='notes'&&<section className="rest-panel">
   <div className="panel-heading"><h2>休息记录</h2><label className="inline-field">筛选<select value={filter} onChange={e=>setFilter(e.target.value)}>{['all','指导活动','离屏','喝水','姿势调整','短休息','合适','不方便'].map(x=><option key={x} value={x}>{x==='all'?'全部':x}</option>)}</select></label></div>
   {!notes.length&&<p>这里收着你愿意留下的休息记录。</p>}
   <div className="journal-welcome"><div><small>每一次停下来，都值得留下</small><p><strong>{data.sessions.filter(s=>s.status==='completed').length+j.notes.length+data.courtyard.notes.length}</strong> 份休息手记</p><span>按自己的节奏，慢慢来。</span></div><LeafCompanion/></div>
   <div className="journal-art">{art}</div>
   <ul className="journal-list">{notes.map(n=><li key={n.id}><div><small>{n.type}{n.fit?' · '+n.fit:''}</small><strong>{n.title}</strong>{n.text&&<p>{n.text}</p>}</div><time dateTime={n.at}>{new Date(n.at).toLocaleString('zh-CN',{dateStyle:'medium',timeStyle:'short'})}</time></li>)}</ul>
   {(data.journey.length>0||data.courtyard.leaf||data.courtyard.peel||data.courtyard.seeds>0||Object.keys(data.courtyard.plants).length>0)&&<details><summary>旧版游历与庭院</summary>
    <p>种苗 {data.courtyard.seeds} 株 · 种植 {Object.keys(data.courtyard.plants).length} 处 · 标本 {Number(Boolean(data.courtyard.leaf))+Number(data.courtyard.peel)} 份。原始进度可随 JSON 导出。</p>
    {data.journey.map((x,i)=><p key={i}>{x.day} · {journeyStops[i]?.title}</p>)}
   </details>}
  </section>}
  {tab==='herbs'&&<>
   <HerbGarden data={data} now={now} update={update} plantedNow={plantPulse}/>
   <section className="herb-book" aria-label="草木册" data-page={leafPage??'spread'}>
    <header className="book-cover"><span className="book-cover-mark" aria-hidden="true">本草</span><div><h2>草木册</h2><p>紫苏与陈皮 · 标本卷</p></div></header>
    <div className="book-controls" aria-label="标本册翻页">
      {([['leaf','紫苏页'],['peel','陈皮页'],[null,'展开全册']] as const).map(([key,label])=><button key={label} aria-pressed={leafPage===key} onClick={()=>{setLeafPage(key);setTurned(n=>n+1);}}>{label}</button>)}
    </div>
    <div className="specimens book-spread" key={turned} data-turned={turned>0}>
     <article tabIndex={-1} id="specimen-leaf" className={specimen==='leaf'?'specimen-target':''}><small className="book-folio">壹 ／ 紫苏</small><SpecimenArt kind="leaf"/><div><h3>紫苏叶</h3><small>{j.pressedAt?'压叶标本已收藏':herbs.owned?'已解锁图鉴':'尚未解锁'}</small>
      <p>确认完成一次指导活动后获得。观察卵形的叶片轮廓、锯齿状叶缘；干叶两面可呈棕紫，也可一面灰绿、一面棕紫。</p>
      <p><Source href={herbSources.leaf}>对照香港浸会大学标本照片</Source></p>
     </div></article>
     <article tabIndex={-1} id="specimen-peel" className={specimen==='peel'?'specimen-target':''}><small className="book-folio">贰 ／ 陈皮</small><SpecimenArt kind="peel"/><div><h3>陈皮标本</h3><small>{herbs.peel?'已收藏':'尚未收藏'}</small>
      <p>收藏紫苏后，观察一次陈皮标本即可收入草木册。</p>
      <p><Source href={herbSources.peel}>对照香港浸会大学标本照片</Source></p>
      {herbs.owned&&!herbs.peel&&!inspecting&&<button onClick={()=>setInspecting(true)}>观察陈皮</button>}
      {inspecting&&!herbs.peel&&<><p>外面颜色较深，可找点状油室；内面较浅，可看纹路与筋络。</p><button onClick={()=>update(d=>({...d,restJournal:{...(d.restJournal??emptyJournal()),peel:true}}))}>收下陈皮标本</button></>}
     </div></article>
    </div><p className="quiet-copy book-colophon">本页为原创示意图，原标本照片仅链接至馆藏页面。直链打不开时，可从 <Source href={herbSources.directory}>浸会大学中医药图书馆</Source> 检索紫苏叶 B00338、陈皮 B00162、藿香正气散 F00147。</p>
   </section>
   <section className="rest-panel"><div className="panel-heading"><h2>拼本草图谱</h2><small>{j.exhibit.length===2?'已收藏历史图谱':`${new Set(j.exhibit).size} / 2 个标本位置`}</small></div>
    <h3>藿香正气散 · 历史展签</h3>
    <p>据香港浸会大学中药方剂图像数据库 F00147 所录《太平惠民和剂局方》版本。主方以藿香为君，配半夏曲、陈皮、白术、茯苓为臣，大腹皮、厚朴、紫苏、白芷、桔梗为佐，炙甘草为使；姜、枣另见原方用法。</p>
    <p>数据库记载的传统证候为外感风寒兼内伤湿滞，涉及恶寒发热、胸腹满闷及吐泻等。这是历史展陈。</p>
    <ul className="exhibit-slots" aria-label="图谱位置">{([['leaf','紫苏叶 · 佐',herbs.owned],['peel','陈皮 · 臣',herbs.peel]] as const).map(([key,label,owned])=>{
     const lit=j.exhibit.includes(key);
     return <li key={key} data-lit={lit}><strong>{label}</strong>{lit?<span>已点亮</span>:owned?<button onClick={()=>place(key)}>放入 {label}</button>:<span>等待收藏</span>}</li>;
    })}</ul>
    <p><Source href={herbSources.formula}>核对出处与完整组成</Source></p>
   </section>
  </>}
  {tab==='slips'&&<section className="rest-panel"><h2>历次节气签</h2>
   {!Object.keys(j.draws).length&&!Object.keys(data.courtyard.draws).length&&!Object.keys(data.dailyDraws).length&&<p>抽过的签会收在这里。</p>}
   {Object.entries(j.draws).sort(([a],[b])=>b.localeCompare(a)).map(([day,entry])=><details key={day}><summary>{day} · {slipText[entry.id].name}</summary><SlipFace entry={entry} openHerbs={()=>setTab('herbs')}/></details>)}
   {Object.entries(data.courtyard.draws).sort(([a],[b])=>b.localeCompare(a)).map(([day,x])=><details key={'old'+day}><summary>{day} · {slips[x.id].name}（旧签）</summary><p>{x.term} · {slips[x.id].line}</p><Source href={slips[x.id].url}>{slips[x.id].source}</Source></details>)}
   {Object.entries(data.dailyDraws).sort(([a],[b])=>b.localeCompare(a)).map(([day,x])=>{const card=fortuneCards.find(c=>c.id===x.cardId);return <details key={'fortune'+day}><summary>{day} · 旧版签</summary><p>{card?card.blessing.zh+' · '+card.copy.zh:x.cardId}</p></details>;})}
   <p className="quiet-copy">按所选城市日期归档。当前城市：{cities[data.courtyard.city].name}。</p>
  </section>}
 </>;
}
