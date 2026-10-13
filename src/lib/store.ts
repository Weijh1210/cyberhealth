import type {AppData,Session,Scene,Preference,Reminder,FocusArea,Mobility,Duration} from './types';
import {activityById} from './activities';
const KEY='moyu-wellness-v1';
const scenes:Scene[]=['library','office','home','classroom','transit','outdoor','other'];
const focusAreas:FocusArea[]=['eyes','neck','shoulders','upperBack','lowerBack','wrists','hips','legs','fullBody','back','general'];
const durations:Duration[]=[30,60,180,300,600,1200];
const mobilities:Mobility[]=['seated','standing','spacious','outside'];
const scene=(value:unknown):Scene=>scenes.includes(value as Scene)?value as Scene:'library';
const validSession=(s:any):s is Session=>s&&typeof s.id==='string'&&typeof s.activityId==='string'&&typeof s.startedAt==='string'&&s.preference&&typeof s.preference.scene==='string'&&['running','paused','ready','completed','exited'].includes(s.status);
const reminderDefault=():Reminder=>({enabled:false,startHour:9,endHour:21,intervalMinutes:60,quiet:false,nextAt:null,postponedCount:0,pausedUntil:null,browserNotifications:false});
export function initialData():AppData{return {schemaVersion:2,preference:{scene:'library',duration:180,mobility:'seated'},profile:{onboardingComplete:false,commonScenes:['library'],focusAreas:['general'],quiet:true,smallMovement:true,mobility:'seated',duration:180},currentScene:'library',currentNeed:'general',companion:null,reminderEvents:[],sessions:[],feedback:[],energy:0,swapCount:0,petName:'小竹',reminder:reminderDefault(),gardenDemo:null,pendingGardenSessions:[],themePack:null,lastActiveAt:null};}
export function migrateData(raw:unknown):AppData{
 const base=initialData();if(!raw||typeof raw!=='object')return base;const d=raw as Partial<Omit<AppData,'schemaVersion'>> & {schemaVersion?:number};
 const preference:Preference={scene:scene(d.preference?.scene),duration:durations.includes(d.preference?.duration as Duration)?d.preference!.duration:180,mobility:mobilities.includes(d.preference?.mobility as Mobility)?d.preference!.mobility:'seated',bodyNeed:focusAreas.includes(d.preference?.bodyNeed as FocusArea)?d.preference!.bodyNeed:undefined};
 const sessions=Array.isArray(d.sessions)?d.sessions.filter(validSession):[];
 const feedback=Array.isArray(d.feedback)?d.feedback.filter(f=>f&&typeof f.activityId==='string'&&['liked','unsuitable','uncomfortable'].includes(f.value)):[];
 const reminder={...reminderDefault(),...(d.reminder&&typeof d.reminder==='object'?d.reminder:{})};
 const legacy=d.schemaVersion===1;
 const profile=legacy?{...base.profile,onboardingComplete:true,commonScenes:[preference.scene],mobility:preference.mobility,duration:preference.duration}:{...base.profile,...(d.profile&&typeof d.profile==='object'?d.profile:{})};
 const commonScenes=Array.isArray(profile.commonScenes)?profile.commonScenes.filter(x=>scenes.includes(x)):[];
 const selectedFocus=Array.isArray(profile.focusAreas)?profile.focusAreas.filter(x=>focusAreas.includes(x)):[];
 return {...base,preference,profile:{...profile,commonScenes:commonScenes.length?commonScenes:[preference.scene],focusAreas:selectedFocus.length?selectedFocus:['general']},currentScene:legacy?preference.scene:scene(d.currentScene),currentNeed:focusAreas.includes(d.currentNeed as FocusArea)?d.currentNeed!:selectedFocus[0]||'general',companion:d.companion&&typeof d.companion==='object'&&typeof d.companion.id==='string'&&['active','paused','ended'].includes(d.companion.status)?d.companion:null,reminderEvents:Array.isArray(d.reminderEvents)?d.reminderEvents:[],sessions,feedback,energy:typeof d.energy==='number'&&Number.isFinite(d.energy)&&d.energy>=0?d.energy:0,swapCount:typeof d.swapCount==='number'&&Number.isFinite(d.swapCount)?d.swapCount:0,petName:typeof d.petName==='string'?d.petName:'小竹',reminder,gardenDemo:!legacy&&d.gardenDemo&&typeof d.gardenDemo==='object'&&typeof d.gardenDemo.id==='string'&&Array.isArray(d.gardenDemo.members)&&Array.isArray(d.gardenDemo.contributions)&&Array.isArray(d.gardenDemo.restInvites)?d.gardenDemo:null,pendingGardenSessions:Array.isArray(d.pendingGardenSessions)?d.pendingGardenSessions.filter(x=>typeof x==='string'):[],themePack:typeof d.themePack==='string'?d.themePack:null,lastActiveAt:typeof d.lastActiveAt==='string'?d.lastActiveAt:null};
}
export function readData():AppData{if(typeof window==='undefined')return initialData();try{return migrateData(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return initialData();}}
export function saveData(data:AppData){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
export function clearData(){try{localStorage.removeItem(KEY);return true;}catch{return false;}}
export function grantCompletion(data:AppData,id:string,now:Date,note=''):AppData{const target=data.sessions.find(s=>s.id===id);if(!target||target.status==='completed'||target.status==='exited')return data;if((activityById(target.activityId)?.reviewStatus==='source-checked'||target.source==='garden-invite')&&target.status!=='ready')return data;const sessions=data.sessions.map((s):Session=>s.id===id?{...s,status:'completed',deadlineAt:null,remainingSeconds:0,completedAt:now.toISOString(),note,reward:10}:s);return {...data,sessions,energy:data.energy+10,lastActiveAt:now.toISOString()};}
export function petStage(energy:number){return energy>=100?'竹林伙伴':energy>=40?'青竹新芽':'初见小芽';}
