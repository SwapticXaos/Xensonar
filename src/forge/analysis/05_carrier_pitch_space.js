/* Carrier pitch uses the canvas Hz axis. Experimental compression is an
   explicit render-only transform; the authored image is never rescaled. */
/* FORGE-DETUNE: bipolar. 0 = off; +1 = fully compressed into the pitch window around the content's centre (the original behaviour, saved values 0..1 are unchanged);
   -1 = spread: the same transform continued the other way (away from the compressed space), so the picture is played wider. */
function __forgeDetuneAmount(value){return Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0}
/* hz (as drawn) -> hz (as rendered), unclamped; null when Detune is off. One owner for the render and for the left Hz axis. */
function __forgeDetuneMapper(grid,value){const amount=__forgeDetuneAmount(value);if(!amount||!grid)return null;const root=JU(grid);return hz=>2**((1-amount)*Math.log2(hz)+amount*p3e(Rt(hz,grid.height),grid.height,root))}
/* the drawn Hz whose rendered pitch is `target` (the mapping rises monotonically): null when no drawn Hz reaches it */
function __forgeDetuneInverse(mapper,target){if(!mapper||!(target>0))return null;let lo=Math.log2(20),hi=Math.log2(20000);if(Math.log2(mapper(2**lo))>Math.log2(target)||Math.log2(mapper(2**hi))<Math.log2(target))return null;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(mapper(2**mid)<target)lo=mid;else hi=mid}return 2**((lo+hi)/2)}
function __forgePeakRow(row,center,left,right){
 if(!(center>0&&left>0&&right>0))return row;
 const a=Math.log(left),b=Math.log(center),c=Math.log(right),curve=a-2*b+c;
 return curve<0?row+Math.max(-.5,Math.min(.5,.5*(a-c)/curve)):row;
}
function __forgeDetuneRenderGrid(grid,value){
 const amount=__forgeDetuneAmount(value);if(!amount)return grid;
 const raw=__forgeDetuneMapper(grid,amount),mapHz=hz=>Math.max(20,Math.min(20000,raw(hz)));
 const out=new ph(grid.width,grid.height),doc=__f333ReadCarrier(grid);
 if(doc){
  const mapped={...doc,notes:doc.notes.map(note=>({...note,pitchHz:note.pitchHz.map(mapHz)}))};
  out.melodicCarrier=__f333MaterializeCarrier(mapped,out);return out;
 }
 for(let y=0;y<grid.height;y++){
  /* spread: what would land outside 20 Hz - 20 kHz is dropped, not piled up on the edge row */
  const mapped=raw(hs(y,grid.height));if(amount<0&&(mapped<20||mapped>20000))continue;
  const dest=Rt(Math.max(20,Math.min(20000,mapped)),grid.height),lo=Math.floor(dest),f=dest-lo,targets=[[lo,1-f],[lo+1,f]];
  for(let x=0;x<grid.width;x++){
   const amplitude=grid.get(x,y);if(amplitude<=0)continue;
   for(const [row,weight] of targets)if(row>=0&&row<grid.height&&amplitude*weight>out.get(x,row)){
    out.set(x,row,amplitude*weight);out.setGrain(x,row,grid.getGrain(x,y));
   }
  }
 }
 return out;
}

/* xen-lazy:lab */

