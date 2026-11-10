export type Point = [x:number,y:number,z:number];
export const worldSize = {width:1000,height:720};
export const projectWorld=([x,y,z]:Point):[number,number]=>[500+x*.88-z*.57,431+x*.36+z*.55-y*.92];

export const worldWaypoints = [
 {place:'渡口', point:[-101,19,111]},
 {place:'山阶', point:[0,35,22]},
 {place:'松风亭', point:[75,100,-86]},
] as const;

export function waypointPosition(index:number){
 const [x,y,z]=worldWaypoints[index].point;
 const [left,top]=projectWorld([x,y,z]);
 return {left:`${left/worldSize.width*100}%`,top:`${top/worldSize.height*100}%`};
}
