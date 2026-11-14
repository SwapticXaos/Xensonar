function __forgeRestoreViewport(view={}){const valid=Number.isFinite(view.spanX)&&view.spanX>0&&view.spanX<=1;return {...view,autoFitX:valid?view.spanX>=.999999:true,spanX:valid?view.spanX:1,startX:valid?Math.max(0,Math.min(1-view.spanX,view.startX||0)):0}}

// Display-only, data-resolution raster cache. Audio/Carrier fields are never resampled in place.
let __forgeDisplayRasterCache = new WeakMap();
// Forget only cached pixels/canvases, not the underlying carrier drawing.
function __f449ReleaseForgeDisplayCache(){
 __forgeDisplayRasterCache=new WeakMap();
 __forgeDonorDisplayCache=new WeakMap();
}
function __forgeDisplayCanvas(width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}
function __forgeDisplayLayers(args){
  const data=args.spectralData,width=data.width,height=data.height;
  const keys=[data,args.renderVersion,args.colorLut,args.showGrain,args.variant,args.forge3Lens,args.forge3Field,args.activeVisibilityMask,args.traceVisibilityMask,args.showTraceLayer,width,height];
  let layer=__forgeDisplayRasterCache.get(args.canvas);
  const stable=Number.isFinite(args.renderVersion)&&layer&&keys.every((key,i)=>Object.is(key,layer.keys[i]));
  if(!stable){
    const raster=layer?.raster??__forgeDisplayCanvas(width,height);
    if(raster.width!==width)raster.width=width;if(raster.height!==height)raster.height=height;
    __F33NativeFrame({...args,canvas:raster,viewPort:{offsetX:0,offsetY:0,zoomX:1,zoomY:1}});
    layer={keys,raster,protection:null,columnMask:null};__forgeDisplayRasterCache.set(args.canvas,layer);
  }
  return layer;
}
function __forgeDisplayDraw(ctx,raster,args){
  const {offsetX,offsetY,zoomX,zoomY}=args.viewPort;
  if(!(zoomX>0&&zoomY>0))return;
  const unit=zoomX===1&&zoomY===1&&Number.isInteger(offsetX)&&Number.isInteger(offsetY);
  ctx.save();ctx.imageSmoothingEnabled=!unit;
  ctx.drawImage(raster,offsetX,offsetY,args.canvas.width/zoomX,args.canvas.height/zoomY,0,0,args.canvas.width,args.canvas.height);ctx.restore();
}

/* xen-lazy:lab */

// Protect the original energy/grain/lens image, including faint tool texture.
function __forgeDisplayCarrierLayers(args){
  const layer=__forgeDisplayLayers(args);if(layer.protection&&layer.columnMask)return layer;
  const data=args.spectralData,width=data.width,height=data.height;
  const protection=__forgeDisplayCanvas(width,height),ctx=protection.getContext('2d');
  const image=ctx.createImageData(width,height),pixels=image.data,active=new Uint8Array(width);
  // A non-zero cell does not necessarily have a visible colour.  In F3.21
  // all non-zero cells were 100% protected, so the dark fringe of soft paint
  // punched black holes through the donor spectrogram.  Protect the actual
  // DISPLAYED carrier contrast instead of treating float nonzero as opacity.
  // This mask is visual only: neither PCM nor spectral/grain/trace data change.
  const displayed=layer.raster.getContext('2d').getImageData(0,0,width,height).data;
  const bgR=args.colorLut[0],bgG=args.colorLut[1],bgB=args.colorLut[2];
  const smoothstep=(v)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
  const traces=args.variant==='forge3'&&args.forge3Lens!=='hear'&&args.showTraceLayer?args.traceVisibilityMask:null;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=y*width+x,raw=data.data[at],painted=Number.isFinite(raw)&&raw>0;
    if(painted)active[x]=1; // Preserve the original time-column support.
    if(!painted&&!((traces?.[at]??0)>.02))continue;
    const pos=at*4;
    const contrast=Math.max(
      Math.abs(displayed[pos]-bgR),
      Math.abs(displayed[pos+1]-bgG),
      Math.abs(displayed[pos+2]-bgB));
    // Up to eight RGB levels above background: transparent to the donor.
    // At 40 levels or more: preserve the original carrier pixel exactly.
    const protectionAlpha=Math.round(255*smoothstep((contrast-8)/32));
    if(!protectionAlpha)continue;
    pixels[pos]=255;pixels[pos+1]=255;pixels[pos+2]=255;pixels[pos+3]=protectionAlpha;
  }
  ctx.putImageData(image,0,0);
  const columnMask=__forgeDisplayCanvas(width,1),mc=columnMask.getContext('2d'),mi=mc.createImageData(width,1);
  for(let x=0;x<width;x++){mi.data[x*4]=255;mi.data[x*4+1]=255;mi.data[x*4+2]=255;mi.data[x*4+3]=active[x]?255:0;}mc.putImageData(mi,0,0);
  layer.protection=protection;layer.columnMask=columnMask;return layer;
}
let __forgeDonorDisplayCache=new WeakMap();


/* xen-lazy:lab */


// Display controls share the existing persisted palette/grain settings.

/* xen-lazy:lab */


// F3.56.10: display-only bridge for the F3.52+ / F3.56 Sound Material pipeline.
// Uses its already computed PCM spectrogram, not a second FFT and never changes synthesis.

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
/* Navigator one-shot selection lives outside the undoable musical project.
   Selection is a draft, never a second playback or sample library owner. */
const __ForgeNavigatorSample=(()=>{
 const listeners=new Set();let state=Object.freeze({selection:null,busy:false,message:''});
 const snapshot=()=>state,subscribe=fn=>(listeners.add(fn),()=>listeners.delete(fn));
 function update(patch){state=Object.freeze({...state,...patch});for(const fn of listeners)fn()}
 function select(a,b){__f333StopNavigatorPreview();const source=pe.getState(),start=Math.max(0,Math.min(1,Math.min(a,b))),end=Math.max(0,Math.min(1,Math.max(a,b)));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end-start<.003)return clear();
  update({selection:{start,end,source:source.sourceAsset,revision:source.renderVersion,route:__f333Route(source)},barsDraft:null,message:''});
 }
 function clear(){__f333StopNavigatorPreview();if(state.selection||state.message)update({selection:null,message:''})}
 function current(){const s=state.selection,p=pe.getState();return !!s&&s.revision===p.renderVersion&&s.source===p.sourceAsset&&s.route===__f333Route(p)?s:null}
 return {snapshot,subscribe,select,clear,current,update};
})();
/* Navigator selection metadata belongs to the selection draft, never to the Carrier.
   An untouched suggestion is marked uncertain; users can override it explicitly. */
function __f333NavigatorEstimateBars(selection,sourceBars){
 if(!selection)return null;
 const source=__xenAudioMaterialBars(sourceBars);
 return __xenAudioMaterialBars((selection.end-selection.start)*source);
}
function __f333NavigatorBars(sourceBars){
 const selected=__ForgeNavigatorSample.current();if(!selected)return null;
 const draft=__ForgeNavigatorSample.snapshot().barsDraft;
 return Number.isFinite(draft)&&draft>=1/64&&draft<=16?draft:__f333NavigatorEstimateBars(selected,sourceBars);
}
/* P7.3: purple sample-region handles are NOT the cyan Navigator viewport handles.
   Hit-testing is read-only and does not allocate any audio object. */

/* xen-lazy:lab */


/* xen-lazy:lab */

/* P7.5: the SAME Navigator sample edges in the magnified Forge painting area.
   No secondary selection state, no filled area and no audio/RAF work. */

/* xen-lazy:lab */


/* xen-lazy:lab */


/* xen-lazy:lab */
const H5e=.2,V5e=5,YO=72,JO=180,W5e=.0011,U5e=10;
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
// Horizontal viewport must never expose time beyond the four-bar data domain.
// Preserve genuine zoom-in and clamp pan; only insufficient zoom is raised
// to the minimum that fills the newly measured canvas.

/* xen-lazy:lab */

// Also guard viewport state restored *after* the ResizeObserver first fires.

/* xen-lazy:lab */


/* xen-lazy:lab */

// Clamp the gesture to the *visible* painting area before converting to spectral cells.
// For end coordinates the far edge is exclusive, allowing copyRegion(0,0,width,height).

/* xen-lazy:lab */



/* xen-lazy:lab */
