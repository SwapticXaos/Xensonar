
const __F35634Default=()=>({schema:'xensonar-dual-donor-ui-v2',revision:'revised',name:'Untitled sound crossing',sources:{A:{kind:'active',id:null,label:'Current Forge donor',revision:null},B:null},regions:[],links:[],operation:'cross',imprintDirection:'A_to_B',remainder:'undecided',updatedAt:0});
function __f35634Clean(data){
 const base=__F35634Default();if(!data||!['xensonar-dual-donor-ui-v1',base.schema].includes(data.schema))return base;
 const cleanSource=s=>s&&['active','library','file'].includes(s.kind)?{kind:s.kind,id:typeof s.id==='string'?s.id:null,label:String(s.label||'Donor').slice(0,140),revision:typeof s.revision==='string'?s.revision.slice(0,110):null}:null;
 const regions=(Array.isArray(data.regions)?data.regions:[]).slice(0,48).filter(r=>r&&['A','B'].includes(r.slot)&&typeof r.id==='string').map(r=>({id:r.id.slice(0,64),slot:r.slot,x0:__F341Workbench.clamp(Number(r.x0),0,1),x1:__F341Workbench.clamp(Number(r.x1),0,1),y0:__F341Workbench.clamp(Number(r.y0),0,1),y1:__F341Workbench.clamp(Number(r.y1),0,1),feature:['all','resonance','texture','motion'].includes(r.feature)?r.feature:'all'})).filter(r=>r.x1>r.x0&&r.y1>r.y0);
 const ids=new Set(regions.map(r=>r.id));const links=(Array.isArray(data.links)?data.links:[]).slice(0,48).filter(l=>l&&ids.has(l.a)&&ids.has(l.b)&&regions.some(r=>r.id===l.a&&r.slot==='A')&&regions.some(r=>r.id===l.b&&r.slot==='B')).map(l=>({id:String(l.id||'link').slice(0,64),a:l.a,b:l.b,mode:['cross','imprint','interlock'].includes(l.mode)?l.mode:'cross',direction:['A_to_B','B_to_A'].includes(l.direction)?l.direction:null}));
 return {revision:data.revision === "original" ? "original" : "revised",schema:base.schema,name:String(data.name||base.name).slice(0,100),sources:{A:cleanSource(data.sources?.A),B:cleanSource(data.sources?.B)},regions,links,operation:['cross','imprint','interlock'].includes(data.operation)?data.operation:'cross',imprintDirection:['A_to_B','B_to_A'].includes(data.imprintDirection)?data.imprintDirection:'A_to_B',remainder:['undecided','linked_only','keep_A','keep_B'].includes(data.remainder)?data.remainder:'undecided',updatedAt:Number(data.updatedAt)||0};
}
function __f35634Load(){try{return __f35634Clean(JSON.parse(localStorage.getItem(__F35634Key)||localStorage.getItem(__F35634LegacyKey)||'null'))}catch{return __F35634Default()}}

// Identity is content based. WebCrypto is preferred; the full-byte FNV fallback is diagnostic,
// not a security signature. Never use file name or lastModified as a content identity.
async function __f35635Digest(bufferLike){
 const bytes=bufferLike instanceof Uint8Array?bufferLike:new Uint8Array(bufferLike.buffer||bufferLike,bufferLike.byteOffset||0,bufferLike.byteLength||bufferLike.length);
 if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);return 'sha256:'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
 let h=2166136261;for(let i=0;i<bytes.length;i++){h^=bytes[i];h=Math.imul(h,16777619)}return 'fnv32:'+bytes.length+':'+(h>>>0).toString(16);
}
async function __f35635PCMRevision(pcm){
 const raw=new Uint8Array(pcm.samples.buffer,pcm.samples.byteOffset,pcm.samples.byteLength);
 return (await __f35635Digest(raw))+':'+pcm.sampleRate+':'+pcm.samples.length;
}

const __f35635FeatureName={all:'Sound character',resonance:'Resonances',texture:'Texture',motion:'Motion'};
// Deterministic first-hear recipe follows the selected method; existing marks survive.
// Never mutate a manual blueprint or infer its intended property-to-property links.
/* F3.56.46: editable draft and completed-render provenance have separate owners. */
function __f35646CarrierStamp(s){
 return [s.renderVersion,s.spectralData,s.materialExport,s.viewPort,s.activeTool,s.toolProfiles,s.synthMode,s.waveformMix,s.colorMapName,s.showGrainLayer,s.logScale,s.stampScaleX,s.stampScaleY,s.stampRotation,s.stampFlipX,s.stampFlipY,s.carrierIntegralSelection,s.carrierIntegralSynthLab,s.carrierIntegralHarmonicXplore];
}
function __f35646DraftSaver(capture,write,onState=()=>{},delay=300){
 let timer=null,pending=false,closed=false,queue=Promise.resolve();
 function flush(){
  clearTimeout(timer);timer=null;if(!pending)return queue;pending=false;
  let value;try{value=capture();}catch(e){onState(false,e);return queue;}if(!value)return queue;
  queue=queue.catch(()=>{}).then(()=>write(value)).then(()=>onState(true),e=>onState(false,e));return queue;
 }
 return Object.freeze({schedule(){if(closed)return;pending=true;clearTimeout(timer);timer=setTimeout(flush,delay);},flush,close(){if(closed)return queue;closed=true;return flush();}});
}

function __f35637AutomaticRecipe(plan,sources){
 if(!sources?.A?.revision||!sources?.B?.revision)throw Error('Load both original recordings first.');
 if(plan.links?.length)return __f35634Clean(plan);
 const mode=['cross','imprint','interlock'].includes(plan.operation)?plan.operation:'cross';
 const direction=mode==='imprint'?(plan.imprintDirection==='B_to_A'?'B_to_A':'A_to_B'):null;
 const regions=[...(plan.regions??[])],ids={};
 for(const slot of ['A','B']){
  const id='auto-'+slot;ids[slot]=id;
  if(!regions.some(r=>r.id===id)&&regions.filter(r=>r.slot===slot).length>=24)throw Error('Donor '+slot+' already has 24 marks. Connect your existing regions or remove a mark before automatic creation.');
  if(!regions.some(r=>r.id===id))regions.push({id,slot,x0:0,x1:1,y0:0,y1:1,feature:'all'});
 }
 const recipe={...plan,sources:{...plan.sources,A:{...plan.sources.A,revision:sources.A.revision},B:{...plan.sources.B,revision:sources.B.revision}},
   regions,links:[{id:'auto-pair-1',a:ids.A,b:ids.B,mode,direction}],
   remainder:'linked_only',operation:mode,revision:plan.revision,updatedAt:Date.now()};
 return __f35634Clean(recipe);
}


function __f35634PCM(asset,start=0,duration=null){
 const pcm=asset?.monoSamples?.length?asset.monoSamples:asset?.leftSamples?.length?asset.leftSamples:null;
 const sampleRate=Number(asset?.sampleRate)||0;
 if(!pcm||!sampleRate||sampleRate<8000)throw new Error('This source has no readable PCM.');
 const first=Math.max(0,Math.min(pcm.length-1,Math.floor(Number(start||0)*sampleRate)));
 const count=Math.min(pcm.length-first,Math.floor(Math.max(.025,Math.min(60,Number(duration)||60))*sampleRate));
 if(count<256)throw new Error('The saved selection contains too little audio.');
 return {samples:pcm.subarray(first,first+count),sampleRate,duration:count/sampleRate,originalDuration:pcm.length/sampleRate,truncated:Number(duration)>60||pcm.length-first>count+1};
}
function __f35634CurrentPCM(source){if(!source)return null;return __f35634PCM(source,source.importStartSec??0,source.importDurationSec??60)}
function __f35634Freq(yy,sampleRate){return 35*Math.pow(sampleRate*.46/35,1-yy)}
function __f35634RegionText(r,src){
 if(!src)return 'Source unavailable';const t0=r.x0*src.duration,t1=r.x1*src.duration;
 const high=__f35634Freq(r.y0,src.sampleRate),low=__f35634Freq(r.y1,src.sampleRate);
 const hz=f=>f>=1000?(f/1000).toFixed(1)+'k':Math.round(f)+'Hz';
 return t0.toFixed(2)+'–'+t1.toFixed(2)+'s · '+hz(low)+'–'+hz(high);
}
function __F35634Spectrum({slot,source,regions,selected,onPick,onAdd,feature,links,activeLink,editable=true,scanProgress=null}){
 const canvas=P.useRef(null),draw=P.useRef(null),[heat,setHeat]=P.useState(null),[draft,setDraft]=P.useState(null),drag=P.useRef(null),[analysisState,setAnalysisState]=P.useState('');
 P.useEffect(()=>{let disposed=false;setHeat(null);setAnalysisState(source?'Preparing spectrum…':'Choose a source to view its real spectrum.');if(!source)return;
 __f341Spectrogram(source.samples,source.sampleRate,()=>disposed).then(h=>{if(!disposed){setHeat(h);setAnalysisState(h?'':'Spectrum unavailable.')}}).catch(e=>{if(!disposed)setAnalysisState('Spectrum: '+(e.message||e))});return()=>{disposed=true};},[source]);
 const paint=()=>{const c=canvas.current;if(!c)return;const w=c.clientWidth||600,h=c.clientHeight||250,ratio=Math.min(2,window.devicePixelRatio||1);c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.fillStyle='#07111e';ctx.fillRect(0,0,w,h);const g={left:45,top:8,width:Math.max(50,w-57),height:Math.max(60,h-34)};draw.current=g;
 if(heat)__f341Heatmap(ctx,heat,g.left,g.top,g.width,g.height);
 else{ctx.fillStyle='#101e30';ctx.fillRect(g.left,g.top,g.width,g.height);ctx.fillStyle='#7790a9';ctx.font='12px system-ui';ctx.fillText(analysisState||'Awaiting source',g.left+18,g.top+g.height/2);}
 ctx.lineWidth=1;ctx.font='10px system-ui';ctx.textBaseline='middle';
 for(const f of [100,500,2000,8000]){if(!source||f>=source.sampleRate*.46)continue;const y=g.top+g.height*(1-Math.log(f/35)/Math.log(source.sampleRate*.46/35));ctx.strokeStyle='#ffffff15';ctx.beginPath();ctx.moveTo(g.left,y);ctx.lineTo(g.left+g.width,y);ctx.stroke();ctx.fillStyle='#90a7bf';ctx.textAlign='right';ctx.fillText(f>=1000?(f/1000)+'k':String(f),g.left-6,y);}
 for(let i=0;i<=4;i++){const x=g.left+g.width*i/4;ctx.strokeStyle='#ffffff14';ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.top+g.height);ctx.stroke();ctx.fillStyle='#8ca9c1';ctx.textAlign='center';ctx.fillText(source?(source.duration*i/4).toFixed(1)+'s':(i*25)+'%',x,h-12);}
 const fill=slot==='A'?'rgba(62,220,195,.23)':'rgba(249,165,104,.22)',stroke=slot==='A'?'#61ead5':'#ffbb83';
 const box=(r,active=false,provisional=false)=>{const x=g.left+r.x0*g.width,y=g.top+r.y0*g.height,bw=(r.x1-r.x0)*g.width,bh=(r.y1-r.y0)*g.height;
 const involved=links.some(l=>(slot==='A'?l.a:l.b)===r.id&&l.id===activeLink);ctx.fillStyle=fill;ctx.fillRect(x,y,bw,bh);ctx.lineWidth=involved?3.5:active?2.5:1.5;ctx.strokeStyle=involved?'#f6ffbd':stroke;ctx.setLineDash(provisional?[5,4]:[]);ctx.strokeRect(x,y,bw,bh);ctx.setLineDash([]);};
 regions.filter(r=>editable||!String(r.id).startsWith('auto-')).forEach(r=>{box(r,r.id===selected,false);const indices=links.map((l,i)=>((slot==='A'?l.a:l.b)===r.id?String(i+1).padStart(2,'0'):null)).filter(Boolean);if(indices.length){const x=g.left+r.x0*g.width,y=g.top+r.y0*g.height,txt=indices.join(' · ');ctx.font='bold 11px system-ui';const tw=ctx.measureText(txt).width+13;ctx.fillStyle=links.some(l=>l.id===activeLink&&(slot==='A'?l.a:l.b)===r.id)?'#f3e8a0':'#122837';ctx.fillRect(x+2,y+2,tw,19);ctx.fillStyle=links.some(l=>l.id===activeLink&&(slot==='A'?l.a:l.b)===r.id)?'#1b1b20':'#e4fffc';ctx.fillText(txt,x+8,y+15);}});if(draft)box(draft,true,true);
 if(scanProgress!=null&&source){const x=g.left+g.width*Math.max(0,Math.min(1,scanProgress));ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.top+g.height);ctx.strokeStyle='#e9f1bb';ctx.lineWidth=2;ctx.stroke();}
 ctx.textAlign='left';ctx.textBaseline='alphabetic';};
 P.useEffect(()=>{paint();const obs=typeof ResizeObserver==='function'?new ResizeObserver(()=>paint()):null;if(canvas.current)obs?.observe(canvas.current);return()=>obs?.disconnect()},[heat,source,regions,selected,draft,analysisState,links,activeLink,scanProgress,editable]);
 const point=e=>{const g=draw.current,c=canvas.current;if(!g||!c)return null;const b=c.getBoundingClientRect(),x=(e.clientX-b.left-g.left)/g.width,y=(e.clientY-b.top-g.top)/g.height;return{x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))}};
 const down=e=>{if(!source||!editable||e.button!==0)return;const p=point(e);if(!p)return;drag.current=p;e.currentTarget.setPointerCapture(e.pointerId);setDraft(null);};
 const move=e=>{if(!drag.current)return;const p=point(e);if(!p)return;setDraft({x0:Math.min(p.x,drag.current.x),x1:Math.max(p.x,drag.current.x),y0:Math.min(p.y,drag.current.y),y1:Math.max(p.y,drag.current.y)});};
 const up=e=>{if(!drag.current)return;const p=point(e);const start=drag.current;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setDraft(null);if(!p)return;
 const box={x0:Math.min(p.x,start.x),x1:Math.max(p.x,start.x),y0:Math.min(p.y,start.y),y1:Math.max(p.y,start.y)};
 if(box.x1-box.x0<.015||box.y1-box.y0<.025){const hit=[...regions].reverse().find(r=>p.x>=r.x0&&p.x<=r.x1&&p.y>=r.y0&&p.y<=r.y1);if(hit)onPick(hit.id);return;}onAdd({...box,feature});};
 return u.jsxs('div',{className:'f35634-spectrum',children:[u.jsx('canvas',{ref:canvas,'aria-label':`Donor ${slot} · logarithmic time-frequency spectrum; draw a rectangle with mouse or touch`,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{drag.current=null;setDraft(null)},style:{touchAction:'none'},tabIndex:0}),u.jsxs('div',{className:'f35634-spectrum-caption',children:[u.jsx('span',{children:'VERTICAL: HIGH ↑ / LOW ↓ · HORIZONTAL: TIME →'}),u.jsx('span',{role:'status',children:analysisState})]})]});
}

function __F35635NumericMark({slot,source,feature,onAdd,disabled}){
 const [t0,setT0]=P.useState('0'),[t1,setT1]=P.useState('0.4'),[f0,setF0]=P.useState('140'),[f1,setF1]=P.useState('1600'),[err,setErr]=P.useState('');
 const create=()=>{if(!source||disabled)return;const first=Number(t0),last=Number(t1),low=Number(f0),high=Number(f1),nyquist=source.sampleRate*.46;
 if(!(first>=0&&last>first&&last<=source.duration&&low>=35&&high>low&&high<=nyquist)){setErr('Time or frequency is outside the selected audio.');return}
 const y=f=>1-Math.log(f/35)/Math.log(nyquist/35);setErr('');onAdd({x0:first/source.duration,x1:last/source.duration,y0:y(high),y1:y(low),feature});};
 return u.jsxs('details',{className:'f35635-numeric',children:[u.jsx('summary',{children:'Mark by numbers / keyboard'}),u.jsxs('div',{className:'f35635-numeric-fields',children:[u.jsx('label',{children:['From (s)',u.jsx('input',{type:'number',min:0,step:'.01',value:t0,onChange:e=>setT0(e.currentTarget.value)})]}),u.jsx('label',{children:['To (s)',u.jsx('input',{type:'number',min:0,step:'.01',value:t1,onChange:e=>setT1(e.currentTarget.value)})]}),u.jsx('label',{children:['Low (Hz)',u.jsx('input',{type:'number',min:35,step:1,value:f0,onChange:e=>setF0(e.currentTarget.value)})]}),u.jsx('label',{children:['High (Hz)',u.jsx('input',{type:'number',min:35,step:1,value:f1,onChange:e=>setF1(e.currentTarget.value)})]}),u.jsx('button',{type:'button',disabled:!source||disabled,onClick:create,children:'Add region'})]}),err?u.jsx('p',{role:'alert',children:err}):null]});
}

function __F35634DualWorkbench({activeSource,visible=true}){
 const [plan,setPlan]=P.useState(__f35634Load),[library,setLibrary]=P.useState([]),[fetchError,setFetchError]=P.useState(''),[notice,setNotice]=P.useState(''),[sources,setSources]=P.useState({A:null,B:null}),[loading,setLoading]=P.useState({A:false,B:false}),[feature,setFeature]=P.useState({A:'all',B:'all'}),[selected,setSelected]=P.useState({A:null,B:null});
 const [refreshLibrary,setRefreshLibrary]=P.useState(0),[saved,setSaved]=P.useState(true),[activeLink,setActiveLink]=P.useState(null),[audition,setAudition]=P.useState(null),[advanced,setAdvanced]=P.useState(false);
 const fileA=P.useRef(null),fileB=P.useRef(null),importRef=P.useRef(null),tokens=P.useRef({A:0,B:0}),intentEpoch=P.useRef(0),active=P.useRef(true),resolved=P.useRef({A:null,B:null}),sessionAudio=P.useRef(new Map()),preview=P.useRef({ctx:null,node:null,gain:null,token:0}),buffers=P.useRef(new WeakMap());
/* Added inside the existing DualWorkbench. Shared epoch protects render, import and activation. */
 const [body,setBody]=P.useState(null),[bodySettings,setBodySettings]=P.useState({duration:2,strength:.8}),[bodyJob,setBodyJob]=P.useState({busy:false,progress:0,label:''}),[audioSaved,setAudioSaved]=P.useState(''),[savedFigure,setSavedFigure]=P.useState(null),[savedWorkbench,setSavedWorkbench]=P.useState(null),[savedCombination,setSavedCombination]=P.useState(null);
 const [hydrated,setHydrated]=P.useState(false),[renderContext,setRenderContext]=P.useState(null);
 const [transferredKey,setTransferredKey]=P.useState(null),[actionFeedback,setActionFeedback]=P.useState(null),[carrierPreviewBusy,setCarrierPreviewBusy]=P.useState(false);
 const latest=P.useRef(null),persist=P.useRef(null),pendingCarrier=P.useRef(null),restoreEpoch=P.useRef(0);
 latest.current={plan,sources,body,bodySettings,renderContext};
 const autoHearKey=P.useRef(null),bodyEpoch=P.useRef(0),bodyCapture=P.useRef(null),sessionImport=P.useRef(null),bodyRestore=P.useRef(false),bodySession=P.useRef(null);
 let bodyKey='',bodyProblem='';try{bodyKey=__F35636DualDSP.key(plan,sources,bodySettings)}catch(e){bodyProblem=e.message}
 const bodyCurrent=!!body&&body.manifest.key===bodyKey,bodyRef=P.useRef(null);bodyRef.current=body;
 const transferReady=bodyCurrent&&transferredKey===bodyKey;const feedback=actionFeedback?.key===bodyKey?actionFeedback:null;
 const reportAction=(kind,text)=>{setActionFeedback({key:bodyKey,kind,text});setNotice(text);};
 P.useEffect(()=>{if(bodyCapture.current&&(bodyCapture.current.key!==bodyKey||!visible)){bodyEpoch.current++;bodyCapture.current=null;setBodyJob({busy:false,progress:0,label:''});}preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);},[bodyKey,visible]);
 P.useEffect(()=>{
  let live=true;const ticket=++restoreEpoch.current,initial=latest.current,initialPlan=initial.plan,initialCarrier=__f35646CarrierStamp(pe.getState());
  const initialWorkbench=__F341Workbench.getSnapshot(),initialCombination=__F352Session.getSnapshot();
  bodyRestore.current=false;
  __F35636DualStore.read().then(value=>{
    if(!live||ticket!==restoreEpoch.current||!value||latest.current.plan!==initialPlan)return;
    const clean=__f35634Clean(value.plan),same=['A','B'].every(slot=>clean.sources[slot]?.revision===initialPlan.sources[slot]?.revision&&clean.sources[slot]?.id===initialPlan.sources[slot]?.id);
    if(!same)return;
    for(const slot of ['A','B'])if(clean.sources[slot]?.kind==='file'&&value.sources?.[slot]){sessionAudio.current.set(clean.sources[slot].id,value.sources[slot]);setSources(s=>({...s,[slot]:value.sources[slot]}));}
    if(value.settings&&latest.current.bodySettings===initial.bodySettings)setBodySettings(value.settings);if(value.result&&latest.current.body===initial.body)setBody(value.result);
    if(value.carrier){setSavedFigure(value.carrier);if(!__f35646CarrierStamp(pe.getState()).some((v,i)=>v!==initialCarrier[i]))pendingCarrier.current=value.carrier;}
    if(value.workbench){setSavedWorkbench(value.workbench);if(__F341Workbench.getSnapshot()===initialWorkbench)__F341Workbench.restore(value.workbench);}
    if(value.combination){setSavedCombination(value.combination);if(__F352Session.getSnapshot()===initialCombination)__F352Session.restore(value.combination);}
    setRenderContext(value.renderContext??null);setAudioSaved('Original audio and editable experiment restored.');
  }).catch(()=>{if(live)setAudioSaved('Audio storage unavailable · export a complete session to keep the recordings.');}).finally(()=>{
    if(live&&ticket===restoreEpoch.current){bodyRestore.current=true;setHydrated(true);}
  });return()=>{live=false;};
 },[]);
 const captureFigure=()=>{const s=pe.getState(),snapshot=s.createProjectSnapshot();return {...snapshot,spectralSnapshot:snapshot.spectralSnapshot.slice(),donorWorkbench:null};};
 const captureDraft=()=>{
  const v=latest.current;
  if(!['A','B'].some(slot=>v.sources[slot])||['A','B'].some(slot=>v.sources[slot]?v.plan.sources[slot]?.revision!==v.sources[slot].revision:!!v.plan.sources[slot]?.revision))return null;
  return {schema:'xensonar-dual-donor-session-v2',stateContractVersion:3,plan:v.plan,sources:v.sources,settings:v.bodySettings,result:v.body,
    carrier:pendingCarrier.current??captureFigure(),workbench:__F341Workbench.export(),combination:__F352Session.export(),renderContext:v.renderContext};
 };
 const experiment=()=>captureDraft();
 P.useEffect(()=>{
  if(!hydrated)return;let live=true;
  const saver=__f35646DraftSaver(captureDraft,__F35636DualStore.write,(ok)=>{if(live)setAudioSaved(ok?'Original recordings and current experiment saved in this browser.':'Audio storage unavailable · export a complete session.');});
  persist.current=saver;let stamp=__f35646CarrierStamp(pe.getState());
  const schedule=()=>saver.schedule(),unsubWorkbench=__F341Workbench.subscribe(schedule),unsubCombination=__F352Session.subscribe(schedule);
  const unsubCarrier=pe.subscribe(()=>{const next=__f35646CarrierStamp(pe.getState());if(next.some((v,i)=>v!==stamp[i])){stamp=next;pendingCarrier.current=null;schedule();}});
  const flush=()=>void saver.flush();window.addEventListener('pagehide',flush);schedule();
  return()=>{live=false;unsubWorkbench();unsubCombination();unsubCarrier();window.removeEventListener('pagehide',flush);if(persist.current===saver)persist.current=null;void saver.close();};
 },[hydrated]);
 P.useEffect(()=>{persist.current?.schedule();},[plan,sources,body,bodySettings,renderContext]);
 P.useEffect(()=>()=>{bodyEpoch.current++;},[]);
 const cancelBody=()=>{intentEpoch.current++;bodyCapture.current=null;autoHearKey.current=null;bodyEpoch.current++;setBodyJob({busy:false,progress:0,label:''});stopPreview();};
 const synthesize=async(recipe=plan,settings=bodySettings,hearWhenReady=false)=>{stopPreview();const ticket=++bodyEpoch.current,figure=pendingCarrier.current??captureFigure(),context={workbench:__F341Workbench.export(),combination:__F352Session.export()};let key='';try{key=__F35636DualDSP.key(recipe,sources,settings)}catch(e){setNotice(e.message);return;}
  autoHearKey.current=hearWhenReady?key:null;
  bodyCapture.current={key,ticket,recipe};setBodyJob({busy:true,progress:0,label:'Building shared sound body…'});setNotice('');
  try{const next=await __F35636DualWorker.render(recipe,sources,settings,{isCancelled:()=>!active.current||ticket!==bodyEpoch.current,onProgress:p=>{if(active.current&&ticket===bodyEpoch.current)setBodyJob({busy:true,progress:p,label:'Building shared sound body…'});}});
    next.revision=await __f35635PCMRevision(next);if(!active.current||ticket!==bodyEpoch.current||next.manifest.key!==key)return;
    setBody(next);setRenderContext(context);setSavedFigure(figure);setSavedWorkbench(context.workbench);setSavedCombination(context.combination);setNotice('Hybrid ready. Play it, keep it, or hear how your painted Carrier shapes it.');
  }catch(e){if(active.current&&ticket===bodyEpoch.current&&e.name!=='AbortError')setNotice('Synthesis: '+e.message);}
  finally{if(bodyCapture.current?.ticket===ticket)bodyCapture.current=null;
   if(active.current&&ticket===bodyEpoch.current)setBodyJob({busy:false,progress:1,label:''});}
 };
 const saveBody=async()=>{if(!bodyCurrent){setNotice('Render the current recipe before saving this donor.');return;}if(!body){setNotice('Create a hybrid before saving.');return;}const result=body,asset=__f35636Asset(result,plan.name),libraryEntry=__F35638DonorBridge.entryFromAsset(asset,plan.name);
  setNotice('Saving the completed hybrid to Donor Library…');try{await __DonorLibraryF36.donorLibrary.save(plan.name,'dual donor, articulation',{source:libraryEntry.source,selection:libraryEntry.selection,readMode:'hybrid',sourceAdapterId:'local-file'});
    window.dispatchEvent(new Event('xensonar:donor-library-changed'));setNotice('Hybrid saved as an independent donor in the Donor Library.');
  }catch(e){setNotice('Could not save in Donor Library: '+String(e.message||e).replace(/\.+$/,'')+'. You can still export the completed hybrid as WAV.');}
 };
 const useBody=async()=>{if(!bodyCurrent){setNotice('Render the current recipe before transferring this donor.');return;}if(!body)return;stopPreview();const result=body,epoch=++bodyEpoch.current,asset=__f35636Asset(result,plan.name),currentWorkbench=__F341Workbench.export(),currentCombination=__F352Session.export();let ticket=null,committed=false;
  bodyCapture.current={key:bodyKey,ticket:epoch,recipe:plan};
  setTransferredKey(null);setBodyJob({busy:true,progress:0,label:'Preparing donor for Forge…'});reportAction('info','Transferring hybrid to Forge…');
  try{for(const slot of ['A','B']){if(plan.sources[slot]?.kind==='active'&&sources[slot]){const id='file:captured:'+sources[slot].revision;sessionAudio.current.set(id,sources[slot]);change(p=>({...p,sources:{...p.sources,[slot]:{kind:'file',id,label:p.sources[slot].label+' (frozen)',revision:sources[slot].revision}}}));resolved.current[slot]=null;}}
    __F352Runtime.stop();ticket=Vt.beginReplacement(asset);const model=await kE(asset,()=>!active.current||bodyEpoch.current!==epoch||Vt.getSnapshot().generation!==ticket);
    if(!active.current||bodyEpoch.current!==epoch||Vt.getSnapshot().generation!==ticket)return;
    if(!Vt.commitExtraction(ticket,asset,model))throw Error('A newer donor action superseded this transfer.');committed=true;
    // Publish the newly prepared donor to the real Forge Material Intake owner as well.
    // The old implementation only updated the runtime/store; the old intake mask could
    // overwrite the transferred donor on the next ordinary Forge action.
    const forgeEntry=__F35638DonorBridge.entryFromAsset(asset,plan.name);
    const accepted=await new Promise(resolve=>{
      const request={entry:forgeEntry,handled:false,resolve:()=>resolve(true),reject:()=>resolve(false)};
      window.dispatchEvent(new CustomEvent('xensonar:forge:accept-prepared-donor',{detail:request}));
      if(!request.handled)resolve(false);
    });
    if(!active.current||epoch!==bodyEpoch.current||Vt.getSnapshot().generation!==ticket)return;
    if(!accepted){try{F6e('spectral-forge3',{...forgeEntry,repairResult:null,status:'Hybrid donor transferred to Forge.'});}catch{/* Opaque test contexts disallow browser storage; the live donor is still prepared. */}}
    pe.getState().setSpectralEmbodimentSourceAsset(asset);__F341Workbench.sourceChanged(asset);__F341Workbench.preset('gestalt-articulation');__F352Session.patch({enabled:false});
    if(currentWorkbench?.params?.gestaltMode==='articulation'){__F341Workbench.restore({...currentWorkbench,sourceKey:__F341Workbench.sourceKey(asset)});__F352Session.restore(currentCombination);}
    setSavedWorkbench(__F341Workbench.export());setSavedCombination(__F352Session.export());
    if(!Vt.selectDonor())throw Error('Hybrid donor could not be activated.');pe.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
    setTransferredKey(bodyKey);
    reportAction('success','✓ Hybrid transferred to Forge · Ready in Audio Import Rack. Return to Forge to inspect it, or hear it in your Carrier here.');
  }catch(e){if(!committed&&ticket!=null&&Vt.getSnapshot().generation===ticket)Vt.failExtraction(ticket,e);if(active.current&&epoch===bodyEpoch.current&&e.name!=='AbortError')reportAction('error','Transfer failed: '+e.message);}
  finally{if(bodyCapture.current?.ticket===epoch)bodyCapture.current=null;if(active.current&&epoch===bodyEpoch.current)setBodyJob({busy:false,progress:1,label:''});}
 };
 const hearHybridInCarrier=async()=>{
  if(!transferReady){reportAction('info','Use Hybrid in Forge first, then preview it in the Carrier.');return;}
  const s=pe.getState(),grid=s.spectralData?.data;
  if(!grid?.some?.(v=>v>.0001)){reportAction('info','✓ Hybrid is in Forge. Your Carrier drawing is empty. Draw a figure in Spectral Forge before playing it.');return;}
  setCarrierPreviewBusy(true);reportAction('info','Playing the transferred hybrid through your painted Carrier…');
  try{await LU(s.spectralData,Zp(s.materialExport.bars,s.materialExport.bpm,s.materialExport.beatsPerBar),{loopPreview:s.materialExport.loopPreview});
    reportAction('success','▶ Carrier preview started with your transferred hybrid.');}
  catch(e){reportAction('error','Carrier preview failed: '+(e.message||e)+'. The hybrid remains available in Forge.');}
  finally{setCarrierPreviewBusy(false);}
 };
 const exportSession=async()=>{if(!sources.A||!sources.B){setNotice('Load both recordings before exporting a complete session.');return;}try{const value=experiment();__f35636Download(await __f35636SessionFile(value),plan.name+'.xds');setNotice('Complete session exported with both recordings, recipe and carrier figure.');}catch(e){setNotice('Session export: '+e.message);}};
 const importSession=async file=>{if(!file)return;cancelBody();const intent=++intentEpoch.current;tokens.current.A++;tokens.current.B++;setLoading({A:false,B:false});const epoch=++bodyEpoch.current;try{const value=await __f35636ReadSession(file);if(!active.current||epoch!==bodyEpoch.current||intent!==intentEpoch.current)return;
    for(const slot of ['A','B'])sessionAudio.current.set(value.plan.sources[slot].id,value.sources[slot]);resolved.current={A:null,B:null};tokens.current.A++;tokens.current.B++;
    pendingCarrier.current=value.carrier??null;setRenderContext(value.renderContext??null);if(value.workbench)__F341Workbench.restore(value.workbench);if(value.combination)__F352Session.restore(value.combination);
    setPlan(value.plan);setSources(value.sources);setBodySettings(value.settings??{duration:2,strength:.8});setBody(value.result);setSavedFigure(value.carrier??null);setSavedWorkbench(value.workbench??null);setSavedCombination(value.combination??null);setSelected({A:null,B:null});setActiveLink(null);
    setNotice('Complete session loaded. Use Restore saved figure when you want its exact carrier and tempo.');
  }catch(e){if(active.current&&epoch===bodyEpoch.current&&intent===intentEpoch.current)setNotice('Session import: '+e.message);}};
 const restoreFigure=()=>{if(!savedFigure)return;try{__F352Runtime.stop();__F341Workbench.withSnapshotRestore(()=>pe.getState().loadProjectSnapshot({...savedFigure,spectralSnapshot:new Float32Array(savedFigure.spectralSnapshot)}));if(savedWorkbench)__F341Workbench.restore(savedWorkbench);if(savedCombination)__F352Session.restore(savedCombination);setNotice('Saved carrier, bars, tempo and render settings restored.');}catch(e){setNotice('Figure restore: '+e.message);}};

 P.useEffect(()=>{active.current=true;return()=>{active.current=false;tokens.current.A++;tokens.current.B++;preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;void preview.current.ctx?.close().catch(()=>{});}},[]);
 P.useEffect(()=>{if(!visible){preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null)}},[visible]);
 const stopPreview=()=>{preview.current.token++;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);};
 const listen=async(slot,selectedOnly=false,provided=null)=>{if(!provided&&audition?.slot===slot&&audition?.selection===selectedOnly){stopPreview();return;}const source=slot==='result'?bodyRef.current:sources[slot];if(!source)return;const token=++preview.current.token;try{preview.current.node?.stop()}catch{}preview.current.node=null;setAudition(null);
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext unavailable');let ctx=preview.current.ctx;if(!ctx||ctx.state==='closed'){ctx=new AC();preview.current.ctx=ctx;buffers.current=new WeakMap();}await ctx.resume();if(token!==preview.current.token)return;
 let audioBuffer=buffers.current.get(source);if(!audioBuffer){audioBuffer=ctx.createBuffer(1,source.samples.length,source.sampleRate);audioBuffer.copyToChannel(source.samples,0);buffers.current.set(source,audioBuffer)}
 const region=selectedOnly?plan.regions.find(r=>r.id===selected[slot]&&r.slot===slot):null;if(selectedOnly&&!region)throw new Error('Select a marked region first');
 const from=region?region.x0*source.duration:0,to=region?region.x1*source.duration:source.duration;if(to-from<.01)throw new Error('Selection too short');
 const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=audioBuffer;gain.gain.value=.72;node.connect(gain);gain.connect(ctx.destination);node.onended=()=>{if(preview.current.node===node){preview.current.node=null;setAudition(null)}try{node.disconnect();gain.disconnect()}catch{}};preview.current.node=node;setAudition({slot,selection:selectedOnly});node.start(0,from,to-from);
 }catch(e){if(token===preview.current.token)setNotice('Audition: '+(e.message||e))}};

 P.useEffect(()=>{if(body&&bodyCurrent&&autoHearKey.current===bodyKey){autoHearKey.current=null;void listen('result',false,body);}},[body,bodyCurrent,bodyKey]);
 const autoReady=Boolean(sources.A&&sources.B&&['A','B'].every(slot=>plan.sources[slot]?.revision===sources[slot]?.revision));
 const autoBuild=()=>{if(!autoReady){setNotice('Load two recordings first.');return;}if(plan.links.length){void synthesize(plan,bodySettings,true);return;}let recipe;try{recipe=__f35637AutomaticRecipe(plan,sources);}catch(e){setNotice(e.message);return;}
 setPlan(recipe);setSelected({A:'auto-A',B:'auto-B'});setActiveLink(recipe.links[0].id);void synthesize(recipe,bodySettings,true);};
 const change=fn=>{intentEpoch.current++;setPlan(current=>{const next=__f35634Clean({...fn(current),updatedAt:Date.now()});return next});};
 P.useEffect(()=>{try{localStorage.setItem(__F35634Key,JSON.stringify(plan));setSaved(true)}catch{setSaved(false)}},[plan]);
 P.useEffect(()=>{let live=true;const read=()=>__DonorLibraryF36.donorLibrary.list().then(items=>{if(live){setLibrary(items);setFetchError('');setRefreshLibrary(n=>n+1)}}).catch(e=>{if(live)setFetchError('Library unavailable: '+(e.message||e))});void read();window.addEventListener('xensonar:donor-library-changed',read);return()=>{live=false;window.removeEventListener('xensonar:donor-library-changed',read)}},[]);
 P.useEffect(()=>{for(const slot of ['A','B']){
 const descriptor=plan.sources[slot],key=descriptor?(descriptor.kind+':'+descriptor.id+(descriptor.kind==='library'?':'+refreshLibrary:'')):'empty';
 if(resolved.current[slot]?.key===key&&(descriptor?.kind!=='active'||resolved.current[slot]?.source===activeSource))continue;
 resolved.current[slot]={key,source:activeSource};
 const ticket=++tokens.current[slot];
 if(descriptor?.kind!=='file')setSources(old=>({...old,[slot]:null}));
 if(!descriptor){setLoading(old=>({...old,[slot]:false}));continue}
 if(descriptor.kind==='file'){const remembered=sessionAudio.current.get(descriptor.id);if(remembered)setSources(old=>({...old,[slot]:remembered}));setLoading(old=>({...old,[slot]:false}));continue}
 setLoading(old=>({...old,[slot]:true}));
 (async()=>{try{let pcm;if(descriptor.kind==='active')pcm=__f35634CurrentPCM(activeSource);else{const entry=await __DonorLibraryF36.donorLibrary.load(descriptor.id);const a=entry.source?.sourceAsset;const region=entry.selection?.fineLoopRange;pcm=__f35634PCM(a,region?.startSec??0,region?.durationSec??60)}
 if(!active.current||tokens.current[slot]!==ticket)return;
 if(pcm){pcm.revision=await __f35635PCMRevision(pcm);if(!active.current||tokens.current[slot]!==ticket)return;}
 setSources(old=>({...old,[slot]:pcm}));
 if(pcm&&!plan.regions.some(r=>r.slot===slot)&&descriptor.revision!==pcm.revision)change(p=>({...p,sources:{...p.sources,[slot]:{...p.sources[slot],revision:pcm.revision}}}));
 if(!pcm)setNotice('The active Forge donor has not been extracted. Load a source first.');
 }catch(e){if(active.current&&tokens.current[slot]===ticket)setNotice('Donor '+slot+': '+(e.message||e))}
 finally{if(active.current&&tokens.current[slot]===ticket)setLoading(old=>({...old,[slot]:false}))}})();
 }},[plan.sources.A?.kind,plan.sources.A?.id,plan.sources.B?.kind,plan.sources.B?.id,activeSource,refreshLibrary]);
 const choose=(slot,kind,id,label)=>{stopPreview();tokens.current[slot]++;resolved.current[slot]=null;setSources(old=>({...old,[slot]:null}));setSelected(s=>({...s,[slot]:null}));setActiveLink(null);setNotice('');change(p=>{const removed=new Set(p.regions.filter(r=>r.slot===slot).map(r=>r.id));return {...p,sources:{...p.sources,[slot]:kind?{kind,id,label,revision:null}:null},regions:p.regions.filter(r=>r.slot!==slot),links:p.links.filter(l=>!removed.has(l.a)&&!removed.has(l.b))}})};
 const localFile=async(slot,file)=>{if(!file)return;intentEpoch.current++;const token=++tokens.current[slot];setLoading(x=>({...x,[slot]:true}));setNotice('');try{
 if(file.size>20000000)throw new Error('File exceeds 20 MB; please select a shorter recording.');
 const bytes=await file.arrayBuffer();const digest=await __f35635Digest(new Uint8Array(bytes));const decoder=new OfflineAudioContext(1,1,44100);const buffer=await decoder.decodeAudioData(bytes);const rate=buffer.sampleRate,channel=buffer.getChannelData(0),length=Math.min(channel.length,Math.floor(rate*60));const samples=new Float32Array(length);samples.set(channel.subarray(0,length));
 if(length<256)throw new Error('No readable sound samples.');
 if(!active.current||tokens.current[slot]!==token)return;
 const data={samples,sampleRate:rate,duration:length/rate,originalDuration:buffer.duration,truncated:buffer.duration>length/rate+0.01,revision:digest};
 setSources(s=>({...s,[slot]:data}));
 const audioId='file:'+digest;sessionAudio.current.set(audioId,data);stopPreview();
 change(p=>{const same=p.sources[slot]?.kind==='file'&&p.sources[slot]?.id===audioId;const legacy=!!(p.sources[slot]?.kind==='file'&&!p.sources[slot]?.revision&&p.regions.some(r=>r.slot===slot));const keep=same||legacy;return {...p,sources:{...p.sources,[slot]:{kind:'file',id:audioId,label:file.name,revision:legacy?'legacy:unverified':digest}},regions:keep?p.regions:p.regions.filter(r=>r.slot!==slot),links:keep?p.links:p.links.filter(l=>!p.regions.some(r=>r.slot===slot&&(r.id===l.a||r.id===l.b)))}});
 if(data.truncated)setNotice('Only the first 60 seconds are shown. Choose shorter source material to work beyond this window.');
 }catch(e){if(active.current&&tokens.current[slot]===token)setNotice('Cannot read file: '+(e.message||e))}finally{if(active.current&&tokens.current[slot]===token)setLoading(s=>({...s,[slot]:false}))}};
 const mismatched=slot=>Boolean(sources[slot]&&plan.regions.some(r=>r.slot===slot)&&plan.sources[slot]?.revision!==sources[slot]?.revision);
 const bindRevision=(slot,keep)=>{if(!sources[slot])return;stopPreview();change(p=>{const removed=new Set(keep?[]:p.regions.filter(r=>r.slot===slot).map(r=>r.id));return {...p,sources:{...p.sources,[slot]:{...p.sources[slot],revision:sources[slot].revision}},regions:p.regions.filter(r=>!removed.has(r.id)),links:p.links.filter(l=>!removed.has(l.a)&&!removed.has(l.b))}});setNotice(keep?'Marks deliberately reinterpreted against the current audio.':'Old marks cleared for the new audio.')};
 const add=(slot,box)=>{if(mismatched(slot)){setNotice('Confirm the new source revision before editing marks.');return;}
  const autoLink=plan.links.find(l=>['auto-cross-1','auto-pair-1'].includes(l.id)),autoId=autoLink?.[slot==='A'?'a':'b'];
  // First manual gesture refines the existing automatic Cross link instead of creating
  // a competing second sound layer or requiring the musician to reconnect regions.
  if(autoLink&&plan.regions.some(r=>r.id===autoId&&r.x0===0&&r.x1===1&&r.y0===0&&r.y1===1)&&plan.regions.filter(r=>r.slot===slot).length===1){
    change(p=>({...p,regions:p.regions.map(r=>r.id===autoId?{...r,...box}:r)}));setSelected(a=>({...a,[slot]:autoId}));setActiveLink(autoLink.id);setNotice('Automatic pair refined for Donor '+slot+'. The pair stays connected. Build the edited version when ready.');return;
  }
  if(plan.regions.filter(r=>r.slot===slot).length>=24){setNotice('24 marks per donor maximum. Remove a mark before adding another.');return;}const id=slot+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);change(p=>({...p,regions:[...p.regions,{id,slot,...box}]}));setSelected(a=>({...a,[slot]:id}));};
 const remove=id=>{change(p=>({...p,regions:p.regions.filter(r=>r.id!==id),links:p.links.filter(l=>l.a!==id&&l.b!==id)}));setSelected(s=>({A:s.A===id?null:s.A,B:s.B===id?null:s.B}));};
 const link=()=>{const a=selected.A,b=selected.B;if(!a||!b||mismatched('A')||mismatched('B'))return;const id='link-'+Date.now().toString(36);change(p=>({...p,remainder:p.remainder==='undecided'?'linked_only':p.remainder,links:[...p.links.filter(l=>l.a!==a||l.b!==b),{id,a,b,mode:p.operation,direction:p.operation==='imprint'?p.imprintDirection:null}]}));setActiveLink(id);setNotice('Regions connected. The main build action will use this relationship. Unlinked material remains excluded for now.');};
 const exportPlan=()=>{const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='XenSonar_Dual_Donor_Blueprint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const importPlan=async f=>{if(!f)return;cancelBody();const intent=++intentEpoch.current;tokens.current.A++;tokens.current.B++;setLoading({A:false,B:false});try{
 if(f.size>1000000)throw new Error('Blueprint is too large.');const parsed=JSON.parse(await f.text());if(!active.current||intent!==intentEpoch.current)return;
 if(!['xensonar-dual-donor-ui-v1','xensonar-dual-donor-ui-v2'].includes(parsed.schema))throw new Error('Not a supported Dual Donor blueprint.');
 const next=__f35634Clean(parsed);stopPreview();setSelected({A:null,B:null});setActiveLink(null);
 setSources(old=>({A:old.A?.revision===next.sources.A?.revision?old.A:sessionAudio.current.get(next.sources.A?.id)||null,B:old.B?.revision===next.sources.B?.revision?old.B:sessionAudio.current.get(next.sources.B?.id)||null}));resolved.current={A:null,B:null};setPlan(next);setNotice('Blueprint loaded. Audio already available in this session is reused; other sources can be reconnected.');
 }catch(e){if(active.current&&intent===intentEpoch.current)setNotice('Import failed: '+(e.message||e))}};
 const sourceCard=slot=>{const descriptor=plan.sources[slot],selectedRows=plan.regions.filter(r=>r.slot===slot),ready=!!sources[slot],stale=mismatched(slot),color=slot==='A'?'teal':'amber';return u.jsxs('article',{className:'f35634-source-card '+color,children:[
 u.jsxs('div',{className:'f35634-card-title',children:[u.jsxs('div',{children:[u.jsx('span',{className:'f35634-overline',children:'SOURCE '+slot}),u.jsx('h3',{children:slot==='A'?'Donor A · source identity':'Donor B · companion identity'})]}),u.jsx('span',{className:'f35634-state '+(ready?'ready':''),children:loading[slot]?'Loading…':ready?stale?'Source changed · marks need confirmation':'Spectrum ready':descriptor?.kind==='file'?'Reconnect audio':'Awaiting source'})]}),
 u.jsxs('div',{className:'f35634-source-picker',children:[u.jsx('select',{'aria-label':'Choose donor '+slot,value:descriptor?.kind==='library'?'lib:'+descriptor.id:descriptor?.kind==='active'?'active':descriptor?.kind==='file'?'file':'',onChange:e=>{const value=e.currentTarget.value;if(value==='active')choose(slot,'active',null,'Current Forge donor');else if(value.startsWith('lib:')){const id=value.slice(4),row=library.find(x=>x.id===id);choose(slot,'library',id,row?.name||'Saved donor')}else if(value==='file')slot==='A'?fileA.current?.click():fileB.current?.click();else choose(slot,null,null,'');},children:[u.jsx('option',{value:'',children:'Select sound source…'}),u.jsx('option',{value:'active',children:'Current Forge donor'}),descriptor?.kind==='file'?u.jsx('option',{value:'file',children:'Local file · '+descriptor.label}):null,...library.map(row=>u.jsx('option',{value:'lib:'+row.id,children:row.name+' · '+row.sourceLabel},row.id))]}),u.jsx('button',{type:'button',onClick:()=>slot==='A'?fileA.current?.click():fileB.current?.click(),children:'Import audio…'}),u.jsx('input',{ref:slot==='A'?fileA:fileB,type:'file',accept:'audio/*,.wav,.mp3,.ogg,.flac',hidden:true,onChange:e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void localFile(slot,f)}})]}),
 u.jsxs('div',{className:'f35634-source-caption',children:[u.jsx('strong',{children:descriptor?.label||'No donor selected'}),u.jsx('span',{children:ready?`${sources[slot].duration.toFixed(2)} s · ${sources[slot].sampleRate} Hz`:'Stored files from the Donor Library stay independent of active Forge audio.'})]}),
 u.jsxs('div',{className:'f35635-audition',children:[u.jsx('button',{type:'button',disabled:!ready,onClick:()=>void listen(slot,false),children:audition?.slot===slot&&!audition.selection?'■ Stop':'▶ Hear source'}),u.jsx('button',{type:'button',disabled:!ready||!selected[slot],onClick:()=>void listen(slot,true),children:audition?.slot===slot&&audition.selection?'■ Stop':'▶ Hear marked time'}),u.jsx('small',{children:'Dry source · time crop only; no spectral filtering'})]}),
 stale?u.jsxs('div',{className:'f35635-stale',role:'alert',children:[u.jsx('strong',{children:'Source audio changed. Old marks need explicit confirmation.'}),u.jsx('button',{type:'button',onClick:()=>bindRevision(slot,true),children:'Reinterpret old marks'}),u.jsx('button',{type:'button',onClick:()=>bindRevision(slot,false),children:'Clear old marks'})]}):null,
 u.jsxs('div',{className:'f35634-mark-controls',children:[u.jsx('span',{children:'Meaning'}),u.jsx('select',{'aria-label':'Feature of new '+slot+' area',value:feature[slot],onChange:e=>{const value=e.currentTarget.value;setFeature(s=>({...s,[slot]:value}))},children:[['all','Full sound character'],['resonance','Resonance / tonal body'],['texture','Texture / noise'],['motion','Temporal movement']].map(([v,label])=>u.jsx('option',{value:v,children:label},v))}),u.jsx('small',{title:'These labels express artistic intent. They do not claim automatic extraction of a sound feature.',children:'Select a time-frequency area · feature intent'})]}),
 u.jsx(__F35634Spectrum,{slot,source:sources[slot],regions:selectedRows,selected:selected[slot],feature:feature[slot],links:plan.links,activeLink,editable:true,scanProgress:bodyJob.busy?bodyJob.progress:null,onPick:id=>{setActiveLink(null);setSelected(s=>({...s,[slot]:id}))},onAdd:box=>add(slot,box)}),
 u.jsx(__F35635NumericMark,{slot,source:sources[slot],feature:feature[slot],onAdd:box=>add(slot,box),disabled:stale}),
 u.jsxs('div',{className:'f35634-region-heading',children:[u.jsx('strong',{children:'Marked regions'}),u.jsx('span',{children:selectedRows.length+' / 24'})]}),
 selectedRows.length?u.jsx('div',{className:'f35634-region-list',children:selectedRows.map((r,i)=>u.jsxs('div',{className:'f35634-region-row'+(selected[slot]===r.id?' chosen':''),children:[u.jsx('button',{type:'button','aria-pressed':selected[slot]===r.id,onClick:()=>setSelected(s=>({...s,[slot]:r.id})),children:(i+1)+'. '+__f35634RegionText(r,sources[slot])+(plan.links.some(l=>(slot==='A'?l.a:l.b)===r.id)?'  ↗ '+plan.links.map((l,j)=>(slot==='A'?l.a:l.b)===r.id?String(j+1).padStart(2,'0'):'').filter(Boolean).join(', '):'')}),u.jsx('select',{'aria-label':'Region '+(i+1)+' characteristic donor '+slot,value:r.feature,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,regions:p.regions.map(x=>x.id===r.id?{...x,feature:value}:x)}))},children:[['all','Full'],['resonance','Resonance'],['texture','Texture'],['motion','Motion']].map(([id,name])=>u.jsx('option',{value:id,children:name},id))}),u.jsx('button',{type:'button','aria-label':'Remove region '+(i+1)+' on donor '+slot,onClick:()=>remove(r.id),children:'×'})]},r.id))}):u.jsx('p',{className:'f35634-empty-regions',children:'No areas yet. Draw over the real spectrum to define source material.'}),
 ]});};
 const countA=plan.regions.filter(r=>r.slot==='A').length,countB=plan.regions.filter(r=>r.slot==='B').length,linked=plan.links.length;
 return u.jsxs('section',{id:'f35634-dual-panel',role:'tabpanel',className:'f35634-stage '+(advanced?'f35637-advanced':'f35637-easy'),style:{display:visible?'block':'none'},'data-f35634-dual-workshop':'true','aria-label':'Dual Donor Assembly',children:[
 u.jsxs('div',{className:'f35634-top',children:[u.jsxs('div',{children:[u.jsx('div',{className:'f35634-overline',children:'EXPERIMENTAL · DUAL DONOR + ARTICULATION'}),u.jsx('h2',{children:'Two sources. A new sound body.'}),u.jsx('p',{children:'Choose independent donors, select time-frequency material, then connect matching areas. Your marks define a shared spectral body. Hear the result, then explicitly give it to the carrier.'})]}),u.jsxs('div',{className:'f35635-steps',children:[u.jsx('span',{children:'01  Hear sources'}),u.jsx('span',{children:'02  Mark regions'}),u.jsx('span',{children:'03  Compose relationship'}),u.jsx('span',{children:'04  Build & hear Hybrid'})]})]}),
 u.jsxs('div',{className:'f35634-namebar',children:[u.jsxs('label',{children:['Hybrid name',u.jsx('input',{'aria-label':'Name hybrid donor',value:plan.name,maxLength:100,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,name:value}))}})]}),u.jsx('span',{className:'f35634-autosave',role:'status',children:saved?'Blueprint autosaved in this browser':'Browser storage unavailable · export JSON to keep your work'}),u.jsx('button',{type:'button',onClick:exportPlan,children:'Export blueprint ↓'}),u.jsx('button',{type:'button',onClick:()=>importRef.current?.click(),children:'Import blueprint ↑'}),u.jsx('input',{ref:importRef,type:'file',accept:'.json,application/json',hidden:true,onChange:e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void importPlan(f)}})]}),
 notice?u.jsx('p',{className:'f35634-notice',role:'status',children:notice}):null,fetchError?u.jsx('p',{className:'f35634-notice f35637-library-warning',role:'status',children:fetchError}):null,
 u.jsxs('div',{className:'f35634-source-grid f35642-source-grid',children:[sourceCard('A'),u.jsxs('div',{className:'f35642-region-bridge','aria-label':'Connect marked regions from both donors',children:[
    u.jsx('div',{className:'f35642-bridge-heading',children:'↔  CONNECT REGIONS'}),
    u.jsx('p',{className:'f35642-bridge-guide',role:'status',children:!selected.A?'① Select or draw a region in Donor A’s spectrum.':!selected.B?'② A is selected. Choose a region in Donor B.':'③ Both regions are selected. How should they interact?'}),
    u.jsxs('div',{className:'f35642-region-pair',children:[u.jsx('span',{children:'A · '+(selected.A?__f35635FeatureName[plan.regions.find(r=>r.id===selected.A)?.feature]||'Selected':'Select')}),u.jsx('span',{children:'↔'}),u.jsx('span',{children:'B · '+(selected.B?__f35635FeatureName[plan.regions.find(r=>r.id===selected.B)?.feature]||'Selected':'Select')})]}),
    u.jsxs('label',{children:['Method for new connection',u.jsx('select',{'aria-label':'Synthesis method for Donor A and B',value:plan.operation,onChange:e=>{const operation=e.currentTarget.value;change(p=>({...p,operation}))},children:[u.jsx('option',{value:'cross',children:'Cross'}),u.jsx('option',{value:'imprint',children:'Imprint'}),u.jsx('option',{value:'interlock',children:'Interlock'})]})]}),
    u.jsx('p',{className:'f35643-method-explain','aria-live':'polite',children:plan.operation==='cross'?'Cross: A and B form a shared spectral body.':plan.operation==='imprint'?'Imprint: One sound reshapes the other’s structure.':'Interlock: A and B reshape each other reciprocally.'}),
    plan.operation==='imprint'?u.jsxs('label',{children:['Imprint direction',u.jsx('select',{'aria-label':'Imprint direction',value:plan.imprintDirection,onChange:e=>{const imprintDirection=e.currentTarget.value;change(p=>({...p,imprintDirection}))},children:[u.jsx('option',{value:'A_to_B',children:'A → B'}),u.jsx('option',{value:'B_to_A',children:'B → A'})]})]}):null,
    u.jsxs('label',{children:['Synthesis variant for the entire hybrid',u.jsx('select',{'aria-label':'Shared synthesis variant',value:plan.revision,onChange:e=>{const revision=e.currentTarget.value;change(p=>({...p,revision}))},children:[u.jsx('option',{value:'original',children:'1'}),u.jsx('option',{value:'revised',children:'2'})]})]}),
    u.jsx('small',{className:'f35643-scope-note',children:'All linked regions currently share variant 1 or 2. Cross, Imprint and Interlock may differ for individual connections.'}),
    u.jsx('button',{type:'button',className:'f35642-connect',disabled:!selected.A||!selected.B||mismatched('A')||mismatched('B')||plan.links.length>=12,onClick:link,children:selected.A&&selected.B?'✦ Connect These Regions':'Select A + B'}),
    u.jsx('small',{children:'Each connection receives a matching number in both spectra. Then rebuild the hybrid.'})
  ]}),sourceCard('B')]}),
 u.jsxs('section',{className:'f35637-quick', 'aria-label':'Automatic donor relationship',children:[
   u.jsxs('div',{className:'f35637-quick-heading',children:[u.jsxs('div',{children:[u.jsx('div',{className:'f35634-overline',children:plan.links.length?'YOUR SOUND CROSSING':'AUTOMATIC SOUND CROSSING'}),u.jsx('h3',{children:plan.links.length?'Your regions → one new donor':'Two sounds → one new donor'}),u.jsx('p',{children:plan.links.length?'Your marked regions and relationships are preserved. The button builds precisely this recipe.':'Load A and B. Automatic assembly uses the selected method and direction. Existing marks are preserved.'})]}),u.jsxs('div',{className:'f35637-quick-cta',children:[u.jsx('button',{type:'button',className:'f35637-primary',disabled:!autoReady||bodyJob.busy,onClick:autoBuild,children:bodyJob.busy?'Building…':plan.links.length?'✦ Build & Hear My Regions':'✦ Auto-'+(plan.operation==='imprint'?'Imprint':plan.operation==='interlock'?'Interlock':'Cross')+' & Hear'}),bodyJob.busy?u.jsx('button',{type:'button',onClick:cancelBody,children:'Cancel'}):null]})]}),
   u.jsxs('div',{className:'f35637-visual',role:'img','aria-label':'Both original spectra are analysed at equal relative time positions and joined into one hybrid, not two audio streams',children:[u.jsxs('div',{className:'f35637-visual-donor',children:[u.jsx('strong',{children:'A'}),u.jsx('span',{children:sources.A?'Ready · '+sources.A.duration.toFixed(1)+' s':'Load sound A'})]}),u.jsx('div',{className:'f35637-visual-bridge',children:[u.jsx('span',{className:'f35637-bridge-line a'}),u.jsx('div',{className:'f35637-bridge-core',children:bodyJob.busy?Math.round(bodyJob.progress*100)+'%':bodyCurrent?'✓':'↔'}),u.jsx('span',{className:'f35637-bridge-line b'})]}),u.jsxs('div',{className:'f35637-visual-donor b',children:[u.jsx('strong',{children:'B'}),u.jsx('span',{children:sources.B?'Ready · '+sources.B.duration.toFixed(1)+' s':'Load sound B'})]}),u.jsxs('div',{className:'f35637-visual-result',children:[u.jsx('strong',{children:'HYBRID'}),u.jsx('span',{children:bodyJob.busy?'Building '+__f35645Methods(bodyCapture.current?.recipe||plan)+' · '+((bodyCapture.current?.recipe?.revision||plan.revision)==='original'?'1':'2')+'…':body?'Hybrid · '+__f35645Methods(body.manifest?.recipe)+' · '+(body.manifest?.recipe?.revision==='original'?'1':'2')+' · '+body.duration.toFixed(1)+' s'+(bodyCurrent?'':' · previous render'):'Waiting for two sounds'})]})]}),
   bodyJob.busy?u.jsx('progress',{max:1,value:bodyJob.progress,'aria-label':'Automatic spectrum synthesis progress'}):null,
   body?u.jsxs('div',{className:'f35637-ready-actions',children:[u.jsx('button',{type:'button',className:'f35637-primary',onClick:()=>void listen('result'),children:audition?.slot==='result'?'■ Stop Hybrid':'▶ Hear Hybrid Again'}),u.jsx('button',{type:'button','data-dual-action':'use-in-forge',onClick:()=>void useBody(),disabled:bodyJob.busy||!bodyCurrent,title:!bodyCurrent?'Rebuild the current recipe before transferring.':'Transfer the current hybrid to Forge',children:'Use Hybrid in Forge'}),u.jsx('button',{type:'button','data-dual-action':'hear-in-carrier',onClick:()=>void hearHybridInCarrier(),disabled:bodyJob.busy||carrierPreviewBusy||!transferReady,title:!transferReady?'Use Hybrid in Forge first.':'Preview your painted Carrier with the transferred hybrid',children:'▶ Hear Hybrid in Carrier'}),u.jsx('button',{type:'button',onClick:()=>void saveBody(),disabled:bodyJob.busy||!bodyCurrent,title:!bodyCurrent?'Rebuild the current recipe before saving.':'Save current hybrid',children:'Save Hybrid to Donor Library'}),u.jsx('button',{type:'button',onClick:()=>__f35636Download(__f35636Wav(body),plan.name+'.wav'),children:'Export WAV'})]}):null,
   body&&transferReady?u.jsx('p',{className:'f35637-transfer-confirm','data-dual-transfer-ready':'true',role:'status',children:'✓ Hybrid in Forge · Available in Audio Import Rack'}):null,
   body&&feedback?u.jsx('p',{className:'f35637-action-feedback '+feedback.kind,role:'status','aria-live':'polite',children:feedback.text}):null,
   body&&!bodyCurrent?u.jsx('p',{className:'f35637-last',children:'The recipe or source has changed. Your LAST completed hybrid is still available above; create again for the new version.'}):null,
   advanced&&plan.links.some(l=>['auto-cross-1','auto-pair-1'].includes(l.id))?u.jsx('p',{className:'f35637-edit-tip',children:'Refine the automatic pair: draw a rectangle in either spectrum. Your first edit replaces its full-range selection; the connection remains in place.'}):null,
   u.jsx('button',{type:'button',className:'f35637-advanced-toggle','aria-expanded':advanced,onClick:()=>setAdvanced(v=>!v),children:advanced?'− Hide detailed editing':'＋ Refine regions, links & synthesis settings'}),
   u.jsx('small',{className:'f35637-explain',children:['auto-cross-1','auto-pair-1'].includes(body?.manifest?.recipe?.links?.[0]?.id)?'Automatic recipe: '+__f35645Methods(body.manifest.recipe)+'. Both analyses feed a single resynthesized spectral body. The scan line tracks actual relative processing time.':'The moving scan line shows relative source time during actual calculation; it is not a claim of exact one-to-one partial matching.'})
 ]}),
 u.jsxs('section',{className:'f35634-compose',"aria-label":'Relationship editor',children:[
  u.jsxs('div',{className:'f35635-compose-summary',children:[u.jsx('span',{className:'f35634-overline',children:'CONNECTIONS · EDIT'}),u.jsx('h3',{children:'Connected regions'}),u.jsx('p',{children:'Matching numbers in both spectra identify connected regions.'})]}),
  u.jsx('p',{className:'f35642-relationship-hint',children:'Create connections between the spectrograms above. Edit or remove existing connections here.'}),
  u.jsx('div',{className:'f35634-links',children:plan.links.length?plan.links.map((l,i)=>{const a=plan.regions.find(r=>r.id===l.a),b=plan.regions.find(r=>r.id===l.b);return u.jsxs('div',{className:'f35634-link'+(activeLink===l.id?' active':''),children:[u.jsx('button',{type:'button',className:'f35635-link-focus','aria-pressed':activeLink===l.id,onClick:()=>{setActiveLink(l.id);setSelected({A:l.a,B:l.b});change(p=>({...p,operation:l.mode,imprintDirection:l.direction||p.imprintDirection}))},children:String(i+1).padStart(2,'0')+'  A '+(__f35635FeatureName[a?.feature]||'?')+(l.mode==='imprint'?(l.direction==='A_to_B'?' → ':l.direction==='B_to_A'?' ← ':' ? '):' ↔ ')+'B '+(__f35635FeatureName[b?.feature]||'?')}),u.jsx('select',{'aria-label':'Connection '+(i+1)+' synthesis rule',value:l.mode,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,links:p.links.map(x=>x.id===l.id?{...x,mode:value,direction:value==='imprint'?x.direction:null}:x)}))},children:[u.jsx('option',{value:'cross',children:'Cross'}),u.jsx('option',{value:'imprint',children:'Imprint'}),u.jsx('option',{value:'interlock',children:'Interlock'})]}),l.mode==='imprint'?u.jsx('select',{'aria-label':'Connection '+(i+1)+' imprint direction',value:l.direction||'',onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,links:p.links.map(x=>x.id===l.id?{...x,direction:value}:x)}))},children:[u.jsx('option',{value:'',children:'Set direction!'}),u.jsx('option',{value:'A_to_B',children:'A → B'}),u.jsx('option',{value:'B_to_A',children:'B → A'})]}):null,u.jsx('button',{type:'button','aria-label':'Remove connection '+(i+1),onClick:()=>{setActiveLink(null);change(p=>({...p,links:p.links.filter(x=>x.id!==l.id)}))},children:'×'})]},l.id)}):u.jsx('p',{children:'No connections yet. Mark a region in A and B, then use the bridge between them.'})}),
  u.jsxs('div',{className:'f35635-remainder',children:[u.jsx('label',{children:'Unlinked sound material'}),u.jsx('select',{'aria-label':'Treatment of unlinked material',value:plan.remainder,onChange:e=>{const value=e.currentTarget.value;change(p=>({...p,remainder:value}))},children:[u.jsx('option',{value:'undecided',children:'Undecided'}),u.jsx('option',{value:'linked_only',children:'Use only linked properties'}),u.jsx('option',{value:'keep_A',children:'Keep unlinked properties from A'}),u.jsx('option',{value:'keep_B',children:'Keep unlinked properties from B'})]}),u.jsx('small',{children:'Unlinked frequency bands can stay from A or B; linked windows align by relative progress.'})]})
 ]}),
 u.jsx(__F35636Output,{body,current:bodyCurrent,problem:bodyProblem,settings:bodySettings,onSettings:setBodySettings,job:bodyJob,onRender:()=>void synthesize(),onCancel:cancelBody,onListen:()=>void listen('result'),audition,onSave:()=>void saveBody(),onUse:()=>void useBody(),onHearCarrier:()=>void hearHybridInCarrier(),transferReady:transferReady,actionFeedback:feedback,carrierPreviewBusy:carrierPreviewBusy,onExport:()=>bodyRef.current&&__f35636Download(__f35636Wav(bodyRef.current),plan.name+'.wav'),onExportSession:()=>void exportSession(),onImportSession:importSession,sessionImport,savedFigure,onRestore:restoreFigure,audioSaved}),
 u.jsx('p',{className:'f35634-footnote',children:'Source audition is dry. Hybrid audition plays the prepared result. Transfer to the carrier is explicit; complete sessions include the original recordings.'})
 ]});
}