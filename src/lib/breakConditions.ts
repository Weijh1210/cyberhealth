import type {Duration, Preference} from './types';

export const presets = {
  desk: {label:'工位静音', time:'30 秒', description:'坐姿 · 小幅度', conditions:{scene:'office',duration:30,posture:'seated',space:'seat',quiet:true,smallMovement:true}},
  meeting: {label:'会议间隙', time:'1 分钟', description:'座位旁 · 可选站姿', conditions:{scene:'office',duration:60,space:'small',quiet:true,smallMovement:false}},
  away: {label:'午后离座', time:'3 分钟', description:'离开座位 · 可选走动', conditions:{scene:'office',duration:180,posture:'upright',space:'small',quiet:false,smallMovement:false}},
} as const satisfies Record<string,{label:string;time:string;description:string;conditions:Partial<Preference>}>;

export type PresetId = keyof typeof presets;

export const supports = [['stable-chair','稳固无轮椅'],['wall','可扶的墙面']] as const;
export const durations:Duration[] = [30,60,180,300,600,1200];
export const durationLabel = (seconds:number) => seconds < 60 ? `${seconds} 秒` : `${seconds/60} 分钟`;

export function conditionsForPreset(id:PresetId,current:Preference):Preference {
  const posture = current.posture ?? (current.mobility==='seated'?'seated':'any');
  return {...current,posture,...presets[id].conditions,preset:id,availableEquipment:[]};
}
