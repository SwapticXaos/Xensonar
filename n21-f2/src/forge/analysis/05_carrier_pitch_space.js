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
function __ForgeDetuneControl(){
 pe(state=>state.renderVersion);const mode=__useForgeListeningMode(),route=pe(state=>__f333Route(state)),grid=pe(state=>state.spectralData),amount=__forgeDetuneAmount(grid.carrierDetune);
 const last=P.useRef(.5),drag=P.useRef(false);if(amount>0)last.current=amount;
 if(mode.value==='donor'||!['carrier','hearing'].includes(route))return null;
 const update=(next,undo=true)=>{const state=pe.getState();if(undo)state.pushUndo();state.spectralData.carrierDetune=__forgeDetuneAmount(next);state.triggerRender();if(!drag.current)__f333PersistNow();};
 return u.jsxs('div',{'data-forge-detune':true,style:{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'},children:[
  u.jsx('button',{type:'button','aria-pressed':amount>0,onClick:()=>update(amount>0?0:last.current),title:'Detune · compresses and recenters the frequency space. Off: fixed Hz mapping; the drawing stays unchanged.',className:'h-8 rounded border px-2 text-xs '+(amount>0?'border-amber-400 bg-amber-900 text-amber-100':'border-neutral-700 bg-neutral-900 text-neutral-300'),children:'Detune'}),
  amount>0&&u.jsxs('label',{style:{display:'flex',gap:5,alignItems:'center',fontSize:10},children:[u.jsx('input',{type:'range',min:1,max:100,step:1,value:Math.round(amount*100),'aria-label':'Detune amount',style:{width:100},onPointerDown:()=>{pe.getState().pushUndo();drag.current=true;},onPointerUp:()=>{drag.current=false;__f333PersistNow();},onPointerCancel:()=>{drag.current=false;__f333PersistNow();},onBlur:()=>{drag.current=false;__f333PersistNow();},onChange:event=>update(Number(event.currentTarget.value)/100,!drag.current)}),u.jsx('output',{children:Math.round(amount*100)+' %'})]})
 ]});
}
