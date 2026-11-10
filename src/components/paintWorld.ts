import {projectWorld,worldSize,type Point} from './worldGeometry';

type Face={points:Point[];color:string;depth:number};
const noise=(x:number,z:number)=>{const value=Math.sin(x*21.379+z*71.297)*43758.5453;return value-Math.floor(value);};
const elevation=(x:number,z:number)=>{
 const edge=1-(x/221)**2-(z/200)**2;
 const hill=44*Math.exp(-((x-80)**2+(z+81)**2)/10300);
 return Math.min(1,Math.max(0,edge)*5)*(6+hill+7*noise(x,z));
};

export function paintWorld(canvas:HTMLCanvasElement,stage:number){
 const context=canvas.getContext('2d',{alpha:false});
 if(!context)throw new Error('Canvas unavailable');
 const {width,height}=worldSize;
 context.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
 const faces:Face[]=[];
 function face(color:string,...points:Point[]){
  const depth=points.reduce((total,[x,y,z])=>total+x*.57+z*.88+y*.22,0)/points.length;
  faces.push({points,color,depth});
 }
 function draw(){
  for(const {points,color} of faces.splice(0).sort((a,b)=>a.depth-b.depth)){
   context!.beginPath();
   points.forEach((point,index)=>{
    const [x,y]=projectWorld(point);
    if(index===0)context!.moveTo(x,y);else context!.lineTo(x,y);
   });
   context!.closePath();
   context!.fillStyle=color;
   context!.fill();
  }
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,[top,front,side]:string[]){
  face(top,[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]);
  face(front,[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]);
  face(side,[x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z]);
 }
 function crown(x:number,y:number,z:number,r:number,h:number,[light,mid,dark]:string[]){
  const ring:Point[]=[[-1,0],[-.55,-.86],[.55,-.86],[1,0],[.55,.86],[-.55,.86]].map(([dx,dz])=>[x+dx*r,y,z+dz*r]);
  for(let i=0;i<ring.length;i++)face([mid,light,light,mid,dark,dark][i],ring[i],ring[(i+1)%ring.length],[x-r*.1,y+h,z]);
 }
 function shadow(x:number,y:number,z:number,rx:number,rz:number){
  face('#244f4270',[x-rx,y,z],[x,y,z-rz],[x+rx*1.5,y,z],[x+rx*.7,y,z+rz],[x-rx*.5,y,z+rz]);
 }
 function pine(x:number,z:number,h:number){
  const y=elevation(x,z);
  shadow(x,y+.6,z,h*.56,h*.25);
  box(x-2,y,z-2,4,h*.62,4,['#806d51','#675a44','#514c3d']);
  crown(x,y+h*.33,z,h*.28,h*.47,['#648976','#497560','#355e51']);
  crown(x,y+h*.53,z,h*.23,h*.47,['#729680','#507d67','#3d6858']);
 }
 function roof(x:number,y:number,z:number,w:number,d:number){
  const l=x-w/2,r=x+w/2,b=z-d/2,f=z+d/2;
  const ridgeLeft:Point=[x-w*.24,y+18,z],ridgeRight:Point=[x+w*.24,y+18,z];
  face('#284b45',[l,y+3,b],ridgeLeft,ridgeRight,[r,y+3,b]);
  face('#43695e',[l,y+3,f],[x,y-2,f+3],ridgeRight,ridgeLeft);
  face('#294c46',[x,y-2,f+3],[r,y+3,f],ridgeRight);
  face('#638678',[l,y+3,b],[l,y+3,f],ridgeLeft);
  face('#345a51',[r,y+3,b],ridgeRight,[r,y+3,f]);
  face('#b09b71',[x-w*.25,y+18,z],[x+w*.25,y+18,z],[x+w*.25,y+20,z],[x-w*.25,y+20,z]);
 }

 const sky=context.createLinearGradient(0,0,0,height);
 sky.addColorStop(0,'#c3d4c9');sky.addColorStop(.31,'#e0dfc8');sky.addColorStop(.57,'#8eaea1');sky.addColorStop(1,'#456f68');
 context.fillStyle=sky;context.fillRect(0,0,width,height);
 context.fillStyle='#f6e2ac';context.beginPath();context.arc(267,147,48,0,Math.PI*2);context.fill();
 for(let layer=0;layer<4;layer++){
  context.beginPath();
  context.moveTo(0,325);
  for(let i=0;i<=16;i++){
   const x=i*66;
   const base=182+layer*27;
   context.lineTo(x,base+Math.sin(i*.83+layer)*24-noise(i,layer)*67);
  }
  context.lineTo(width,322+layer*23);context.lineTo(0,335+layer*20);
  context.fillStyle=['#9ab2a6','#93ada0','#81a295','#779b8e'][layer];
  context.fill();
 }
 for(let i=0;i<104;i++){
  const x=noise(i,1)*width,y=351+noise(i,2)*359;
  context.fillStyle=i%3===0?'#eef0d570':'#ccddd04d';
  context.fillRect(x,y,6+noise(i,3)*37,1+noise(i,4));
 }

 // The same faceted bank supports the path, buildings, foliage and river edge.
 const bank=['#749480','#7e9c82','#89a68a','#799780','#93ab8b','#658977','#6f9280'];
 const step=22;
 const inside=(x:number,z:number)=>(x/222)**2+(z/204)**2<1+noise(x,z)*.06;
 const point=(x:number,z:number):Point=>[x,elevation(x,z),z];
 for(let x=-220;x<220;x+=step)for(let z=-198;z<198;z+=step){
  const a=point(x,z),b=point(x+step,z),c=point(x,z+step),d=point(x+step,z+step);
  if(inside(x+7,z+7))face(bank[Math.floor(noise(x,z)*bank.length)],a,b,c);
  if(inside(x+15,z+15))face(bank[Math.floor(noise(z,x)*bank.length)],b,c,d);
 }
 draw();

 const path=[[-108,112],[-76,100],[-52,84],[-28,61],[-5,27],[16,3],[31,-23],[54,-55],[74,-83]];
 for(let i=1;i<path.length;i++){
  const [ax,az]=path[i-1],[bx,bz]=path[i];
  for(let j=0;j<5;j++){
   const t=j/5,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
   box(x-7,elevation(x,z)+2,z-4,14,stage>=2?3:1,8,stage>=2?['#dfcc9f','#a3916e','#b2a27d']:['#a8ae8c','#8a9478','#9da78c']);
  }
 }
 draw();

 for(let i=0;i<52;i++){
  const x=-204+noise(i,31)*408,z=-186+noise(i,32)*372;
  if(!inside(x,z)||path.some(([a,b])=>Math.hypot(a-x,b-z)<27)||Math.hypot(x-75,z+86)<51||Math.hypot(x+101,z-111)<42)continue;
  pine(x,z,20+noise(i,33)*39);
 }
 const wood=['#c4ad81','#8a7254','#9e835e'];
 const stone=['#b7b69a','#778a78','#899c84'];
 // Dock, roofed ferry landing and mooring posts.
 box(-147,1,111,57,6,47,wood);
 for(let i=0;i<6;i++)box(-149+i*9,7,111,7,2,47,wood);
 for(const [x,z] of [[-148,111],[-148,152],[-94,112],[-94,152]])box(x,0,z,4,14,4,wood);
 const dockY=elevation(-100,110)+3;
 box(-109,dockY,97,39,5,34,stone);
 for(const [x,z] of [[-105,100],[-75,100],[-105,124],[-75,124]])box(x,dockY+5,z,3,22,3,wood);
 roof(-89,dockY+27,111,43,37);
 // The boat is a hull with a separate canopy and moves to the pier on the first day.
 const bx=stage>=1?-148:-181,bz=stage>=1?145:140;
 face('#6e523b',[bx-21,6,bz],[bx+25,6,bz],[bx+17,0,bz+12],[bx-14,0,bz+12]);
 face('#b7895e',[bx-21,6,bz],[bx+25,6,bz],[bx+17,6,bz+13],[bx-14,6,bz+13]);
 box(bx-5,6,bz+2,16,8,8,['#d7b887','#a98a61','#98774e']);
 // Pavilion, terrace, columns and gold ridge.
 const py=elevation(75,-86)+3;
 box(43,py-6,-110,67,12,54,stone);
 box(48,py+6,-105,56,4,44,['#d3bd96','#9f8767','#a79270']);
 for(const [x,z] of [[52,-101],[97,-101],[52,-65],[97,-65]])box(x,py+10,z,4,31,4,['#9e7054','#8c563e','#784833']);
 roof(76,py+42,-83,76,64);
 if(stage===3)for(const x of [57,89])box(x,py+24,-62,6,9,5,['#ffdfa1','#eab475','#d99455']);
 draw();
 if(stage<2){
  context.save();context.translate(509,411);context.scale(143,35);
  const mist=context.createRadialGradient(0,0,0,0,0,1);
  mist.addColorStop(0,'#f4eed2a3');mist.addColorStop(1,'#f4eed200');
  context.fillStyle=mist;context.fillRect(-1,-1,2,2);context.restore();
 }
}
