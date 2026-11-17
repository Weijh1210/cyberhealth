import data from './solarInstants.json';
import {seasonalContents} from './seasonalContent';

// HKO Date and Time of the 24 Solar Terms, published to the minute in UTC+8.
// https://www.hko.gov.hk/en/gts/astronomy/data/files/24SolarTerms_2026.xml
const instants=Object.entries(data).flatMap(([year,times])=>times.map((time,index)=>({at:Date.parse(year+'-'+time),content:seasonalContents[index]})));
export function restSeason(now:Date){
 const year=new Date(+now+8*3600000).getUTCFullYear();
 const covered=Object.hasOwn(data,year);
 const row=covered?instants.findLast(x=>x.at<=+now):undefined;
 const month=new Date(+now+8*3600000).getUTCMonth()+1;
 return {term:row?.content.name.zh??null,content:row?.content,at:row?.at,
  season:row?.content.season??(month<=2||month===12?'winter':month<=5?'spring':month<=8?'summer':'autumn')};
}
