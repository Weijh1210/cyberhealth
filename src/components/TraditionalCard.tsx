import {plannedActions} from '../lib/microActivities';
import type {Activity,TraditionalGuide} from '../lib/types';

export const activityCategory=(activity:Activity)=>activity.content?.type==='traditional'?'传统导引':'日常微活动';

export function TraditionalCard({guide}:{guide:TraditionalGuide}){
 return <dl className="guide-fields">
  <dt>来源</dt><dd>{guide.source??'待补可核对资料'}</dd>
  <dt>练习形式</dt><dd>{{routine:'完整套路',single:'单式',unspecified:'待确认'}[guide.form]}</dd>
  <dt>改编情况</dt><dd>{{original:'沿用原式',adapted:'已改编',pending:'待确认'}[guide.adaptation]}</dd>
  <dt>适用条件</dt><dd>{guide.applicableConditions??'待审校'}</dd>
  <dt>停止提示</dt><dd>{guide.stopGuidance??'待审校'}</dd>
  <dt>审校记录</dt><dd>{guide.review?`${guide.review.reviewer} · ${guide.review.reviewedAt} · ${guide.review.record}`:'待补'}</dd>
 </dl>;
}

export function TraditionalPreview(){
 const planned=plannedActions.filter(action=>action.id.startsWith('baduanjin-')||action.id==='tai-chi-basic');
 return <details className="break-panel">
  <summary>传统导引 · 内容预览</summary>
  <p>以下条目正在整理来源与审校资料，暂未开放练习。</p>
  <div className="traditional-preview">{planned.map(action=><details key={action.id}>
   <summary>{action.nameZh}</summary>
   <TraditionalCard guide={{form:action.id==='baduanjin-full'?'routine':action.id==='tai-chi-basic'?'unspecified':'single',source:null,adaptation:'pending',applicableConditions:null,stopGuidance:null,review:null}}/>
  </details>)}</div>
 </details>;
}
