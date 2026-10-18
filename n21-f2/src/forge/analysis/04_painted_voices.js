/* A raster is not required to be a harmonic score. Independent painted contours
   remain playable when the harmonic support reader finds no stable bands. */
function __paintedCarrierTracks(grid,durationSec,pitchRatio=1){
 if(!grid||!Number.isInteger(grid.width)||!Number.isInteger(grid.height)||grid.width<1||grid.height<2)return [];
 const width=grid.width,height=grid.height,lanes=[],logBase=Math.log2(20),logRange=Math.log2(1000);
 for(let x=0;x<width;x++){
  const column=grid.getColumn(x),regions=[];
  for(let y=0;y<height;){
   const amp=Number.isFinite(column?.[y])?Math.max(0,column[y]):0;
   if(amp<=.000001){y++;continue}
   let peak=0,power=0,logSum=0;
   while(y<height){const v=Number.isFinite(column?.[y])?Math.max(0,column[y]):0;if(v<=.000001)break;
    const weight=v*v;peak=Math.max(peak,v);power+=weight;logSum+=weight*(logBase+(1-(y+.5)/height)*logRange);y++}
   regions.push({gain:Math.min(1,peak),logHz:logSum/Math.max(1e-20,power)});
  }
  // A complex image can supply a dense vertical chord. Merge closest neighbors
  // only beyond 24 simultaneous contours; do not reject the entire image.
  while(regions.length>24){let at=0,best=Infinity;for(let i=0;i<regions.length-1;i++){const d=Math.abs(regions[i].logHz-regions[i+1].logHz);if(d<best){best=d;at=i}}
   const a=regions[at],b=regions[at+1],w=a.gain+b.gain;regions.splice(at,2,{gain:Math.max(a.gain,b.gain),logHz:(a.logHz*a.gain+b.logHz*b.gain)/Math.max(1e-20,w)})}
  const matched=new Set();
  for(const region of regions){let chosen=null,distance=Infinity;
   for(const lane of lanes){if(matched.has(lane))continue;const penalty=lane.lastX<x-2?.5:0,d=Math.abs(lane.lastLog-region.logHz)+penalty;if(d<distance){distance=d;chosen=lane}}
   if(!chosen){chosen={gain:new Float32Array(width),logHz:new Float64Array(width),lastLog:region.logHz,lastX:x};lanes.push(chosen)}
   chosen.gain[x]=region.gain;chosen.logHz[x]=region.logHz;chosen.lastX=x;chosen.lastLog=region.logHz;matched.add(chosen);
  }
 }
 return lanes.map((lane,index)=>{const position=t=>Math.max(0,Math.min(width-1,t/Math.max(1e-9,durationSec)*width-.5));return {
  id:'painted-contour-'+index,kind:'painted-raster',startSec:lane.gain.findIndex(g=>g>0)/width*durationSec,
  gainAt(t){const p=position(t),a=Math.floor(p),b=Math.min(width-1,a+1);return lane.gain[a]+(lane.gain[b]-lane.gain[a])*(p-a)},
  at(t){const p=position(t),a=Math.floor(p),b=Math.min(width-1,a+1),f=p-a,gain=lane.gain[a]*(1-f)+lane.gain[b]*f;
   const log=lane.gain[a]>1e-12&&lane.gain[b]>1e-12?lane.logHz[a]*(1-f)+lane.logHz[b]*f:(lane.gain[a]>lane.gain[b]?lane.logHz[a]:lane.logHz[b]);
   return {gain,hz:Math.pow(2,log||Math.log2(220))*pitchRatio}}};});
}
function __carrierAudibleHz(value,sampleRate=48000,last=220){
 let hz=Number.isFinite(value)&&value>0?value:last;const top=Math.min(12000,sampleRate*.43);
 if(hz<20)hz*=2**Math.ceil(Math.log2(20/hz));if(hz>top)hz*=2**Math.floor(Math.log2(top/hz));return Math.max(20,Math.min(top,hz));
}
