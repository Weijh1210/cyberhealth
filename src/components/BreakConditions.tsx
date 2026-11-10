import {durationLabel,durations,presets,supports,type PresetId} from '../lib/breakConditions';
import type {Preference,Scene,FocusArea} from '../lib/types';

export const sceneOptions: {id:Scene;label:string}[]=[
 {id:'office',label:'办公室/工位'},{id:'library',label:'图书馆/自习室'},{id:'home',label:'家中/宿舍'},
 {id:'classroom',label:'教室'},{id:'transit',label:'公共交通'},{id:'outdoor',label:'户外/公园'},{id:'other',label:'其他'},
];
export const sceneLabel=(scene:Scene)=>sceneOptions.find(option=>option.id===scene)?.label??'其他';
export const focusLabels:Record<FocusArea,string>={eyes:'眼睛',neck:'颈部',shoulders:'肩部',upperBack:'上背部',lowerBack:'腰背部',wrists:'手腕/手指',hips:'臀部/髋部',legs:'腿部/脚踝',fullBody:'全身',back:'肩背',general:'随意活动'};

export function PresetPicker({value,onChange}:{value?:PresetId;onChange:(id:PresetId)=>void}){
 return <div className="preset-picker" role="group" aria-label="场景预设">
  {(Object.keys(presets) as PresetId[]).map(id=><button key={id} aria-pressed={value===id} onClick={()=>onChange(id)}>
   <strong>{presets[id].label}</strong><span>{presets[id].time}</span><small>{presets[id].description}</small>
  </button>)}
 </div>;
}

export function ConditionFields({value,onChange,quiet,smallMovement}:{value:Preference;onChange:(part:Partial<Preference>)=>void;quiet:boolean;smallMovement:boolean}){
 const posture=value.posture??(value.mobility==='seated'?'seated':'any');
 const space=value.space??({seated:'seat',standing:'small',spacious:'spacious',outside:'outdoor'} as const)[value.mobility];
 return <div className="condition-fields">
  <label>场景<select value={value.scene} onChange={event=>onChange({scene:event.target.value as Scene})}>{sceneOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
  <label>可用时间<select value={value.duration} onChange={event=>onChange({duration:Number(event.target.value) as Preference['duration']})}>{durations.map(duration=><option key={duration} value={duration}>{durationLabel(duration)}</option>)}</select></label>
  <label>姿势<select value={posture} onChange={event=>onChange({posture:event.target.value as Preference['posture']})}><option value="seated">保持坐姿</option><option value="any">可以站立，也可坐姿</option><option value="upright">只选站姿或走动</option></select></label>
  <label>活动空间<select value={space} onChange={event=>onChange({space:event.target.value as Preference['space']})}><option value="seat">仅座位范围</option><option value="small">座位旁</option><option value="spacious">宽敞室内</option><option value="outdoor">可到户外</option></select></label>
  <label>关注部位<select value={value.bodyNeed??'general'} onChange={event=>onChange({bodyNeed:event.target.value as FocusArea})}>{Object.entries(focusLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <fieldset><legend>现场条件</legend>
   <label><input type="checkbox" checked={quiet} onChange={event=>onChange({quiet:event.target.checked})}/>仅静音动作</label>
   <label><input type="checkbox" checked={smallMovement} onChange={event=>onChange({smallMovement:event.target.checked})}/>仅小幅度动作</label>
   {supports.map(([id,label])=><label key={id}><input type="checkbox" checked={value.availableEquipment?.includes(id)??false} onChange={event=>onChange({availableEquipment:event.target.checked?[...(value.availableEquipment??[]),id]:value.availableEquipment?.filter(item=>item!==id)})}/>现场有{label}</label>)}
  </fieldset>
 </div>;
}
