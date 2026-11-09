/* Carrier pitch uses the canvas Hz axis. Experimental compression is an
   explicit render-only transform; the authored image is never rescaled. */
function __forgeDetuneAmount(value){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):0}
function __forgePeakRow(row,center,left,right){
 if(!(center>0&&left>0&&right>0))return row;
 const a=Math.log(left),b=Math.log(center),c=Math.log(right),curve=a-2*b+c;
 return curve<0?row+Math.max(-.5,Math.min(.5,.5*(a-c)/curve)):row;
}
function __forgeDetuneRenderGrid(grid,value){
 const amount=__forgeDetuneAmount(value);if(!amount)return grid;
 const root=JU(grid),mapHz=hz=>Math.max(20,Math.min(20000,2**((1-amount)*Math.log2(hz)+amount*p3e(Rt(hz,grid.height),grid.height,root))));
 const out=new ph(grid.width,grid.height),doc=__f333ReadCarrier(grid);
 if(doc){
  const mapped={...doc,notes:doc.notes.map(note=>({...note,pitchHz:note.pitchHz.map(mapHz)}))};
  out.melodicCarrier=__f333MaterializeCarrier(mapped,out);return out;
 }
 for(let y=0;y<grid.height;y++){
  const dest=Rt(mapHz(hs(y,grid.height)),grid.height),lo=Math.floor(dest),f=dest-lo,targets=[[lo,1-f],[lo+1,f]];
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

