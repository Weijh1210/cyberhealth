// Fixed axonometric camera. The terrain, boat, stairs and pavilion are meshes in
// world coordinates, projected onto a single canvas with no animation loop.
type Point = [x:number,y:number,z:number];
type Face = {points:Point[];color:string};
const width=840,height=340;

export function paintLandscape(canvas:HTMLCanvasElement,stage:number){
 const context=canvas.getContext('2d',{alpha:false});
 if(!context)throw new Error('Canvas unavailable');
 const scale=canvas.width/width;
 context.setTransform(scale,0,0,scale,0,0);
 const project=([x,y,z]:Point)=>[x*.94-z*.48,227+x*.105+z*.25-y];
 const faces:Face[]=[];
 const face=(color:string,...points:Point[])=>faces.push({points,color});
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,colors:string[])=>{
  face(colors[0],[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]);
  face(colors[1],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]);
  face(colors[2],[x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z]);
 };
 const peak=(x:number,y:number,z:number,w:number,h:number,d:number,colors:string[])=>{
  const apex:Point=[x-w*.12,y+h,z-d*.14];
  const a:Point=[x-w,y,z-d],b:Point=[x+w,y,z-d],c:Point=[x+w,y,z+d],e:Point=[x-w,y,z+d];
  face(colors[0],a,b,apex);face(colors[1],b,c,apex);face(colors[2],c,e,apex);face(colors[3],e,a,apex);
 };
 function draw(){
  for(const {points,color} of faces.splice(0).sort((a,b)=>depth(a)-depth(b))){
   context!.beginPath();
   points.forEach((point,index)=>{const [x,y]=project(point);if(index===0)context!.moveTo(x,y);else context!.lineTo(x,y);});
   context!.closePath();
   context!.fillStyle=color;
   context!.fill();
  }
 }
 const sky=context.createLinearGradient(0,0,0,height);
 sky.addColorStop(0,'#e8ede4');sky.addColorStop(.57,'#e1e8db');sky.addColorStop(.58,'#cbdcd2');sky.addColorStop(1,'#a7c2b5');
 context.fillStyle=sky;context.fillRect(0,0,width,height);
 context.fillStyle='#f1d3a0';context.beginPath();context.arc(154,66,34,0,Math.PI*2);context.fill();
 const back=['#b9cfc2','#a4bfb2','#acc4b8','#bfd1c6'];
 peak(110,-20,-310,220,153,125,back);
 peak(315,-12,-360,225,169,120,back);
 peak(540,-9,-370,300,170,135,back);
 peak(773,-16,-315,230,185,105,back);
 draw();
 context.strokeStyle='#edf2e7aa';context.lineWidth=1;
 for(let i=0;i<25;i++){
  const x=(i*79+28)%840,y=200+(i*19)%131;
  context.beginPath();context.moveTo(x,y);context.lineTo(x+30+(i*13)%58,y);context.stroke();
 }
 peak(748,0,32,229,219,192,['#a2bba5','#557d6c','#789d87','#9cb6a0']);
 peak(574,0,70,180,109,140,['#9ab39b','#6c9180','#82a390','#afc1a8']);
 draw();
 box(455,0,110,344,12,70,['#a6b6a0','#789786','#8ca995']);
 box(411,9,153,123,10,32,['#c4b79a','#877860','#9e8b71']);
 draw();
 if(stage>=2){
  for(let i=0;i<10;i++){
   box(527+i*14,15+i*8,152-i*6,27,8,32,['#dbcdb1','#9a907b','#afa48d']);
   draw();
  }
 }else{
  context.save();
  context.translate(650,215);
  context.scale(370,47);
  const fog=context.createRadialGradient(0,0,0,0,0,1);
  fog.addColorStop(0,'#eaf0e1dd');fog.addColorStop(.58,'#eaf0e17d');fog.addColorStop(1,'#eaf0e100');
  context.fillStyle=fog;context.fillRect(-1,-1,2,2);
  context.restore();
 }
 for(const [x,y,z,h] of [[775,81,97,42],[739,88,87,62],[711,77,112,45],[799,55,137,48],[559,18,143,46]]){
  box(x,y,z,4,h*.6,4,['#665d49','#665d49','#504f40']);
  peak(x,y+h*.38,z,14,h*.65,11,['#527e68','#355e4e','#4c725f','#608772']);draw();
 }
 const x=stage>=1?382:213,z=stage>=1?175:143;
 face('#654c39',[x-12,8,z],[x+73,8,z],[x+59,0,z+16],[x,0,z+16]);
 face('#ac7650',[x-12,8,z],[x+73,8,z],[x+62,8,z+17],[x+1,8,z+17]);
 box(x+24,8,z+3,23,10,12,['#d4b481','#957453','#866649']);
 draw();
 const pavilionX=677,pavilionY=92,pavilionZ=89;
 box(pavilionX-8,pavilionY-22,pavilionZ-4,86,22,54,['#a8b19b','#758d7a','#839a85']);
 draw();
 box(pavilionX,pavilionY,pavilionZ,70,6,45,['#ddcaa8','#90846b','#a19075']);
 for(const [dx,dz] of [[5,5],[60,5],[5,36],[60,36]])box(pavilionX+dx,pavilionY+6,pavilionZ+dz,4,28,4,['#835543','#825040','#6f493c']);
 peak(pavilionX+35,pavilionY+34,pavilionZ+22,43,26,30,stage===3?['#56796a','#31574c','#426e5d','#668778']:['#78988a','#618578','#77998a','#8aa597']);
 draw();
 if(stage===3){
  for(const offset of [12,48]){
   const [px,py]=project([pavilionX+offset,pavilionY+21,pavilionZ+40]);
   context.fillStyle='#f0ca85';context.fillRect(px,py,6,8);
  }
 }
}
function depth(face:Face){
 return face.points.reduce((sum,[x,y,z])=>sum+x*.08+y*.20+z*.38,0)/face.points.length;
}
