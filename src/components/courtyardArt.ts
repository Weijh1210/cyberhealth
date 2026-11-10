import type {Courtyard,Site,Weather} from '../lib/courtyard';

export type Point = [x:number,y:number,z:number];
export const view = {width:1200,height:680};
export const project = ([x,y,z]:Point):[number,number] => [600+720*x/z,243+720*(1.64-y)/z];
const rand = (n:number) => {const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
export const beds:Record<Site,Point>={window:[-1.01,0,7.5],canal:[2.18,0,6.5]};
export const objects={desk:[-1.75,.86,4.5],slips:[-2.3,1.25,4.55],basket:[-1.22,1.02,4.45],jar:[1.58,.76,4.12],trough:[1.45,.95,5.5],stool:[.42,.49,5.05],door:[-3.55,1.28,9.4],blind:[-2.53,1.47,9.61],journal:[-.94,.895,4.23],rhythm:[-1.67,.895,4.22]} satisfies Record<string,Point>;
export function flowSites(state:Courtyard):Site[]{
 const outlets=(Object.keys(beds) as Site[]).filter(site=>state.wet.includes(site)&&state.plants[site]);
 return state.route==='bed'&&outlets.length?outlets:['canal'];
}
export const waterPath=(route:Courtyard['route'],site:Site='canal'):Point[]=>route==='jar'
 ? [[1.25,2.75,6.8],[1.25,1.06,6.8],objects.trough,[1.70,.93,4.56],[1.58,.768,4.12]]
 : [[1.25,2.75,6.8],[1.25,1.06,6.8],objects.trough,[1.47,.16,5.5],[1.75,.08,6.02],...(site==='window'?[[.65,.06,6.25],[-.63,.05,6.96]] as Point[]:[]),[beds[site][0],.27,beds[site][2]]];

export function paintCourtyard(canvas:HTMLCanvasElement,state:Courtyard,weather:Weather,hour:number,term:string,lesson:boolean,pose?:'chin-tuck'|'scapular-squeeze',elapsed=0,damp=false){
 const c=canvas.getContext('2d');
 if(!c)return false;
 c.setTransform(canvas.width/view.width,0,0,canvas.height/view.height,0,0);
 const night=hour<6||hour>=19;
 const dusk=hour===6||hour>=17&&hour<19;
 const rain=weather==='rain',snow=weather==='snow';
 const cold=/冬|雪|寒|霜/.test(term);
 function polygon(points:[number,number][],color:string|CanvasGradient,stroke?:string){
  c!.beginPath();
  points.forEach(([x,y],i)=>i?c!.lineTo(x,y):c!.moveTo(x,y));
  c!.closePath();c!.fillStyle=color;c!.fill();
  if(stroke){c!.strokeStyle=stroke;c!.lineWidth=.65;c!.stroke();}
 }
 function face(color:string,...points:Point[]){polygon(points.map(project),color);}
 function line(points:Point[],color:string,width=1){
  c!.beginPath();
  points.map(project).forEach(([x,y],i)=>i?c!.lineTo(x,y):c!.moveTo(x,y));
  c!.strokeStyle=color;c!.lineWidth=width;c!.lineCap='round';c!.lineJoin='round';c!.stroke();
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,colors:string[]){
  const [top,front,side]=colors;
  face(side,[x,y,z],[x,y,z+d],[x,y+h,z+d],[x,y+h,z]);
  face(side,[x+w,y,z+d],[x+w,y,z],[x+w,y+h,z],[x+w,y+h,z+d]);
  face(front,[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]);
  face(top,[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]);
 }
 function oval(p:Point,rx:number,ry:number,color:string){
  const [x,y]=project(p);c!.beginPath();c!.ellipse(x,y,720*rx/p[2],720*ry/p[2],0,0,Math.PI*2);c!.fillStyle=color;c!.fill();
 }
 function shadow(x:number,z:number,w:number,d:number){
  face('#24302545',[x-w,0,z-d/2],[x+w*.78,0,z-d],[x+w,0,z+d/2],[x-w*.83,0,z+d]);
 }
 function vessel(x:number,y:number,z:number,r:number,h:number,kind:'clay'|'bamboo'|'wicker',level=0){
  const profile=kind==='clay'?[[.61,0],[.85,.09],[1,.42],[.91,.75],[.72,.92],[.75,1]]:[[.74,0],[.83,.13],[1,1]];
  const colors=kind==='clay'?['#463126','#644333','#825b43','#946b4e','#9c7657','#78523e']:
   kind==='bamboo'?['#43462a','#626441','#7c8050','#a7a16a','#b0a971','#797644']:['#614227','#85603b','#a87c46','#bb965d','#d2aa70','#97703f'];
  const ring=(scale:number,height:number,i:number):Point=>[x+Math.sin(i*Math.PI/12)*r*scale,y+h*height,z-Math.cos(i*Math.PI/12)*r*scale];
  for(let j=1;j<profile.length;j++)for(let i=-6;i<6;i++)face(colors[Math.floor((i+6)/2)],ring(...profile[j-1] as [number,number],i),ring(...profile[j-1] as [number,number],i+1),ring(...profile[j] as [number,number],i+1),ring(...profile[j] as [number,number],i));
  for(let i=1;i<15;i++){
   const t=i/15, idx=profile.findIndex(([,height])=>height>=t);
   const [r0,y0]=profile[idx-1],[r1,y1]=profile[idx];
   const radius=r0+(r1-r0)*(t-y0)/(y1-y0);
   line(Array.from({length:13},(_,j)=>ring(radius,t,j-6)),kind==='wicker'?'#4d331c9a':'#e9c69d32',kind==='wicker'?1.25:.6);
  }
  const rim=profile.at(-1)![0];
  face(colors[4],...Array.from({length:24},(_,i)=>ring(rim,1,i)));
  face('#322a25',...Array.from({length:24},(_,i)=>ring(rim*.86,1,i)));
  if(level){
   face(['#577c74','#658c83','#78a198','#91b6a9'][Math.ceil(level)-1],...Array.from({length:24},(_,i)=>ring(rim*(.48+level*.08),1,i)));
   line([[x-r*.28,y+h,z],[x+r*.32,y+h,z+.028]],'#b3d0b18a',.9);
  }
 }
 function plant(x:number,y:number,z:number,scale=1){
  const stem:Point=[x,y,z];
  line([stem,[x-.025,y+.52*scale,z],[x+.03,y+.83*scale,z]],'#6f4b52',2.6*scale);
  for(let i=0;i<12;i++){
   const angle=i*2.399, altitude=(.21+i*.048)*scale;
   const root:Point=[x,y+altitude,z];
   const reach=(.31+.14*rand(i)-i*.012)*scale;
   const point=(t:number,b:number):Point=>[x+Math.cos(angle)*reach*t-Math.sin(angle)*b,y+altitude+(.115*Math.sin(t*Math.PI)-.02*t)*scale,z+Math.sin(angle)*reach*t+Math.cos(angle)*b];
   const edge=(j:number,side:number)=>point(j/10,side*Math.sin(j/10*Math.PI)*reach*(j%2?.32:.43));
   const tip=point(1,0);
   face(i%3===0?'#664058':cold?'#6a6540':'#567046',root,...Array.from({length:9},(_,j)=>edge(j+1,1)),tip,...Array.from({length:9},(_,j)=>edge(9-j,-1)));
   line([root,point(.48,0),tip],'#b6988d99',.85);
   for(let j=2;j<9;j+=2)line([edge(j,1),point((j-1)/10,0),edge(j,-1)],'#baa49670',.55);
  }
 }

 const sky=c.createLinearGradient(0,70,0,325);
 sky.addColorStop(0,night?'#253c4c':rain?'#7f9a9b':'#96afad');
 sky.addColorStop(1,night?'#5b7075':rain?'#bbcbc4':dusk?'#ebc399':'#e7dcc1');
 c.fillStyle=sky;c.fillRect(0,0,1200,680);
 if(!rain&&!snow&&weather!=='cloud')oval([4,4.5,16],.58,.58,night?'#bccdc7':'#f6e6b9');
 for(let layer=0;layer<4;layer++){
  const peaks=Array.from({length:72},(_,i):[number,number]=>[i*18,168+layer*20-32*Math.sin(i*.11+layer)-24*Math.sin(i*.23-layer*.72)-rand(i+layer*100)*8]);
  polygon([[0,300],...peaks,[1200,300]],['#a1b2aa','#8ba6a0','#73978e','#64877e'][layer]);
 }
 c.fillStyle=night?'#486362':'#86aaa1';c.fillRect(0,251,1200,162);
 for(let i=0;i<170;i++){
  const y=257+rand(i)*100;
  c.fillStyle=i%3?'#dbe4ca48':'#43696045';c.fillRect(rand(i+501)*1200,y,6+rand(i+260)*83,rand(i+29)*1.5+.3);
 }
 for(let i=0;i<88;i++){
  const x=rand(i+101)*17-8.5,z=13+rand(i+401)*5,h=.65+rand(i+71)*3;
  if(x>-2.5&&x<3.2)continue;
  line([[x,0,z],[x-.12,h,z]],'#405b47',1.5);
  for(let k=0;k<5;k++){
   const cx=x+(rand(i*5+k)-.5)*1.2,cy=h*(.61+.10*k),r=.34+rand(i+k)*.36;
   const foliage=Array.from({length:19},(_,j):Point=>{
    const angle=j*2*Math.PI/19,spread=.75+rand(i*103+k*19+j)*.35;
    return [cx+Math.cos(angle)*r*spread,cy+Math.sin(angle)*r*.76*spread,z];
   });
   face(cold?['#7d805e','#6e7e5c','#546f57'][k%3]:['#78926a','#54765a','#5f8164'][k%3],...foliage);
  }
 }
 face('#4d6259',[-12,-.02,2],[12,-.02,2],[12,-.02,11],[-12,-.02,11]);
 for(let j=18;j>=0;j--){
  const z=2.7+j*.47;
  for(let i=-17;i<=17;i++){
   const x=(i+(j%2)*.5)*.54;
   const colors=snow?['#c9d1c8','#b6c2b8','#a7b5ad']:rain||damp?['#536762','#62736b','#566963']:['#7e8a78','#939986','#879280','#768677','#9b9d8a'];
   face(colors[Math.floor(rand(j*39+i)*colors.length)],[x+.013,0,z],[x+.525,0,z],[x+.525,0,z+.452],[x+.013,0,z+.452]);
   if(j<12)for(let grain=0;grain<3;grain++){
    const n=j*103+i*3+grain, xx=x+.03+rand(n)*.38,zz=z+.02+rand(n+19)*.39;
    line([[xx,.002,zz],[xx+.024+rand(n+23)*.068,.002,zz+.008]],grain===1?'#334b422d':'#e0ddbb35',.7);
   }

  }
 }
 // Whitewashed perimeter and tile caps frame an open view of the river.
 for(const [x,w] of [[-7,4.8],[2.7,4.7]]){
  box(x,0,9.8,w,1.85,.35,['#c9c5a9','#c6c4aa','#9d9f86']);
  box(x,0,9.77,w,.26,.4,['#8e9484','#697768','#667869']);
  for(let t=x;t<x+w;t+=.14){
   face('#54625a',[t,1.87,9.6],[t+.11,1.87,9.6],[t+.15,2.03,9.99],[t+.025,2.03,9.99]);
   line([[t,1.88,9.6],[t+.025,2.035,9.99]],'#879386',1.4);
  }
  for(let i=0;i<36;i++){
   const xx=x+rand(i+13)*w, yy=.29+rand(i+22)*.75;
   line([[xx,yy,9.79],[xx+.09+rand(i+46)*.18,yy+.015,9.79]],'#74857544',2);
  }
 }
 const wood=['#a2784f','#78513a','#654232'];
 box(-4.06,0,9.63,.99,1.72,.11,wood);
 for(let i=0;i<7;i++)box(-4.05+i*.14,.04,9.60,.124,1.62,.027,['#94664a',i%2?'#886049':'#775541','#583d31']);
 oval([-3.2,.85,9.59],.032,.043,'#c8ab70');
 box(-2.8,.79,9.71,.49,.63,.09,wood);
 box(-2.75,.84,9.68,.39,.53,.025,['#85927c','#465c4e','#4f483a']);
 for(let i=1;i<=4;i++){
  line([[-2.75+i*.077,.85,9.64],[-2.75+i*.077,1.36,9.64]],'#b8ab83',1.5);
  line([[-2.75,.84+i*.104,9.64],[-2.36,.84+i*.104,9.64]],'#b8ab83',1.5);
 }
 for(let i=0;i<10;i++){
  const x=-2.07+i*.48;
  box(x,0,10.8,.13,.48,.13,['#9c9d86','#777e6f','#5f6d65']);
 }
 box(-2.16,.43,10.77,4.62,.07,.16,['#a6a38a','#7f8778','#65746a']);

 for(const [site,[x,,z]] of Object.entries(beds) as [Site,Point][]){
  shadow(x,z,.78,.73);
  box(x-.66,0,z-.48,1.32,.24,.96,['#a49478','#5d6456','#777b65']);
  box(x-.54,.24,z-.36,1.08,.025,.72,[state.wet.includes(site)?'#3f3028':'#735843','#584032','#4b392a']);
  for(let i=0;i<33;i++){
   const xx=x-.5+rand(i)*1,zz=z-.33+rand(i+49)*.66;
   line([[xx,.267,zz],[xx+.025,.267,zz+.013]],'#d3ad7558',1);
  }
  if(state.plants[site])plant(x,.266,z,1.13);
  const signX=x-.43,signZ=z-.38;
  line([[signX,.25,signZ],[signX,.42,signZ]],'#625443',2);
  box(signX-.07,.39,signZ,.14,.065,.024,['#bfa77d','#a28a65','#716449']);

 }
 const bedPoints=waterPath('bed').slice(3);
 const branch=waterPath('bed','window').slice(4);
 for(const path of [bedPoints,branch]){
  line(path,'#526c60',19);line(path,'#354f49',13);line(path,'#718d7c',2);
 }
 const trough=waterPath('jar').slice(1,3);
 line(trough,'#474e30',19);line(trough,'#a6a372',14);line(trough,'#5c6847',7);
 line([objects.trough,state.route==='bed'?[1.49,.76,5.9]:[1.70,.93,4.56]],'#414831',18);
 line([objects.trough,state.route==='bed'?[1.49,.76,5.9]:[1.70,.93,4.56]],'#9f9d65',12);
 if(state.route){
  for(const site of flowSites(state))line(waterPath(state.route,site).slice(1),'#90bcb1',4);
 }
 shadow(objects.jar[0],objects.jar[2],.52,.62);
 vessel(objects.jar[0],0,objects.jar[2],.46,.77,'clay',state.jar);
 if(state.notes.some(note=>note.kind==='look')){
  face('#e7d1a1',[-2.55,1.38,9.62],[-2.39,1.37,9.62],[-2.39,1.13,9.62],[-2.55,1.15,9.62]);
  line([[-2.52,1.21,9.61],[-2.46,1.31,9.61],[-2.42,1.25,9.61]],'#57725a',1);
 }
 const [sx,,sz]=objects.stool;
 shadow(sx,sz,.45,.42);
 for(const dx of [-.21,.21])for(const dz of [-.19,.19])box(sx+dx,.01,sz+dz,.075,.48,.075,wood);
 box(sx-.32,.46,sz-.31,.65,.09,.65,wood);
 if(lesson){
  vessel(sx-.45,0,sz-.16,.21,.17,'wicker');
  const engaged=elapsed>=7&&elapsed<23 ? Math.min(1,(elapsed-7)/2,(23-elapsed)/2) : 0;
  const headDepth=pose==='chin-tuck'?engaged*.16:0;
  const armsDepth=pose==='scapular-squeeze'?engaged*.21:0;
  const body:Point=[sx,.82,sz];
  oval([sx,.57,sz-.23],.24,.14,'#35483e');
  line([[sx-.13,.62,sz-.20],[sx-.18,.22,sz-.44],[sx-.18,.08,sz-.57]],'#2d413a',15);
  line([[sx+.13,.62,sz-.20],[sx+.18,.22,sz-.44],[sx+.18,.08,sz-.57]],'#2d413a',15);
  oval(body,.25,.31,'#72836b');
  line([[sx-.21,1,sz],[sx-.31,.78,sz-.13+armsDepth],[sx-.19,.63,sz-.28]],'#889277',15);
  line([[sx+.21,1,sz],[sx+.31,.78,sz-.13+armsDepth],[sx+.19,.63,sz-.28]],'#889277',15);
  oval([sx,1.23,sz+headDepth],.17,.204,'#282d27');
  oval([sx,1.18,sz-.065+headDepth],.14,.151,'#d2a17a');
  oval([sx,1.43,sz+headDepth],.074,.066,'#30342b');
  line([[sx-.069,1.205,sz-.19+headDepth],[sx-.035,1.207,sz-.19+headDepth]],'#48352e',2);
  line([[sx+.035,1.207,sz-.19+headDepth],[sx+.069,1.205,sz-.19+headDepth]],'#48352e',2);
  line([[sx-.027,1.137,sz-.20+headDepth],[sx+.027,1.139,sz-.20+headDepth]],'#885945',1.25);
  line([[sx-.135,1.002,sz-.15],[sx+.14,.713,sz-.15]],'#b5b296',3);
 }
 const [dx,,dz]=objects.desk;
 shadow(dx,dz,1.17,.67);
 for(const x of [dx-.86,dx+.74])for(const z of [dz-.3,dz+.35])box(x,0,z,.11,.84,.11,wood);
 box(dx-1,.75,dz-.41,2,.12,.91,wood);
 for(let i=0;i<57;i++){
  const z=dz-.40+rand(i+41)*.88,x=dx-.99+rand(i+62)*1.7;
  line([[x,.873,z],[x+.14,.873,z+.002],[x+.27,.873,z-.004]],i%2?'#e0b68b66':'#4f352b66',.9);
 }
 vessel(objects.slips[0],.87,objects.slips[2],.146,.34,'bamboo');
 for(let i=0;i<11;i++){
  const x=objects.slips[0]+(rand(i)-.5)*.19,z=objects.slips[2]+(rand(i+4)-.5)*.15;
  line([[x,1.16,z],[x+(rand(i+8)-.5)*.13,1.31+rand(i+12)*.17,z]],i%2?'#bc9d67':'#dfc696',3.7);
 }
 if(!lesson){
  vessel(objects.basket[0],.87,objects.basket[2],.24,.17,'wicker');
  if(state.seeds)plant(objects.basket[0],.95,objects.basket[2],.51);
 }
 for(const [x,cover] of [[-1.67,'#8a694b'],[-.94,'#53685a']] as const){
  box(x-.13,.869,4.13,.24,.021,.27,[cover,'#dac4a1','#a68c6b']);
  box(x-.14,.89,4.12,.26,.012,.29,[cover,cover,cover]);
  box(x+.035,.901,4.17,.035,.003,.16,['#e7d4b4','#d4c19f','#d4c19f']);
 }
 face('#e0c7a2',[-.86,.875,4.38],[-.6,.875,4.39],[-.6,.875,4.66],[-.86,.875,4.66]);
 line([[-.83,.885,4.45],[-.68,.885,4.45],[-.66,.885,4.55],[-.74,.885,4.59]],'#98613a',8);
 // Eaves, worn columns and the sheltered strip beneath the camera.
 face('#263d38',[-7,2.63,2.2],[7,2.63,2.2],[6,2.82,6.1],[-6,2.82,6.1]);
 box(-6,2.76,5.94,12,.18,.29,['#788475','#4b5146','#374239']);
 for(let i=-48;i<=48;i++)line([[i*.135,2.96,6.1],[i*.135,2.78,5.96]],'#829385',3.1);
 for(const x of [-2.75,2.75]){
  box(x-.16,0,3.67,.32,.2,.35,['#a2a18a','#777e6d','#596858']);
  box(x-.10,.19,3.74,.22,2.55,.23,['#8b6249','#654532','#513b32']);
  for(let i=0;i<11;i++)line([[x-.095+i*.018,.23,3.738],[x-.086+i*.018,2.68,3.738]],'#d59e6b32',.7);
 }
 // Light from the open water reaches the center of the courtyard.
 const light=c.createRadialGradient(630,365,55,630,365,650);
 light.addColorStop(0,night?'#c1c7a311':'#fff1bd13');
 light.addColorStop(.55,'#423f2900');
 light.addColorStop(1,'#19281e39');
 c.fillStyle=light;c.fillRect(0,0,1200,680);
 if(night||rain||snow){
  c.fillStyle=night?'#1b304651':rain?'#37595425':'#c3d8da24';
  c.fillRect(0,0,1200,680);
 }
 return true;
}
