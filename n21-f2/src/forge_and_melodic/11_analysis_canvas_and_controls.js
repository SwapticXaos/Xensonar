
function __f341Selection(source,model){
 const preferred=model.bodyV3?.sourceChannelIndex===1?source.rightSamples:source.leftSamples;const pcm=preferred?.length?preferred:source.monoSamples;
 const start=Math.max(0,Math.round(source.importStartSec*source.sampleRate)),end=Math.min(pcm.length,start+Math.round(source.importDurationSec*source.sampleRate));
 return {samples:pcm.subarray(start,end),sampleRate:source.sampleRate,duration:(end-start)/source.sampleRate,eventStart:(__F341Workbench.getConfig().params.materialPilot)?0:model.bodyV3?.eventStartSec??0,eventDuration:(__F341Workbench.getConfig().params.materialPilot)?(end-start)/source.sampleRate:model.hybrid.samples.length/model.hybrid.sampleRate};
}
function __f341CanvasSetup(canvas){
 const box=canvas.getBoundingClientRect(),ratio=Math.min(2,globalThis.devicePixelRatio||1);
 const w=Math.max(1,Math.round(box.width)),h=canvas.dataset.output?160:canvas.dataset.f350Sample?Math.max(280,Math.round(box.height)||380):520;
 canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
 const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 return {ctx,w,h};
}

const __F343HeatCanvas=new WeakMap();
function __f341Heatmap(ctx,heat,x,y,w,h){if(!heat)return;let small=__F343HeatCanvas.get(heat);if(!small){small=document.createElement('canvas');small.width=heat.width;small.height=heat.height;const c=small.getContext('2d'),image=c.createImageData(heat.width,heat.height);for(let i=0;i<heat.values.length;i++){const db=20*Math.log10(Math.max(1e-12,heat.values[i])/Math.max(1e-12,heat.maximum)),t=Math.max(0,Math.min(1,(db+66)/66));image.data[i*4]=Math.round(10+245*t**2);image.data[i*4+1]=Math.round(18+185*Math.sin(t*Math.PI*.7));image.data[i*4+2]=Math.round(35+130*Math.sin(t*Math.PI));image.data[i*4+3]=255;}c.putImageData(image,0,0);__F343HeatCanvas.set(heat,small);}ctx.imageSmoothingEnabled=true;ctx.drawImage(small,x,y,w,h);}
// Stable per-selection PCM index. Full-resolution PCM stays in place for hearing/export.
const __F343WaveIndices=new WeakMap();
function __f343WaveIndex(samples){
 let index=__F343WaveIndices.get(samples);if(index)return index;
 const step=128,count=Math.ceil(samples.length/step),min=new Float32Array(count),max=new Float32Array(count);
 let peak=0;
 for(let block=0;block<count;block++){
  let lo=0,hi=0;const first=block*step,last=Math.min(samples.length,first+step);
  for(let i=first;i<last;i++){const s=samples[i];if(s<lo)lo=s;if(s>hi)hi=s;peak=Math.max(peak,Math.abs(s));}
  min[block]=lo;max[block]=hi;
 }
 index={step,min,max,peak};__F343WaveIndices.set(samples,index);return index;
}
function __f343WaveRange(samples,index,a,b){
 const step=index.step,n=samples.length; a=Math.max(0,Math.min(n,a));b=Math.max(a,Math.min(n,b));
 let low=0,high=0;
 const firstBlock=Math.min(index.min.length,Math.ceil(a/step));
 const endBlock=Math.min(index.min.length,Math.floor(b/step));
 const firstEnd=Math.min(b,firstBlock*step);
 for(let i=a;i<firstEnd;i++){const s=samples[i];low=Math.min(low,s);high=Math.max(high,s);}
 for(let j=firstBlock;j<endBlock;j++){low=Math.min(low,index.min[j]);high=Math.max(high,index.max[j]);}
 for(let i=Math.max(firstEnd,endBlock*step);i<b;i++){const s=samples[i];low=Math.min(low,s);high=Math.max(high,s);}
 return [low,high];
}
function __f341Paint(canvas,selection,body,model,heat,config,layer,range,point,viewport=[0,1],runs=[],selectedRun=null){
 if(!canvas||!selection)return;const setup=__f341CanvasSetup(canvas),{ctx,w}=setup,sy=canvas.dataset?.f350Sample?setup.h/520:1,h=setup.h/sy;
 ctx.scale(1,sy);
 const left=w<500?64:84,right=14,iw=Math.max(1,w-left-right),lo=viewport[0],hi=viewport[1],duration=selection.duration;
 const xpos=f=>left+(f-lo)/(hi-lo)*iw;
 ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);ctx.font='11px system-ui';ctx.fillStyle='#8394ae';ctx.fillText('Frequenz',9,25);ctx.fillText('Wellenform',9,287);
 __f341Heatmap(ctx,heat,xpos(0),28,iw/(hi-lo),218);
 ctx.fillStyle='#080d18';ctx.fillRect(0,0,left,h);ctx.fillRect(w-right,0,right,h);
 ctx.fillStyle='#8394ae';for(const hz of [10000,3000,1000,300,100])if(hz<selection.sampleRate*.46){const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));ctx.fillText(hz>=1000?(hz/1000)+' kHz':hz+' Hz',9,y);}
 // Waveform is the entire selected donor mask, not just the automatically cropped event.
 const waveIndex=__f343WaveIndex(selection.samples),peak=waveIndex.peak;ctx.strokeStyle='#62cdd2';ctx.beginPath();
 for(let px=0;px<iw;px++){const a=Math.floor((lo+px/iw*(hi-lo))*selection.samples.length),b=Math.max(a+1,Math.floor((lo+(px+1)/iw*(hi-lo))*selection.samples.length));const [low,high]=__f343WaveRange(selection.samples,waveIndex,a,b);ctx.moveTo(left+px,291-low/Math.max(1e-9,peak)*30);ctx.lineTo(left+px,291-high/Math.max(1e-9,peak)*30);}ctx.stroke();
 const eventLo=selection.eventStart/duration,eventHi=(selection.eventStart+selection.eventDuration)/duration;
 ctx.fillStyle='#02040a99';if(xpos(eventLo)>left)ctx.fillRect(left,28,Math.min(iw,xpos(eventLo)-left),298);if(xpos(eventHi)<left+iw)ctx.fillRect(Math.max(left,xpos(eventHi)),28,left+iw-Math.max(left,xpos(eventHi)),298);
 const frames=body.frames??[],hop=Math.max(body.frameHopSec??.0125,selection.eventDuration/Math.max(1,frames.length-1));
 // Pitch trace uses measured values only.
 if(layer==='pitch'){ctx.strokeStyle='#bef264';ctx.lineWidth=1.5;ctx.beginPath();let continuing=false;for(const f of frames){const x=xpos((selection.eventStart+f.timeSec)/duration),hz=f.f0Hz;if(x<left||x>left+iw){continuing=false;continue;}if(!(hz>0)||f.pitchConfidence<.45){continuing=false;continue;}const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));if(continuing)ctx.lineTo(x,y);else ctx.moveTo(x,y);continuing=true;}ctx.stroke();}
 if(layer==='resonance'){ctx.fillStyle='#fbbf24';for(const f of frames){const x=xpos((selection.eventStart+f.timeSec)/duration);if(x<left||x>left+iw)continue;for(const peak of (f.spectralPeaks??[]).slice(0,8)){const hz=peak.hz;if(!(hz>35))continue;const y=28+218*(1-Math.log(hz/35)/Math.log(selection.sampleRate*.46/35));ctx.globalAlpha=Math.max(.2,Math.min(1,peak.amplitude??.5));ctx.fillRect(x-1,y-1,3,3);}}ctx.globalAlpha=1;}
 const rowTop=338,rowHeight=22;
 for(let r=0;r<__F341Workbench.layers.length;r++){
  const l=__F341Workbench.layers[r],y=rowTop+r*rowHeight;ctx.fillStyle=l.id===layer?'#172639':'#101925';ctx.fillRect(left,y,iw,rowHeight-3);ctx.fillStyle=l.id===layer?l.color:'#8b9bb0';ctx.font='10px system-ui';ctx.fillText(({material:'Material',noise:"Noise",pitch:"Pitch",resonance:"Resonances",dynamics:"Level",attack:"Onset"})[l.id],5,y+13);
  if(l.id==='material'){for(const win of model.sourceIndex?.windows??[]){const a=xpos((selection.eventStart+win.startSample/model.sampleRate)/duration),b=xpos((selection.eventStart+win.endSample/model.sampleRate)/duration);ctx.fillStyle='#2dd4bf66';ctx.fillRect(Math.max(left,a),y,Math.max(0,Math.min(left+iw,b)-Math.max(left,a)),rowHeight-3);ctx.fillStyle='#b6ffed';if(b-a>20)ctx.fillText(String(win.id+1),Math.max(left,a)+4,y+13);}}
  else for(const f of frames){const a=xpos((selection.eventStart+f.timeSec-hop*.5)/duration),b=xpos((selection.eventStart+f.timeSec+hop*.5)/duration);if(a>left+iw||b<left)continue;const entry=body.onsetEvidence,observed=l.id==='attack'&&(model.atlas?f.role==='attack':entry&&['transient','level-rise'].includes(entry.kind)&&f.timeSec+hop*.5>=entry.startSec&&f.timeSec-hop*.5<=entry.endSec);let v=l.id==='noise'?f.aperiodicity:l.id==='pitch'?f.pitchConfidence:l.id==='dynamics'?f.relativeLevel:l.id==='attack'?(observed?(model.atlas?model.atlas.attacks.find(a=>f.center>=a.start&&f.center<=a.end)?.confidence??0:entry.confidence):0):Math.min(1,(f.spectralPeaks?.length??0)/16);ctx.fillStyle=l.id==='attack'?observed?(model.atlas||entry.kind==='transient'?l.color:'#e2b65b'):'#64748b':l.color;ctx.globalAlpha=.06+Math.max(0,Math.min(1,v??0))*.85;ctx.fillRect(Math.max(left,a),y,Math.max(1,Math.min(left+iw,b)-Math.max(left,a)),rowHeight-3);}ctx.globalAlpha=1;
 }
 for(const d of model.sourceIndex?.frameDecisions??[]){const f=frames[d.frame];if(!f)continue;const x=xpos((selection.eventStart+f.timeSec)/duration);if(x<left||x>left+iw)continue;ctx.fillStyle=d.reasons.includes('manual')||d.reasons.includes('source-state')?'#2dd4bf':d.reasons.includes('evolving')?'#38bdf8':d.reasons.includes('accepted')?'#34d399':d.reasons.includes('air')||d.reasons.includes('shape')?'#fb7185':'#64748b';ctx.fillRect(x,rowTop+rowHeight-6,3,3);}
 // Manual annotations are outlines; measured analysis is never recoloured into a false claim.
 const colors={include:'#2dd4bf',exclude:'#fb7185',texture:'#f472b6',tonal:'#a3e635'};
 for(const region of config.regions){const a=Math.max(left,xpos(region.start)),b=Math.min(left+iw,xpos(region.end));if(b<=a)continue;ctx.strokeStyle=colors[region.role];ctx.lineWidth=2;ctx.strokeRect(a,28,b-a,298);ctx.fillStyle=colors[region.role]+'33';ctx.fillRect(a,28,b-a,298);}
 if(range){const a=Math.max(left,xpos(range[0])),b=Math.min(left+iw,xpos(range[1]));ctx.fillStyle='#c4b5fd33';ctx.fillRect(a,28,b-a,445);ctx.strokeStyle='#c4b5fd';ctx.lineWidth=1;ctx.strokeRect(a,28,b-a,445);}
 if(point!=null){ctx.strokeStyle='#e2e8f0aa';ctx.beginPath();ctx.moveTo(xpos(point),28);ctx.lineTo(xpos(point),473);ctx.stroke();}
 ctx.fillStyle='#a6b3c6';ctx.font='10px system-ui';for(let i=0;i<=6;i++){const f=lo+(hi-lo)*i/6,x=xpos(f);ctx.fillText((f*duration).toFixed(2)+' s',x-9,493);}
 ctx.fillStyle='#637891';ctx.fillText("Click = inspect · Drag = mark region · analysis and editing are separate",left,515);
 // Read-position markers and manual weights show the recipe without falsifying measured evidence.
 const params=config.params;
 // Markers use FFT-safe geometry from the same per-voice planner/renderer.
 const visibleRuns=selectedRun==null?runs:runs.filter((_,i)=>i===selectedRun);
 for(const run of visibleRuns){const g=run.workbenchRead;if(!g)continue;const a=xpos((selection.eventStart+g.safeLo/model.sampleRate)/duration),b=xpos((selection.eventStart+g.safeHi/model.sampleRate)/duration);ctx.strokeStyle='#fbbf24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Math.max(left,a),330);ctx.lineTo(Math.min(left+iw,b),330);ctx.stroke();const f=(selection.eventStart+g.firstSourceCenter/model.sampleRate)/duration,x=xpos(f);if(x<left||x>left+iw)continue;ctx.fillStyle='#e2fef6';ctx.beginPath();ctx.moveTo(x,332);ctx.lineTo(x-4,325);ctx.lineTo(x+4,325);ctx.fill();}
 {ctx.font='10px system-ui';ctx.fillStyle='#f472b6';ctx.fillText('Gewichtung ×'+params.noise.toFixed(2),Math.max(left,w-165),rowTop+rowHeight+13);}
 ctx.fillStyle='#c4b5fd';ctx.fillText(params.motion===0?'Materialposition gehalten':params.direction==='pendulum'?'Pendeln ×'+params.motion.toFixed(2):params.direction==='reverse'?"Backward ×"+params.motion.toFixed(2):"Forward ×"+params.motion.toFixed(2),Math.max(left,w-165),rowTop+13);
 canvas.__f341Geometry={left,width:iw,lo,hi,rowTop:rowTop*sy,rowHeight:rowHeight*sy};
}

function __F341Control({label,name,min,max,step=0.01,unit='',help}){
 const state=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),value=state.config.params[name],base=__F341Workbench.defaults[name];
 const automatic=value==null,effective=automatic?(name==='mapping'?.5:1):value;
 return u.jsxs('label',{className:'f341-control',children:[u.jsxs('span',{className:'f341-control-title',children:[u.jsx('span',{children:label}),u.jsx('button',{type:'button',className:((automatic||value===base)?'f341-auto selected':'f341-auto'),onClick:e=>{e.preventDefault();__F341Workbench.patch({[name]:base})},children:base==null?'Auto':'Basis'})]}),name==='detail'?u.jsx('select',{'aria-label':label,value:effective,onChange:e=>__F341Workbench.patch({[name]:Number(e.currentTarget.value)}),children:[u.jsx('option',{value:1,children:"Auto window · full length"}),u.jsx('option',{value:.5,children:"Half Length"}),u.jsx('option',{value:.25,children:"Quarter Length"})]}):u.jsx('input',{type:'range','aria-label':label,min,max,step,value:effective,onChange:e=>__F341Workbench.patch({[name]:Number(e.currentTarget.value)})}),u.jsxs('span',{className:'f341-control-value',children:[automatic?'Automatisch':Number(value).toFixed(step<.1?2:1)+unit,u.jsx('span',{children:help})]})]});
}
function __f342Plan(grid,model,config,durationSec,sampleRate){
 const plan=__ForgeF33.buildCarrierSupportPlan(grid,durationSec);

 if(config.params.gestaltPilot)return {...(config.params.variantRevision === "original" ? __F356GestaltOriginal : __F356Gestalt).plan(plan,model,sampleRate,durationSec,config),error:''};
 if(config.params.materialPilot)return {...(config.params.variantRevision === "original" ? __F356MaterialOriginal : __F356Material).plan(plan,model,sampleRate,durationSec,config),error:''};
 const {material}=__ForgeF33.planDonorMaterial(plan,model,sampleRate,durationSec);
 for(const voice of new Set(material.runs.map(r=>r.voice))){const runs=material.runs.filter(r=>r.voice===voice),size=__F347FilmSize(model,runs,sampleRate,config.params);for(const run of runs){const g=__ForgeF33.spectralFilmGeometry(model,run,sampleRate,size);run.workbenchRead={...g,firstSourceCenter:__F341Workbench.readPosition(g.safeLo,g.safeHi,0,config.params)};}}
 return {...material,error:''};
}
function __f342ProjectState(state){const runtime=Vt.getSnapshot();return {version:1,config:__F341Workbench.export(),session:__F341Workbench.exportSession(),combinationDraft:__F351Combination.export(),source:runtime.source,selected:runtime.selected,registerPolicy:runtime.model?.bodyV3?.registerPolicy??'resonance',donorUseMode:state.carrierDonorV2?.donorUseMode??'timbre_projection'};}
async function __f342RestoreProject(value){
 Vt.stop();Vt.invalidateInput(null);__F341Workbench.restore(value?.config);__F341Workbench.restoreSession(value?.session);__F351Combination.restore(value?.combinationDraft??__F351Combination.defaults);
 const source=value?.source;pe.getState().setSpectralEmbodimentSourceAsset(source??null);
 if(!source)return;
 const ticket=Vt.beginExtraction(source);
 try{const prepared=await kE(source);if(!Vt.commitExtraction(ticket,source,prepared))return;Vt.setRegisterPolicy(value.registerPolicy??'resonance');pe.getState().setCarrierDonorV2DonorUseMode(value.donorUseMode??'timbre_projection');if(value.selected)Vt.selectDonor();}catch(e){Vt.failExtraction(ticket,e);}
}
function __f342DecisionText(decision){const names={'source-state':"Audible source state in the sound atlas",manual:"Allowed by direct window selection or marking",outside:"Outside the selected material windows",evolving:"Allowed in varying motion",accepted:"Similarity accepted",attack:'Vor dem gemessenen Anschlagsende',tail:"Beyond the analysis boundary",quiet:"Level below 8%",pitch:"Pitch confidence too low",air:"Aperiodicity outside donor tolerance",shape:"Spectral shape outside donor tolerance"};return decision?.reasons?.map(r=>names[r]??r).join(' · ')??"No decision data for this frame.";}
function __f344PreviewProgress(runtime,pending,planned,model,body){
 if(!pending&&runtime.phase!=='rendering')return null;
 const runs=planned?.runs??[],voices=new Set(runs.map(run=>run.voice)).size;
 const windows=model?.sourceIndex?.windows?.length??0,frames=body?.frames?.length??0;
 const facts=runs.length+" carrier runs · "+voices+" voices · "+windows+" source windows";
 const p=runtime.phase==='rendering'&&Number.isFinite(runtime.renderProgress)?Math.max(0,Math.min(1,runtime.renderProgress)):null;
 let label;
 if(p===null||p<.02)label="Preparing: mapping donor to current carrier figure · "+facts;
 else if(p<.06)label="Preparing donor model · "+frames+" analysis frames available";
 else if(p<.08)label="Preparing material plan for transfer · "+facts;
 else if(p<1)label="Computing sound transfer · approx. "+Math.floor(p*20)*5+' % · '+facts;
 else label="Audio buffer computed · sending to playback · "+facts;
 return {text:label,progress:p};
}


const __F352WorkerScript=["// F3-50. Pure offline donor module. Original PCM is the source of every grain.\n// The carrier controls timing, gain and voiced pitch; it never masks the source spectrum.\n\n/* F3-55: original PCM loop bodies, bounded seam repair and independent pitch transport.\n * Offline only. No synthetic layer is added; transformed frames come from the body.\n * FFT peaks keep their neighbourhood phases (Laroche/Dolson 1999). */\n\n\n\n\n\n\n\n\n/* F3.53: donor-conditioned structural planning. No oscillator or PCM is returned\n * by this module. Carrier run boundaries and target curves remain unchanged.\n * Historical inspirations: Bert (continuity), Antonia (event role), Cecilia\n * (within-event energy movement), HX (measured native register). L1 transfers.\n */\n\n\nconst Kc=1024;\nconst v3e=199.834572;\nconst a_=[.0533437,.1280363,.7784623,.5341669,.0620899,.1369675,.2177907,.1049711,.0172901,.0059834,.0045256,.0039858,.0036316,.0035388,.003048,.0029331,.0024074,.0025647,.0024391,.0020912,.0018565,.0022511,.0020288,.0018316,.0016913,.0015208,.0014905,.0014174,.0015873,.0016795,.0014376,.0012828,9072e-7,8462e-7,8299e-7,8723e-7,8148e-7,175e-6,0,0];\nconst Vk=[[650,1400,2600],[450,1900,2800],[300,2300,3e3],[450,900,2500],[300,700,2400]];\nconst xd=Math.PI*2;\n",A3e.toString()+'\n',"\n",x3e.toString()+'\n',"\n",M3e.toString()+'\n',"\n/* Combination DSP keeps donor PCM intact; only the synthetic stem is spectrally shaped. */\n/* Combination DSP keeps donor PCM intact; only the synthetic stem is spectrally shaped. */\n","const __F352DSP=("+__f347CeciliaDSPFactory.toString()+")();\n","\n\n/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.\n * No second peak tracker, chord inference, autonomous vibrato or attack envelope.\n */\n/* Cecilia's proven vocal oscillator, driven directly by the common carrier plan.\n * No second peak tracker, chord inference, autonomous vibrato or attack envelope.\n */\n",__f352RenderCecilia.toString()+'\n',"\n\n","const __F352DSPOriginal=("+__f347OriginalCeciliaDSPFactory.toString()+")();\n","\n",__f352RenderCeciliaOriginal.toString()+'\n',"\n\nconst __f352Cancelled=new Set();let __f352WorkerQueue=Promise.resolve();\nself.onmessage=event=>{const message=event.data;if(message.cancel!=null){__f352Cancelled.add(message.cancel);return;}\n __f352WorkerQueue=__f352WorkerQueue.catch(()=>{}).then(async()=>{const {id,stage,job,input}=message;\n  const options={isCancelled:()=>__f352Cancelled.has(id),onProgress:progress=>postMessage({id,progress})};\n  try{if(options.isCancelled())throw new DOMException('Offline-Berechnung abgebrochen.','AbortError');let value;\n   if(stage==='synthetic')value=await (job.recipe?.variantRevision==='original'?__f352RenderCeciliaOriginal:__f352RenderCecilia)(job,{material:input.material},options);\n   else if(stage==='combine'){\n    // Use the same mask semantics as the main carrier owner; no function crosses threads.\n    const bands=job.support.plan.bands;job.support.activeAt=(at,length)=>bands.some(b=>b.gainCurve[Math.round(at/Math.max(1,length-1)*(b.gainCurve.length-1))]>0);\n    value=await (job.recipe?.variantRevision==='original'?__F352DSPOriginal:__F352DSP).combine(job,input.donor,input.synthetic,options);\n   }else if(stage==='spectrum')value=await __F352DSP.spectrum(input.pcm,job.sampleRate,options);\n   else throw Error('Unbekannter Offline-Auftrag.');\n   if(options.isCancelled())throw new DOMException('Offline-Berechnung abgebrochen.','AbortError');postMessage({id,value},value.pcm?.buffer?[value.pcm.buffer]:value.values?.buffer?[value.values.buffer]:[]);\n  }catch(e){postMessage({id,error:String(e.message??e),name:e.name});}finally{__f352Cancelled.delete(id);}\n });\n};\n"].join('');