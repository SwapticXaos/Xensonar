/* F4.4.8: passive, view-owned PCM measurement. Nothing is started at module load.
 * The ordinary Forge preview supplies its already completed buffer AFTER playback
 * starts. No synthesis, export, material handoff or live-engine code depends on us.
 */
function observeForgePreviewPCM(engine,receive) {
 const original=engine.playBufferInternal;
 let open=true;
 function observed(...args) {
  const result=Reflect.apply(original,this,args);
  // Return the very same value/promise. A broken display must never fail playback.
  Promise.resolve(result).then(played=>{
   if(open&&played!==false)try{receive(args[0],args[5]||{})}catch{}
  },()=>{});
  return result;
 }
 engine.playBufferInternal=observed;
 return ()=>{open=false;if(engine.playBufferInternal===observed)engine.playBufferInternal=original};
}

// Self-contained worker program. Both the STFT and RGBA conversion stay here.
function forgePCMMeasurementWorker() {
 let audio=null,sr=0,count=0,speed=1;
 function fft(real,imag) {
  const size=real.length;
  for(let i=1,j=0;i<size;i++){
   let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
   if(i<j){let v=real[i];real[i]=real[j];real[j]=v;v=imag[i];imag[i]=imag[j];imag[j]=v;}
  }
  for(let span=2;span<=size;span*=2){
   const angle=-2*Math.PI/span,cos=Math.cos(angle),sin=Math.sin(angle);
   for(let start=0;start<size;start+=span){
    let wr=1,wi=0;
    for(let j=0;j<span/2;j++){
     const a=start+j,b=a+span/2,tr=wr*real[b]-wi*imag[b],ti=wr*imag[b]+wi*real[b];
     real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;
     const next=wr*cos-wi*sin;wi=wr*sin+wi*cos;wr=next;
    }
   }
  }
 }
 function measure() {
  const durationSec=count/(sr*speed),width=Math.max(48,Math.min(512,Math.ceil(durationSec*45))),height=256,size=8192;
  const pixels=new Uint8ClampedArray(width*height*4),values=new Float32Array(width*height),window=new Float64Array(size),real=new Float64Array(size),imag=new Float64Array(size),power=new Float64Array(size/2);
  let total=0,maximum=0;
  for(let i=0;i<size;i++){window[i]=(1-Math.cos(2*Math.PI*i/(size-1)))/2;total+=window[i]}
  const scale=2/total,low=new Int32Array(height),high=new Int32Array(height);
  for(let y=0;y<height;y++){
   low[y]=Math.max(1,Math.floor(20000*Math.exp(-Math.log(1000)*(y+1)/height)/(sr*speed)*size));
   high[y]=Math.min(size/2-1,Math.ceil(20000*Math.exp(-Math.log(1000)*y/height)/(sr*speed)*size));
  }
  for(let x=0;x<width;x++){
   const start=Math.round((x+.5)/width*count)-size/2;power.fill(0);
   for(const samples of audio){
    imag.fill(0);
    for(let j=0;j<size;j++){const i=start+j;real[j]=(i>=0&&i<count?samples[i]:0)*window[j]}
    fft(real,imag);
    for(let k=1;k<size/2;k++)power[k]+=(real[k]*real[k]+imag[k]*imag[k])/audio.length;
   }
   for(let y=0;y<height;y++){
    let energy=0;for(let k=low[y];k<=high[y];k++)energy=Math.max(energy,power[k]);
    const magnitude=Math.sqrt(energy)*scale;
    values[y*width+x]=magnitude;maximum=Math.max(maximum,magnitude);
   }
  }
  // Every listening method uses the same relative scale. A quiet voice must
  // remain legible; this is display normalization, never audio gain processing.
  const reference=Math.max(1e-8,maximum);
  for(let i=0;i<values.length;i++){
   const level=Math.max(0,Math.min(1,(20*Math.log10(Math.max(1e-20,values[i])/reference)+56)/56)),at=i*4;
   pixels[at]=45;pixels[at+1]=225;pixels[at+2]=203;pixels[at+3]=Math.round(235*Math.pow(level,1.1));
  }
  audio=null;
  self.postMessage({type:'image',width,height,pixels,durationSec},[pixels.buffer]);
 }
 self.onmessage=({data:m})=>{
  try{
   if(m.type==='begin'){
    if(!Number.isInteger(m.length)||m.length<1||!Number.isInteger(m.channels)||m.channels<1||m.channels>32||m.length*m.channels>16777216||!(m.sampleRate>0)||!(m.rate>0))throw Error('Unsupported measurement size');
    count=m.length;sr=m.sampleRate;speed=m.rate;audio=Array.from({length:m.channels},()=>new Float32Array(count));
   }else if(m.type==='chunk'){
    if(!audio||!audio[m.channel]||!(m.samples instanceof Float32Array)||m.offset<0||m.offset+m.samples.length>count)throw Error('Invalid PCM chunk');
    audio[m.channel].set(m.samples,m.offset);
   }else if(m.type==='finish'){if(!audio)throw Error('No PCM supplied');measure()}
  }catch(error){audio=null;self.postMessage({type:'error',message:String(error.message||error)})}
 };
}

// Only the visible editor mounts the owner. The main room never owns a worker,
// preview observer, timer, image cache or spectrum store subscription.
function ForgePCMSpectrumView({frame}) {
 const visible=P.useContext(__ForgeWorkspaceVisibility);
 return visible?u.jsx(ForgePCMSpectrumOwner,{frame}):null;
}
function ForgePCMSpectrumOwner({frame}) {
 const output=P.useRef(null),redOutput=P.useRef(null),latest=P.useRef(frame),image=P.useRef(null);
 const [status,setStatus]=P.useState('Play to measure'),[shown,setShown]=P.useState(true);
 latest.current=frame;
 function draw() {
  const target=output.current,args={...latest.current,canvas:latest.current.canvasRef.current},base=args.canvas;
  if(!target||!base)return;
  if(target.width!==base.width)target.width=base.width;
  if(target.height!==base.height)target.height=base.height;
  const context=target.getContext('2d');if(!context)return;
  context.clearRect(0,0,target.width,target.height);
  if(!image.current||!(args.viewPort.zoomX>0&&args.viewPort.zoomY>0))return;
  const {offsetX,offsetY,zoomX,zoomY}=args.viewPort,sx=image.current.width/args.spectralData.width,sy=image.current.height/args.spectralData.height;
  context.globalCompositeOperation='source-over';context.imageSmoothingEnabled=true;
  context.drawImage(image.current,offsetX*sx,offsetY*sy,target.width/zoomX*sx,target.height/zoomY*sy,0,0,target.width,target.height);
  // Reuse the pre-4.3.4 editor's cached carrier mask; never write into the grid.
  context.globalCompositeOperation='destination-out';
  __forgeDisplayDraw(context,__forgeDisplayCarrierLayers(args).protection,args);
  context.globalCompositeOperation='source-over';
  const red=redOutput.current;
  if(red){
   red.width=target.width;red.height=target.height;
   const tint=red.getContext('2d');tint.drawImage(target,0,0);
   tint.globalCompositeOperation='source-in';tint.fillStyle='rgb(245,76,82)';tint.fillRect(0,0,red.width,red.height);
  }
 }
 P.useEffect(()=>{draw()},[frame]);
 P.useEffect(()=>{
  if(!shown)return;
  setStatus('Play to measure');
  let alive=true,worker=null,url=null,scheduled=null,sequence=0,buffer=null,animation=null,swapTimer=null;
  const removers=[];
  const identity=()=>{
   const s=pe.getState(),m=s.materialExport,d=Vt.getSnapshot();
   return [s.spectralData,s.renderVersion,s.synthMode,s.waveformMix,s.carrierIntegralSelection,s.carrierIntegralSynthLab,s.carrierIntegralHarmonicXplore,
    s.sourceAsset,s.sourceAssetContext,s.sourcePreviewMode,m.bars,m.beatsPerBar,m.bpm,__ForgeListeningMode.value(),d.sourceRevision,d.selected,
    __F3564Master.getSnapshot().tuning,__Fractalia.snapshot(),__Emilia.snapshot(),__F341Workbench.fingerprint(),__F352Session.getSnapshot().recipe];
  };
  let stamp=identity();
  function cancel() {
   sequence++;buffer=null;
   if(swapTimer!==null){clearTimeout(swapTimer);swapTimer=null}
   if(scheduled!==null){if(typeof cancelIdleCallback==='function')cancelIdleCallback(scheduled);else clearTimeout(scheduled);scheduled=null}
   if(worker){worker.onmessage=worker.onerror=null;worker.terminate();worker=null}
   if(url){URL.revokeObjectURL(url);url=null}
  }
  function pulse() {
   if(image.current&&!animation&&redOutput.current)
    animation=redOutput.current.animate([{opacity:0},{opacity:.82},{opacity:0}],{duration:2800,iterations:Infinity});
  }
  function invalidate() {
   const next=identity();if(next.every((v,i)=>Object.is(v,stamp[i])))return;
   stamp=next;cancel();pulse();if(alive)setStatus(image.current?'Previous spectrum · awaiting preview':'Play to measure');
  }
  function enqueue(fn) {
   const run=()=>{scheduled=null;if(alive)fn()};
   scheduled=typeof requestIdleCallback==='function'?requestIdleCallback(run,{timeout:100}):setTimeout(run,0);
  }
  function receive(pcm,options) {
   if(!alive||!pcm?.getChannelData)return;
   if(!/^(forge-f333-|forge-f352-hybrid$|donor-projection$)/.test(options.lifecycleMode||''))return;
   invalidate();cancel();pulse();
   // At most 64 MiB of PCM, copied in 256 KiB idle slices. Never detach AudioBuffer data.
   if(pcm.length*pcm.numberOfChannels>16777216){setStatus('Preview too long for spectrum');return}
   const token=sequence;buffer=pcm;setStatus(image.current?'Previous spectrum · measuring':'Measuring heard audio…');
   enqueue(()=>{
    if(token!==sequence||!buffer)return;
    try{
     url=URL.createObjectURL(new Blob(['('+forgePCMMeasurementWorker.toString()+')()'],{type:'text/javascript'}));
     worker=new Worker(url,{name:'forge-pcm-view'});URL.revokeObjectURL(url);url=null;
     worker.onerror=()=>{if(alive&&token===sequence){cancel();setStatus('Spectrum unavailable')}};
     worker.onmessage=({data})=>{
      if(!alive||token!==sequence)return;
      if(data.type==='error'){cancel();setStatus('Spectrum unavailable');return}
      if(data.type!=='image')return;
      try{
       const bitmap=document.createElement('canvas');bitmap.width=data.width;bitmap.height=data.height;
       bitmap.getContext('2d').putImageData(new ImageData(data.pixels,data.width,data.height),0,0);
       cancel();
       const commitToken=sequence;
       const commit=()=>{
        swapTimer=null;if(!alive||commitToken!==sequence)return;
        animation?.cancel();animation=null;image.current=bitmap;draw();setStatus('Cyan · heard spectrum');
       };
       // Commit only at the cyan end of the red pulse. Web Animations owns the
       // pulse; one view-scoped timeout replaces the former repaint loop.
       const phase=animation?(Number(animation.currentTime)||0)%2800:0;
       if(phase>35)swapTimer=setTimeout(commit,2800-phase);else commit();
      }catch{cancel();setStatus('Spectrum unavailable')}
     };
     worker.postMessage({type:'begin',length:buffer.length,channels:buffer.numberOfChannels,sampleRate:buffer.sampleRate,rate:Math.max(.05,options.playbackRate??1)});
     let channel=0,offset=0;
     function transfer() {
      if(token!==sequence||!buffer||!worker)return;
      try{
       const end=Math.min(buffer.length,offset+65536),samples=buffer.getChannelData(channel).slice(offset,end);
       worker.postMessage({type:'chunk',channel,offset,samples},[samples.buffer]);offset=end;
       if(offset===buffer.length){channel++;offset=0}
       if(channel===buffer.numberOfChannels){buffer=null;worker.postMessage({type:'finish'})}else enqueue(transfer);
      }catch{cancel();if(alive)setStatus('Spectrum unavailable')}
     }
     transfer();
    }catch{cancel();if(alive)setStatus('Spectrum unavailable')}
   });
  }
  removers.push(observeForgePreviewPCM(xt,receive));
  for(const store of [pe,Vt,__ForgeListeningMode,__F3564Master,__Fractalia,__Emilia,__F341Workbench,__F352Session])removers.push(store.subscribe(invalidate));
  const resize=new MutationObserver(draw),base=latest.current.canvasRef.current;
  if(base)resize.observe(base,{attributes:true,attributeFilter:['width','height']});
  return ()=>{alive=false;cancel();animation?.cancel();animation=null;for(const remove of removers)remove();resize.disconnect();image.current=null;draw()};
 },[shown]);
 return u.jsxs(u.Fragment,{children:[
  u.jsx('canvas',{ref:output,'data-forge-pcm-spectrum':status,className:'absolute inset-0 pointer-events-none',style:{display:shown?'block':'none',opacity:.88}}),
  u.jsx('canvas',{ref:redOutput,'data-forge-spectrum-transition':true,className:'absolute inset-0 pointer-events-none',style:{display:shown?'block':'none',opacity:0}}),
  u.jsxs('label',{className:'absolute bottom-2 left-2',style:{position:'absolute',bottom:8,left:8,zIndex:4,color:'#b8e9e4',fontSize:10,background:'rgba(4,19,22,.85)',padding:'3px 6px',borderRadius:3},children:[
   u.jsx('input',{type:'checkbox',checked:shown,onChange:e=>setShown(e.target.checked),'aria-label':'Show heard spectrum',style:{marginRight:5}}),
   u.jsx('span',{role:'status',title:'Measured preview PCM · level relative to the strongest partial · 56 dB range',children:status})]})]});
}
if(typeof module!=='undefined'&&module.exports)module.exports={forgePCMMeasurementWorker,observeForgePreviewPCM};
