import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,migrateData} from './store';
import {localRepository} from '../data/repository';
import {growthStats} from './growth';
test('v2 migrates to v3 without losing settings, garden or records',()=>{
 const base=initialData(); const result=migrateData({...base,schemaVersion:2,energy:30,petName:'竹',reminder:{enabled:true,startHour:23,endHour:6,intervalMinutes:45}});
 assert.equal(result.schemaVersion,3);assert.equal(result.energy,30);assert.equal(result.reminder.dailyLimit,3);assert.equal(result.reminder.startHour,23);assert.equal(result.reminder.enabled,true);
});
test('repository persists preferences, exports and clears only personal key',()=>{
 const memory=new Map<string,string>();Object.assign(globalThis,{window:{},localStorage:{getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
 const data=initialData();data.currentScene='home';memory.set('unrelated','keep');assert.equal(localRepository.save(data),true);assert.equal(localRepository.read().currentScene,'home');assert.equal(JSON.parse(localRepository.export(data)).data.currentScene,'home');assert.equal(localRepository.clear(),true);assert.equal(memory.get('unrelated'),'keep');
});
test('seven calendar days and completed events are counted once',()=>{
 const data=initialData();const now=new Date(2026,9,15,12);const s={id:'one',activityId:'chin-tuck',preference:data.preference,startedAt:now.toISOString(),completedAt:now.toISOString(),status:'completed' as const,remainingSeconds:0,deadlineAt:null};
 const stats=growthStats([s,s,{...s,id:'pending',status:'ready'}],now);assert.equal(stats.today.count,1);assert.equal(stats.totalSeconds,30);assert.equal(stats.days.length,7);
});
test('failed storage keeps usable in-memory preferences and reports failure',()=>{
 Object.assign(globalThis,{localStorage:{getItem:()=>null,setItem:()=>{throw new Error('quota');},removeItem:()=>{throw new Error('blocked');}}});
 const data=initialData();data.currentScene='office';assert.equal(localRepository.save(data),false);assert.equal(localRepository.read().currentScene,'office');assert.equal(localRepository.clear(),false);assert.equal(localRepository.read().currentScene,'office');
});
