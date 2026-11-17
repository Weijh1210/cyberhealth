import {useState} from 'react';
import {herbGarden,plantHerb,tendHerb} from '../lib/herbGarden';
import {cities} from '../lib/courtyard';
import type {AppData} from '../lib/types';
import type {UpdateData} from './useRestReminders';

const leaves=[[99,121,-44],[105,111,38],[102,86,-56],[110,76,50],[106,55,6],[78,103,-66],[129,102,66]] as const;
export function HerbGarden({data,now,update,plantedNow}:{data:AppData;now:number;update:UpdateData;plantedNow:boolean}){
 const herb=herbGarden(data,new Date(now));
 const [pulse,setPulse]=useState(0);
 const [planted,setPlanted]=useState(plantedNow);
 const [message,setMessage]=useState(plantedNow?'紫苏种下了，现在可以浇水。':'');
 function tend(action:'water'|'press'){
  let changed=false;
  const next=update(d=>{const result=tendHerb(d,new Date(),action);changed=result!==d;return result;});
  if(!changed)return;
  if(action==='water'){
   setPulse(x=>x+1);
   setMessage(herbGarden(next,new Date()).canPress?'叶片舒展开了，可以收一片做标本。':'泥土湿润了，紫苏冒出一对新叶。');
  }else setMessage('压叶标本已收入草木册。');
 }
 const state=['未种下','已种下','长出新叶','叶片舒展'][herb.stage];
 return <section className="rest-panel herb-bed" aria-labelledby="herb-bed-title">
  <div className="herb-view" data-growth={pulse?"watered":planted?"planted":"still"}>
   <svg viewBox="0 0 210 174" role="img" aria-label={`紫苏小圃：${state}`}>
    <path d="M14 155h182M24 162h159" stroke="currentColor" opacity=".24"/>
    <ellipse cx="105" cy="131" rx="61" ry="17" fill="#8b765c"/>
    <path d="M45 132Q49 154 60 158H150Q161 153 165 132Q105 152 45 132Z" fill="#b48d6e"/>
    <path d="M51 130Q105 107 159 130Q104 151 51 130Z" fill={herb.wateredToday?'#5a5147':'#79624e'}/>
    <g className="herb-growing" key={pulse+"-"+planted}>
    {herb.stage>0&&<path d={herb.stage===1?'M105 131q-2-10-8-18m8 16q4-8 10-10':'M104 131q2-32 4-79m-3 62q-14-9-27-11m27 18q14-17 24-19'} fill="none" stroke="#476440" strokeWidth="3"/>}
    {leaves.slice(0,herb.stage===0?0:herb.stage===1?2:herb.stage===2?5:7).map(([x,y,angle],i)=>
     <g key={x+'-'+y} transform={`translate(${x} ${y}) rotate(${angle}) scale(${herb.stage===1?.42:herb.stage===2?.76:1})`}>
      <path d="M0 3C-10 1-15-8-11-17l3 1-2-6 4 1 5-9 4 9 4-2-1 6 4-1C17-7 9 1 0 3Z" fill={i%3===0?'#775b71':'#4b7457'}/>
      <path d="M0 3V-22m0 11l-6-5m6 9l6-6" fill="none" stroke="#d2dbb8" opacity=".72"/>
     </g>)}
    </g>
    {pulse>0&&<g key={pulse} className="herb-water-trail" stroke="#396c83" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M139 54l-5 11m17-2-5 12m16-3-5 12"/></g>}
   </svg>
  </div>
  <div>
   <div className="panel-heading"><h2 id="herb-bed-title">紫苏小圃</h2><small>虚拟种植</small></div>
   <h3>{herb.pressed?'已收藏压叶标本':state}</h3>
   <ol className="herb-growth" aria-label="生长阶段">
    {['种下','新叶','舒展','藏叶'].map((label,i)=><li key={label} data-reached={herb.pressed||i<herb.stage} aria-current={(herb.pressed?3:herb.stage-1)===i?'step':undefined}>{label}</li>)}
   </ol>
   {!herb.owned?<p>确认完成一次指导活动，就能在这里种下一株紫苏。</p>:!herb.plantedAt?<p>把紫苏苗种进小圃，再给它浇一次水。</p>:
    <p>{herb.pressed?'标本留在草木册，小圃里的紫苏也还在。':herb.canPress?'叶片已舒展，可以选一片叶子压成标本。':`已照料 ${herb.watered} / 2 天。按${cities[herb.city].name}日期每天可浇一次，漏一天也没关系。`}</p>}
   {herb.owned&&!herb.plantedAt&&<button className="rest-primary" onClick={()=>{update(d=>plantHerb(d,new Date()));setPlanted(true);setMessage('紫苏种下了，现在可以浇水。');}}>种下紫苏</button>}
   {herb.plantedAt&&herb.watered<2&&<button className="rest-primary" disabled={!herb.canWater} onClick={()=>tend('water')}>{herb.wateredToday?'今天已浇水':'给紫苏浇水'}</button>}
   {herb.canPress&&<button className="rest-primary" onClick={()=>tend('press')}>收一片叶做标本</button>}
   <div role="status" className="herb-feedback">{message}</div>
  </div>
 </section>;
}
