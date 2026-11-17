import {useState} from 'react';
import {activities} from '../lib/activities';
import {matches} from '../lib/recommend';
import type {Activity,AppData,Preference} from '../lib/types';

const categories=[
 ['all','全部'],['upper','颈肩与背'],['hands','手与前臂'],['lower','腿脚与走动'],
] as const;
function category(a:Activity){
 return a.focusTags.includes('wrists')?'hands':a.focusTags.some(x=>['hips','legs','fullBody'].includes(x))?'lower':'upper';
}
const place={seat:'座位内',small:'身边有空位',spacious:'需要宽敞空间',outdoor:'户外'} as const;
const posture={seated:'坐姿',standing:'站姿',walking:'走动',either:'坐姿或站姿'} as const;

export function RestActivityLibrary({data,preference,open}:{data:AppData;preference:Preference;open:(activity:Activity)=>void}){
 const [selected,setSelected]=useState('all');
 const [onlyFit,setOnlyFit]=useState(true);
 const pool=activities.filter(a=>a.reviewStatus==='source-checked'&&a.meta.evidenceReviewStatus==='source-checked-technique'&&a.meta.isActive)
  .filter(a=>selected==='all'||selected===category(a))
  .map(a=>({a,fit:!(preference.posture==='upright'&&preference.mobility==='seated')&&matches(a,preference,data.profile,data.feedback)}))
  .filter(x=>!onlyFit||x.fit);
 return <section className="rest-panel" aria-labelledby="activity-library-title">
  <div className="panel-heading"><h2 id="activity-library-title">动作库</h2><small>{pool.length} 项</small></div>
  <p>按部位挑动作。能否开始，仍按首页的时间、姿势、空间和支撑条件判断。</p>
  <div className="rest-actions">{categories.map(([id,label])=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}>{label}</button>)}
   <label className="inline-field"><input type="checkbox" checked={onlyFit} onChange={e=>setOnlyFit(e.target.checked)}/>只看现在能做的</label>
  </div>
  {!pool.length&&<p>这一类暂时没有匹配的动作。可换分类，或查看全部动作需要的条件。</p>}
  <ul className="journal-list activity-library-list">{pool.map(({a,fit})=><li key={a.id}>
   <div><strong>{a.title}</strong><small>{posture[a.meta.posture]} · {a.durationSeconds} 秒 · {place[a.meta.spaceRequired]}
    {a.meta.equipmentRequired.length>0&&' · 需'+a.meta.equipmentRequired.map(x=>x==='wall'?'扶墙':'稳固椅').join('、')}</small><p>{a.description}</p></div>
   {fit?<button onClick={()=>open(a)} aria-label={`查看${a.title}步骤`}>查看步骤</button>:<small>当前条件不匹配</small>}
  </li>)}</ul>
 </section>;
}
