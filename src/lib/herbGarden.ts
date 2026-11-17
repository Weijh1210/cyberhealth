import {cityMoment,emptyJournal,plantState} from './restJournal';
import type {AppData} from './types';

export function herbGarden(d:AppData,now:Date){
 const plant=plantState(d),j=d.restJournal;
 const city=j?.careCity??d.courtyard.city;
 const day=cityMoment(now,city).day;
 const days=j?.wateredDays??[];
 const watered=days.length;
 const pressed=Boolean(j?.pressedAt);
 const naturallySprouted=Boolean(plant.plantedAt&&day>cityMoment(new Date(plant.plantedAt),city).day);
 return {...plant,city,day,watered,pressed,stage:!plant.plantedAt?0:watered>=2?3:watered||naturallySprouted?2:1,
  wateredToday:days.includes(day),
  canWater:Boolean(plant.plantedAt&&watered<2&&(!days.length||day>days[days.length-1])&&+now>=Date.parse(plant.plantedAt)),
  canPress:Boolean(plant.plantedAt&&watered>=2&&!pressed)};
}
export function plantHerb(d:AppData,now:Date):AppData{
 const herb=plantState(d);
 if(!herb.owned||herb.plantedAt)return d;
 return {...d,restJournal:{...(d.restJournal??emptyJournal()),seed:true,plantedAt:now.toISOString(),careCity:d.courtyard.city}};
}
export function tendHerb(d:AppData,now:Date,action:'water'|'press'):AppData{
 const herb=herbGarden(d,now),j=d.restJournal??emptyJournal();
 if(action==='water'&&herb.canWater)return {...d,restJournal:{...j,careCity:herb.city,wateredDays:[...(j.wateredDays??[]),herb.day]}};
 if(action==='press'&&herb.canPress)return {...d,restJournal:{...j,pressedAt:now.toISOString()}};
 return d;
}
