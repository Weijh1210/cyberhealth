import type {Reminder} from '../lib/types';
export default function ReminderFields({value,onChange}:{value:Reminder;onChange:(next:Reminder)=>void}) {
 const hours=Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>);
 return <><div className="onboard-times">
 {([['startHour','学习 / 工作开始'],['endHour','学习 / 工作结束'],['dndStartHour','免打扰开始'],['dndEndHour','免打扰结束']] as const).map(([key,label])=><label key={key}>{label}<select value={value[key]} onChange={e=>onChange({...value,[key]:Number(e.target.value)})}>{hours}</select></label>)}
 <label>每日最多提醒<select value={value.dailyLimit} onChange={e=>onChange({...value,dailyLimit:Number(e.target.value)})}>{[1,2,3,4,5,6,8,12].map(n=><option key={n} value={n}>{n} 次</option>)}</select></label>
 <label>最小提醒间隔<select value={value.intervalMinutes} onChange={e=>onChange({...value,intervalMinutes:Number(e.target.value)})}>{[15,30,45,60,90,120,180,240].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select></label></div><p>支持跨午夜；工作起止相同表示全天，免打扰起止相同表示不设置。按设备当前时区计算。</p></>;
}
