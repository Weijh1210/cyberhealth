import {useEffect,useState} from 'react';
import {cities,type City} from '../lib/courtyard';
import {parseWeather,reliableWeather,type WeatherReading} from '../lib/restJournal';

type Result={city:City;reading:WeatherReading|null;status:'live'|'cached'|'missing'};
const cacheKey='cyberhealth-weather-v2:';
export function clearWeather(){
 try{for(const city of Object.keys(cities))localStorage.removeItem(cacheKey+city);}catch{/* optional cache */}
}
function cached(city:City){
 try{return parseWeather(JSON.parse(localStorage.getItem(cacheKey+city)??'null'),city);}catch{return null;}
}
export function useRestWeather(city:City,now:number){
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  let stopped=false;
  let request:AbortController|undefined;
  const previous=cached(city);
  if(previous)setResult({city,reading:previous,status:'cached'});
  async function refresh(){
   request?.abort();
   const controller=request=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const {lat,lon}=cities[city];
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,rain&timeformat=unixtime`,{signal:controller.signal});
    if(!response.ok)throw new Error('weather');
    const payload:unknown=await response.json();
    const reading=parseWeather(payload,city);
    if(!reading)throw new Error('weather');
    if(stopped||controller!==request)return;
    try{localStorage.setItem(cacheKey+city,JSON.stringify(payload));}catch{/* optional cache */}
    setResult({city,reading,status:'live'});
   }catch{
    if(stopped||controller!==request)return;
    const reading=cached(city);
    setResult(old=>({city,reading:reading??(old?.city===city?old.reading:null),status:reading||old?.city===city&&old.reading?'cached':'missing'}));
   }finally{clearTimeout(timeout);}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),15*60000);
  return ()=>{stopped=true;request?.abort();clearInterval(timer);};
 },[city]);
 const current:Result=result?.city===city?result:{city,reading:null,status:'missing'};
 return current.status==='live'&&!reliableWeather(current.reading,now)?{...current,status:'cached' as const}:current;
}
