
function kE(source,isCancelled=null){return __F353AnalysisCache.prepare(source,isCancelled);}





function __F353RecipePanel(){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),[name,setName]=P.useState(''),[message,setMessage]=P.useState('');
 const save=variant=>{try{const item=__F341Workbench.savePreset(name,variant);__F341Workbench.set({...__F341Workbench.getConfig(),preset:item.id});setName('');setMessage('„'+item.name+"” saved and available under Custom Recipes.");}catch(e){setMessage(e.message);}};
 return u.jsxs('div',{className:'f353-recipe-save',children:[u.jsx('input',{'aria-label':'Rezeptname',placeholder:"Name Custom Recipe",value:name,onChange:e=>setName(e.currentTarget.value),maxLength:80}),u.jsx('button',{type:'button',disabled:!name.trim(),onClick:()=>save(false),children:"Save Custom Recipe"}),u.jsx('button',{type:'button',disabled:!name.trim()||!wb.config.sourceKey,onClick:()=>save(true),children:"Save with Donor Markings"}),message?u.jsx('span',{role:'status',children:message}):null]});
}


function __F3564CarrierMiniature({material=null}){
 const ref=P.useRef(null),grid=pe(state=>state.spectralData),rev=pe(state=>state.renderVersion);
 const donor=Vt.getSnapshot(),artifact=__F352Runtime.current(),active=!!donor.source&&!!donor.model;
 P.useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx||!grid?.data)return;
  const w=canvas.width,h=canvas.height,top=h-24;
  ctx.fillStyle='#07111b';ctx.fillRect(0,0,w,h);
  const image=ctx.createImageData(w,top),iw=grid.width,ih=grid.height,src=grid.data;
  for(let y=0;y<top;y++)for(let x=0;x<w;x++){
   const sx=Math.min(iw-1,Math.floor(x/w*iw)),sy=Math.min(ih-1,Math.floor(y/top*ih));
   const v=Math.max(0,Math.min(1,src[sy*iw+sx]||0)),i=(y*w+x)*4;
   image.data[i]=Math.round(7+v*(active?38:213));
   image.data[i+1]=Math.round(15+v*(active?186:102));
   image.data[i+2]=Math.round(26+v*(active?171:48));
   image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  ctx.fillStyle='#0b1c29';ctx.fillRect(0,top,w,h-top);
  ctx.strokeStyle=active?'#2dd4bf':'#b9a579';ctx.lineWidth=1.3;
  const pcm=artifact?.pcm;
  if(pcm?.length){
   ctx.beginPath();const mid=top+12;
   for(let x=0;x<w;x++){
    const a=Math.floor(x/w*pcm.length),b=Math.max(a+1,Math.floor((x+1)/w*pcm.length));let peak=0;
    for(let i=a;i<Math.min(b,pcm.length);i+=Math.max(1,Math.floor((b-a)/15)))peak=Math.max(peak,Math.abs(pcm[i]));
    const span=Math.min(10,peak*10);ctx.moveTo(x+.5,mid-span);ctx.lineTo(x+.5,mid+span);
   }ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(0,top+12);ctx.lineTo(w,top+12);ctx.stroke();}
 },[grid,rev,active,artifact?.key,material]);
 return u.jsxs('div',{className:'f3564-carrier-mini','data-f3564-mini':'true',children:[
  u.jsx('strong',{children:'Carrier-Miniatur'}),
  u.jsx('canvas',{ref,width:320,height:120,'aria-label':"Miniature carrier figure with current donor PCM motion"}),
  u.jsx('small',{children:active?(artifact?"Orange: carrier · below: actual donor audio motion":"Orange: carrier with loaded donor · sound motion after rendering"):"Carrier Figure · Donor Not Loaded Yet"})
 ]});
}

function __F356GestaltPanel({ range, selection, material }) {
  const wb = P.useSyncExternalStore(
      __F341Workbench.subscribe,
      __F341Workbench.getSnapshot,
      __F341Workbench.getSnapshot,
    ),
    p = wb.config.params;
  const info = material?.gestaltTransform;
  const names = { imprint: "Resonant Imprint", motion: "Timbre Motion", weave: "Material States", articulation: "Articulation", signature:"Donor-Signatur",film:"Spektraler Film",air:"Hauch & Reibung",freeze:"Stillbild",wander:"Wandernd" };
  return u.jsxs("section", {
    className: "f347-control-group",
    "data-f356-gestalt": "true",
    children: [
      u.jsx("h3", { children: "Klanggestalt · " + names[p.gestaltMode] + (p.variantRevision === "original" ? " · 1" : " · 2") }),
      u.jsx("p", {
        children:
          "Your drawing leads pitch, voices, rhythm and dynamics. The donor lends its resonance colour and its own internal motion. Thin lines focus the pitch; wider strokes can preserve the source’s irregular spectral spacing. Glissandi and changes of width or intensity shape the journey through the recording.",
      }),
      u.jsxs("div", {
        className: "f3564-carrier-layout",
        children: [
          u.jsxs("div", {
            className: "f3564-carrier-controls",
            children: [
              u.jsxs("div", {
                className: "f341-controls f3564-three-cards",
                children: [
                  u.jsx(__F341Control, {
                    label: "Resonance Identity",
                    name: "gestaltIdentity",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: resonance colour moves with pitch. 1: preserve more of the donor’s original resonance frequencies and spectral troughs. Most effective with a stable tonal source.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Internal Motion",
                    name: "gestaltMotion",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: hold a source state at the chosen position. 1: travel farther through the allowed recording. Short dots use short excerpts and an observed source attack where available.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Gesture Response",
                    name: "gestaltGesture",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "0: even source-time motion. 1: pitch movement, stroke width and changes of intensity reshape source time. Broad strokes also retain more original irregular partial spacing.",
                  }),
                ],
              }),
              u.jsxs("div", {
                className: "f341-controls",
                children: [
                  u.jsx(__F341Control, {
                    label: "Source Position",
                    name: "position",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    help: "Choose where a held or partial source journey begins. Material States also uses this position as a gentle preference.",
                  }),
                  u.jsx(__F341Control, {
                    label: "Tune Carrier Together",
                    name: "carrierTranspose",
                    min: -48,
                    max: 48,
                    step: 0.1,
                    unit: " st",
                    help: "Shift all painted voices together, keeping their intervals.",
                  }),
                  u.jsxs("label", {
                    className: "f341-control",
                    children: [
                      u.jsx("span", { children: "Reference for Unpitched Material" }),
                      u.jsx("input", {
                        type: "number",
                        min: 20,
                        max: 20000,
                        step: 1,
                        value: p.carrierNeutralHz,
                        "aria-label": "Klanggestalt Unpitched Reference",
                        onChange: (e) => {
                          if (e.currentTarget.value)
                            __F341Workbench.patch({
                              carrierNeutralHz: Number(e.currentTarget.value),
                            });
                        },
                      }),
                      u.jsx("small", {
                        children:
                          "Hz. Confident tonal material follows its observed fundamental; textures and uncertain passages use the source region’s tonal reference, or this value when no reliable pitch is available.",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          u.jsx(__F3564CarrierMiniature, { material }),
        ],
      }),
      p.gestaltMode === "articulation" ? u.jsx(__F341Control,{label:"Articulation Transfer",name:"articulationAmount",min:0,max:1,step:.01,help:"Use the observed donor beginning, sustained body and ending within each painted phrase. Connected glissandi stay connected; pauses remain silent."}) : null,
      u.jsxs("label", {
        children: [
          "Source Journey ",
          u.jsx("select", {
            "aria-label": "Klanggestalt Source Journey",
            value: p.planning === "reference" ? "reference" : "neutral",
            onChange: (e) => __F341Workbench.patch({ planning: e.currentTarget.value }),
            children: [
              u.jsx("option", { value: "neutral", children: "Use Allowed Source Regions" }),
              u.jsx("option", { value: "reference", children: "Use a Marked Reference Journey" }),
            ],
          }),
        ],
      }),
      p.planning === "reference"
        ? u.jsxs("div", {
            children: [
              u.jsx("span", {
                children: selection
                  ? " Reference " +
                    (p.referenceStart * selection.duration).toFixed(2) +
                    "–" +
                    (p.referenceEnd * selection.duration).toFixed(2) +
                    " s "
                  : "",
              }),
              u.jsx("button", {
                type: "button",
                disabled: !range,
                onClick: () =>
                  __F341Workbench.patch({ referenceStart: range[0], referenceEnd: range[1] }),
                children: "Use Marking as Reference",
              }),
            ],
          })
        : null,
      u.jsx("p", {
        className: "f341-muted",
        children:
          p.gestaltMode === "weave"
            ? "Observed donor states combine level, spectral envelope, brightness and aperiodicity. Phrase selection also considers observed transitions. Include/Exclude markings remain boundaries."
            : p.gestaltMode === "motion"
              ? "Signed pitch movement and changes in the stroke shape move source time forward or backward with reflected boundaries. Pitch and pauses continue to follow the drawing."
              : "The original recording supplies every audible component. Resonance identity changes its spectral colouring without adding a second voice or a noise layer.",
      }),
      material?.stateField ? u.jsx("p",{role:"status",children:"Observed Donor States: "+material.stateField.states.length+" · "+material.stateField.analyzedFrames+" contained analysis frames · transitions refer to source order."}) : null,
      info
        ? u.jsx("p", {
            role: "status",
            children:
              "Rendered: " +
              names[info.mode] +
              " · " +
              Math.round(info.identity * 100) +
              "% resonance identity · " +
              Math.round(info.motion * 100) +
              "% internal motion. Playback and export use this same result.",
          })
        : null,
    ],
  });
}


function __F356MaterialPanel({range,selection,material}){
 const wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot),p=wb.config.params;
 const info=material?.materialTransform;
 return u.jsxs('section',{className:'f347-control-group','data-f356-material':'true',children:[
  u.jsx('h3',{children:"Sound Material · Carrier Moves the Recording" + (p.variantRevision === "original" ? " · 1" : " · 2") + ""}),
  u.jsx('p',{children:"An experiment with the full recording: each carrier voice draws its own sound motion through the figure. Choose how source time advances and experiment with a shared pitch reference."}),
  u.jsxs('div',{className:'f3564-carrier-layout',children:[u.jsxs('div',{className:'f3564-carrier-controls',children:[u.jsxs('div',{className:'f341-controls f3564-three-cards',children:[
   u.jsx(__F341Control,{label:"Tune Carrier Together",name:'carrierTranspose',min:-48,max:48,step:.1,unit:" st",help:"Continuously shifts all carrier voices together."}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:"Unchanged Pitch at Carrier Position"}),u.jsx('input',{type:'number',min:20,max:20000,step:1,value:p.carrierNeutralHz,'aria-label':"Carrier Position for Unchanged Pitch",onChange:e=>{if(e.currentTarget.value)__F341Workbench.patch({carrierNeutralHz:Number(e.currentTarget.value)})}}),u.jsx('small',{children:"Hz on the canvas. Fixed reference independent of the donor; above this position the entire recording shifts up, below it shifts down."})]}),
   u.jsxs('label',{className:'f341-control',children:[u.jsx('span',{children:'Quellzeit'}),u.jsx('select',{'aria-label':"Sound Material Source Time",value:p.materialTime,onChange:e=>__F341Workbench.patch({materialTime:e.currentTarget.value,...(e.currentTarget.value==='hold'&&p.position===0?{position:.5}:{})}),children:[u.jsx('option',{value:'stretch',children:"Full Motion · Stretch to Event Length"}),u.jsx('option',{value:'loop',children:'Eigenes Tempo · wiederholen'}),u.jsx('option',{value:'hold',children:'Klangzustand halten'})]}),u.jsx('small',{children:p.materialTime==='stretch'?"One continuous source region runs through each carrier event once. Its own timing variations are stretched along with it.":p.materialTime==='loop'?"Source time runs at the original tempo; only the loop boundary is crossfaded. Pitch transposition may introduce reconstruction artifacts.":"One excerpt stays fixed. This also freezes its internal motion."})]}),
   ]}),
   p.materialTime!=='stretch'?u.jsx('div',{className:'f3564-position-row',children:u.jsx(__F341Control,{label:'Quellposition',name:'position',min:0,max:1,step:.01,help:"Start position within the allowed continuous source region."})}):null
  ]}),u.jsx(__F3564CarrierMiniature,{material})]}),
  u.jsxs('label',{children:["Choose Source Motion ",u.jsx('select',{'aria-label':"Choose Sound Material Motion",value:p.planning==='reference'?'reference':'neutral',onChange:e=>__F341Workbench.patch({planning:e.currentTarget.value}),children:[u.jsx('option',{value:'neutral',children:"Use Allowed Source Range"}),u.jsx('option',{value:'reference',children:'Fest markierter Referenzverlauf'})]})]}),
  p.planning==='reference'?u.jsxs('div',{children:[u.jsx('span',{children:selection?' Referenz '+(p.referenceStart*selection.duration).toFixed(2)+'–'+(p.referenceEnd*selection.duration).toFixed(2)+' s ':''}),u.jsx('button',{type:'button',disabled:!range,onClick:()=>__F341Workbench.patch({referenceStart:range[0],referenceEnd:range[1]}),children:"Use Marking as Reference"})]}):null,
  u.jsx('p',{className:'f341-muted',children:"Include/Exclude limits original material. Each carrier event remains within a continuous source region. Quiet states are not individually boosted. Playback and export use the same audio buffer."}),
  info?u.jsx('p',{role:'status',children:"Last Auditioned State: "+({stretch:'Verlauf gedehnt',loop:'Eigenes Tempo',hold:'Klangzustand gehalten'}[info.timeMode]??"Sound Material")+' · gemeinsame Tonlage '+info.transpose.toFixed(1)+" semitones."}):null
 ]});
}

function __F341UseMaterialPlan({effectiveModel,carrierState,duration,planRate,config}){
 return P.useMemo(()=>{try{return effectiveModel?__f342Plan(carrierState.spectralData,effectiveModel,config,duration,planRate):{runs:[],error:''};}catch(e){return {runs:[],error:e.message};}},[effectiveModel,config,carrierState.spectralData,carrierState.renderVersion,duration,planRate]);
}
function __F341UseWorkshopVisuals({selection,source,setHeat,setError,body,canvas,effectiveModel,hybrid,heat,config,layer,range,point,viewport,materialError,linkMode,runs,selectedRun,showOutput,outputCanvas,output}){
 P.useEffect(()=>{let cancelled=false;setHeat(null);if(selection){const cached=__F341Spectrograms.get(source);if(cached)setHeat(cached);else __f341Spectrogram(selection.samples,selection.sampleRate,()=>cancelled).then(value=>{if(value&&!cancelled){__F341Spectrograms.set(source,value);setHeat(value)}}).catch(e=>{if(!cancelled)setError(String(e.message??e))});}return()=>{cancelled=true};},[selection,source]);
 P.useEffect(()=>{if(!selection||!body)return;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;__f341Paint(canvas.current,selection,body,effectiveModel??{...hybrid,sourceIndex:{...hybrid.sourceIndex,windows:[]}},heat,config,layer,range,point,viewport,materialError?[]:linkMode==='source'?runs.filter(run=>point!=null&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate>=run.sourceStart&&(point*selection.duration-selection.eventStart)*hybrid.sampleRate<=run.sourceEnd):runs,linkMode==='source'?null:selectedRun);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(canvas.current);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[selection,body,effectiveModel,heat,config,layer,range,point,viewport,runs,selectedRun,materialError,linkMode]);
 P.useEffect(()=>{if(!showOutput||!outputCanvas.current||!output?.mantle)return;const c=outputCanvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(c);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,output.mantle,0,0,w,h);});};paint();const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(paint):null;obs?.observe(c);return()=>{obs?.disconnect();if(pending)cancelAnimationFrame(pending);};},[showOutput,output]);
 }

/* F3.56.23 · Donor Workbench boundaries: event handlers and view, no new React mount site. */
function __f35623WorkbenchCanvasInteractions({drag,keyboardAnchor,setLayer,setLinkMode,setPoint,setRange,selection,hybrid,runs,setSelectedRun}){
const setFromPointer=e=>{const c=e.currentTarget,box=c.getBoundingClientRect(),g=c.__f341Geometry;if(!g)return null;return __F341Workbench.clamp(g.lo+((e.clientX-box.left-g.left)/g.width)*(g.hi-g.lo),g.lo,g.hi);};
const down=e=>{if(e.button!==0)return;const f=setFromPointer(e);if(f==null)return;const box=e.currentTarget.getBoundingClientRect(),g=e.currentTarget.__f341Geometry,y=e.clientY-box.top;if(y>=g.rowTop&&y<g.rowTop+g.rowHeight*6)setLayer(__F341Workbench.layers[Math.floor((y-g.rowTop)/g.rowHeight)].id);drag.current={start:f,x:e.clientX};keyboardAnchor.current=null;setLinkMode('source');setPoint(f);setRange(null);const sample=(f*selection.duration-selection.eventStart)*hybrid.sampleRate;const linked=runs.findIndex(run=>sample>=run.sourceStart&&sample<=run.sourceEnd);setSelectedRun(linked<0?null:linked);e.currentTarget.setPointerCapture(e.pointerId);};
const move=e=>{if(!drag.current)return;const f=setFromPointer(e);if(f==null)return;setPoint(f);if(Math.abs(e.clientX-drag.current.x)>4)setRange([Math.min(f,drag.current.start),Math.max(f,drag.current.start)]);};
const up=e=>{if(drag.current){move(e);drag.current=null;}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
return {down,move,up};
}
function __f35623WorkbenchKeyboard({canvas,selection,point,viewport,setPoint,setLinkMode,keyboardAnchor,setRange,close,dialog,runtime,preview,stopPreview,previewPending}){
const keydown=e=>{if(e.target===canvas.current&&selection&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const start=point??viewport[0],next=__F341Workbench.clamp(start+(e.key==='ArrowLeft'?-1:1)*.01/selection.duration,0,1);setPoint(next);setLinkMode('source');if(e.shiftKey){if(keyboardAnchor.current==null)keyboardAnchor.current=start;setRange([Math.min(keyboardAnchor.current,next),Math.max(keyboardAnchor.current,next)]);}else{keyboardAnchor.current=null;setRange(null);}}if(e.key==='Escape'){e.preventDefault();close();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();e.shiftKey?__F341Workbench.redo():__F341Workbench.undo();}if(e.key==='Tab'){const nodes=[...dialog.current.querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key===' '&&e.target===dialog.current){e.preventDefault();(runtime.phase==='playing'||runtime.phase==='rendering'||previewPending)?stopPreview():void preview();}e.stopPropagation();};
return keydown;
}
function __f35623WorkbenchAnalysisView({action,analysisText,availableRoles,body,busy,canvas,choiceIndex,config,down,drag,frame,frameIndex,hybrid,layer,mark,materialMode,metrics,move,point,range,reanalyse,selection,setLayer,setViewport,source,sourceMode,up}){
return u.jsxs('div',{className:'f341-main',children:[u.jsxs('div',{className:'f341-source',children:[
   u.jsxs('div',{className:'f341-viewtools',children:[u.jsx('strong',{children:"Donor Selection · Spectrum & Time"}),action("Entire Selection",()=>setViewport([0,1])),action("Enlarge Marking",()=>range&&setViewport(range),!range)]}),
   u.jsx('canvas',{ref:canvas,className:'f341-canvas','data-f350-sample':'true','aria-label':"Donor Spectrum with Analysis Layers",tabIndex:0,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:()=>{drag.current=null}}),
   u.jsxs('div',{className:'f341-layerbuttons',children:__F341Workbench.layers.map(item=>action(item.label,()=>setLayer(item.id),false,{key:item.id,'aria-pressed':layer===item.id,style:{borderColor:layer===item.id?item.color:undefined,color:layer===item.id?item.color:undefined}}))}),
   u.jsx('p',{className:'f341-explanation',children:config.params.gestaltPilot?(layer==='material'?"Turquoise marks the allowed original source regions. Each carrier phrase stays in one connected region.":"The original PCM supplies the sound. Confident pitch observations guide tonal transport; resonance colour and gesture-shaped source time form this listening mode."):materialMode?(layer==='material'?"Turquoise shows allowed continuous source regions. The recording is not filtered here by sound similarity.":"Analysis describes the source; it does not determine transposition or split sound into tone and noise here."):sourceMode?(layer==='dynamics'?"The measured donor level acts as a sound-state index: quieter carrier passages select softer source states, louder passages select stronger states.":layer==='material'?"All audible sound states are available; your Include and Exclude markings restrict the source.":analysisText[layer]):analysisText[layer]}),
   u.jsx('p',{className:'f341-muted',children:materialMode?"The entire selected recording is available. Drag to mark a region; Include and Exclude shape source motion.":sourceMode?"The entire marked source is available. Quiet and strong states provide different Donor Sustain material. Drag to mark, use arrow keys to inspect.":"Dimmed regions lie outside the automatically analyzed sound event. A marking there can be analyzed as a new donor selection. Sample keyboard: arrows inspect, Shift + arrows select."})
  ]}),u.jsxs('aside',{className:'f341-inspector',children:[
   u.jsx('h3',{children:"Material & Examined Position"}),u.jsx('p',{children:point==null?"Click the sequence or an analysis row.":(point*selection.duration).toFixed(3)+" s in selection · "+(source.importStartSec+point*selection.duration).toFixed(3)+" s in file"}),
   u.jsxs('details',{className:'f350-analysis-details',children:[u.jsx('summary',{children:"Measured Analysis Values"}),frame?u.jsxs('dl',{children:[["Fundamental Frequency",metrics.pitchHz>0?metrics.pitchHz.toFixed(1)+' Hz':"not reliable"],["Pitch Confidence",(metrics.confidence*100).toFixed(0)+' %'],["Noise indicator",(metrics.noise*100).toFixed(1)+' %'],["Relative Level",(metrics.level*100).toFixed(0)+' %'],['Spektralspitzen',String(frame.spectralPeaks?.length??0)],['Materialentscheidung',__f342DecisionText(choiceIndex?.frameDecisions?.[frameIndex])],['Analysevorschlag',hybrid.kind==='periodic'?'periodisch':hybrid.kind==='modal'?'Resonanzmaterial':'Textur']].map(([a,b])=>u.jsxs('div',{children:[u.jsx('dt',{children:a}),u.jsx('dd',{children:b})]},a))}):u.jsx('p',{className:'f341-muted',children:point==null?"Analysis values appear here.":"This position lies outside the current event analysis."})]}),
   u.jsx('h3',{children:sourceMode?"Observed Attacks":"Onset & Material Rules"}),u.jsx('p',{className:'f341-muted',children:sourceMode?(hybrid.atlas?.attacks?.length??0)+" brief level rises observed. A selection boundary with ongoing sound counts as sustained sound.":__F347OnsetText(body)}),
   !sourceMode&&!materialMode&&u.jsxs('div',{className:'f347-choice',children:[
    u.jsxs('label',{children:["Material Strategy",u.jsxs('select',{'aria-label':'Donor Materialstrategie',disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),value:config.params.materialPolicy,onChange:e=>__F341Workbench.patch({materialPolicy:e.currentTarget.value}),children:[u.jsx('option',{value:'similar',children:"Prefer Similar States"}),u.jsx('option',{value:'evolving',children:"Allow Varying Motion"})]})]}),
    u.jsx('p',{children:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include')?"Direct window selection or your Include markings determine the material here.":config.params.materialPolicy==='similar'?"Aperiodicity, spectral shape, level and, for periodic material, pitch confidence restrict the candidate pool. Adjust tolerance or choose motion mode.":"Local changes in spectral shape, level and aperiodicity divide the motion into material segments. Noisy or changing frames are not rejected solely for their sound class."}),
    u.jsxs('label',{children:[(config.params.materialPolicy==='similar'?"Similarity Tolerance":"Sensitivity to Segment Changes")+' · '+config.params.selectionTolerance.toFixed(2)+'×',u.jsx('input',{type:'range','aria-label':'Donor Auswahlspielraum',min:.5,max:2.5,step:.05,value:config.params.selectionTolerance,disabled:config.params.windowMode!=='auto'||config.regions.some(r=>r.role==='include'),onChange:e=>__F341Workbench.patch({selectionTolerance:Number(e.currentTarget.value)})})]}),
    u.jsx('p',{children:config.params.materialPolicy==='similar'?"Higher = wider similarity tolerance. Level and pitch limits remain part of this strategy.":"Higher = more sensitive to local changes; more material segments. This is a segmentation choice, not a rating of the sound."}),
    u.jsx('p',{children:(choiceIndex?.windows?.length??0)+" permitted material windows · "+(choiceIndex?.acceptedFrames?.length??0)+" accepted analysis frames"+(choiceIndex?.fallback?" · automatic fallback region":'')})
   ]}),u.jsx('h3',{children:"Edit Material"}),u.jsx('p',{children:range?'Markiert: '+(range[0]*selection.duration).toFixed(3)+'–'+(range[1]*selection.duration).toFixed(3)+' s':"Drag to select a region directly in the sequence."}),
   u.jsx('div',{className:'f341-mark-actions',children:Object.entries(availableRoles).map(([id,label])=>action(label,()=>mark(id),!range,{key:id,'data-f341-mark':id}))}),
   action("Reanalyze Region as Donor",()=>void reanalyse(),!range||busy),
   !sourceMode&&!materialMode&&u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Direkte Fensterwahl'}),u.jsx('select',{'aria-label':'Donor Materialfenster',value:config.params.windowMode,onChange:e=>__F341Workbench.patch({windowMode:e.currentTarget.value}),children:[u.jsx('option',{value:'auto',children:"Choose by Material Strategy"}),u.jsx('option',{value:'all',children:"Allow Entire Analyzed Sound Body"}),u.jsx('option',{value:'pin',children:"Lock One Original Auto Window"})]})]}),
   !sourceMode&&!materialMode&&config.params.windowMode==='pin'?u.jsx('select',{'aria-label':'Auto-Fenster festhalten',value:config.params.windowId,onChange:e=>__F341Workbench.patch({windowId:Number(e.currentTarget.value)}),children:(hybrid.sourceIndex?.windows??[]).map(win=>u.jsx('option',{value:win.id,children:'Fenster '+(win.id+1)+' · '+((win.endSample-win.startSample)/hybrid.sampleRate).toFixed(2)+' s'},win.id))}):null,
   u.jsx('p',{className:'f341-muted',children:materialMode?"Include selects source regions, Exclude removes them. Without markings, the entire selection is available.":sourceMode?"Include limits the source; Exclude removes regions. Without these markings, all audible states remain available.":config.regions.some(r=>r.role==='include')?"Manual Include regions replace automatic window selection. Excluded regions are then subtracted.":"Noise/Tonal markings weight the spectrum used there. They do not change measured analysis values."})
  ]})]});
}

/* F3.56.31 Workbench / recipe presentation boundaries (no hooks, scheduler or audio ownership). */
/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchExpertControls({materialMode,sourceMode,config,controls,runs,outputCurrent,output,planned}) {
  return !materialMode&&u.jsxs('details',{className:'f350-specialist',children:[u.jsx('summary',{children:sourceMode?"Source Motion & Formant Position":"Spectral Projection Controls"}),
 u.jsxs('div',{className:'f341-controls-header',children:[u.jsxs('div',{children:[u.jsx('h3',{children:"03 · Design Transfer"}),u.jsx('p',{children:"The carrier figure controls time, pitch motion and rests. Control changes stop the preview. The current recipe is rendered on the next play. Apply activates it in Forge."})]}),u.jsxs('label',{className:'f341-select',children:[u.jsx('span',{children:'Materialrichtung'}),u.jsx('select',{'aria-label':'Donor Materialrichtung',value:config.params.direction,onChange:e=>__F341Workbench.patch({direction:e.currentTarget.value}),children:[u.jsx('option',{value:'pendulum',children:'Pendeln'}),u.jsx('option',{value:'forward',children:"Forward"}),u.jsx('option',{value:'reverse',children:"Backward"})]})]})]}),
  ...[
   ["Project Spectrum onto Carrier Figure",['mapping','resonance','formant','spread']],
   ["Read Material & Transfer Dynamics",['motion','position','dynamics']],
   ['Vorhandene spektrale Anteile gewichten',['noise','tonal']]
  ].filter(([,names])=>!sourceMode||names.includes('motion')).map(([title,names])=>u.jsxs('div',{className:'f347-control-group',children:[u.jsx('h4',{children:title}),u.jsx('div',{className:'f341-controls',children:controls.filter(c=>names.includes(c.name)&&(!sourceMode||['resonance','formant','position'].includes(c.name)||c.name==='motion'&&config.params.sustainFlavor==='motion')).map(item=>u.jsx(__F341Control,item,item.name))})]},title)),
  !sourceMode&&config.params.signaturePilot&&u.jsx('p',{className:'f341-muted',children:"Donor-fidelity experiments: Preserve Spectrum opens the carrier mask; Preserve Source Motion avoids local pitch normalization. All three at 0 = baseline engine without experiments. Scale Peak Neighbors also changes analysis-window lobes; its quality depends on the material. With a static image, the second control cannot preserve moving vibrato. Neither experiment changes the saved original samples."}),
  !sourceMode&&u.jsx('p',{className:'f341-muted',children:"Noise and tonal weights both default to 1: no additional separation. The weights are a spectral interpretation, not isolated breath/noise or tonal tracks. With textures lacking reliable partial frequencies, their separate effects may be subtle."}),
  !sourceMode&&u.jsxs('div',{className:'f347-window-controls',children:[
   u.jsxs('label',{children:["Spectral Grain Windows · Rule",u.jsxs('select',{'aria-label':'Donor Fensterregel',value:config.params.windowStrategy,onChange:e=>__F341Workbench.patch({windowStrategy:e.currentTarget.value}),children:[u.jsx('option',{value:'capacity',children:"F3-45 · By Available Material Span"}),u.jsx('option',{value:'structure',children:"By Periods & Local Changes"}),u.jsx('option',{value:'duration',children:"Custom Target Duration"})]})]}),
   u.jsx(__F341Control,controls.find(c=>c.name==='detail')),
   config.params.windowStrategy==='duration'?u.jsxs('label',{children:['Zieldauer · '+config.params.windowMs.toFixed(0)+' ms',u.jsx('input',{type:'range','aria-label':'Donor Fenster Zieldauer',min:8,max:170,step:1,value:config.params.windowMs,onChange:e=>__F341Workbench.patch({windowMs:Number(e.currentTarget.value)})})]}):null,
   u.jsx('p',{children:config.params.windowStrategy==='capacity'?"The established F3-45 rule remains the baseline: the shortest allowed material span per voice limits window length.":config.params.windowStrategy==='structure'?"The rule estimates duration from observed periods and local changes. Stronger changes shorten windows; available material span still limits their length.":"Target duration is rounded to a power-of-two FFT size and limited by available material span."}),
   u.jsx('p',{'data-f347-window-summary':'true',children:runs.length?"Actual "+[...new Set(runs.filter(r=>r.workbenchRead).map(r=>r.workbenchRead.size))].sort((a,b)=>a-b).map(n=>n+' Samples / '+(n/(outputCurrent?output.buffer.sampleRate:planned.sampleRate)*1000).toFixed(1)+' ms · Raster '+((outputCurrent?output.buffer.sampleRate:planned.sampleRate)/n).toFixed(1)+' Hz').join(' · ')+' · '+(outputCurrent?'gerendert':'geplant'):"Window sizes appear once the figure contains a carrier run."}),
   u.jsx('p',{children:"Short windows track changes more closely but resolve frequency more coarsely. Long windows preserve finer spectral structure. Original PCM excerpts are read with overlap and projected spectrally in full; analysis values do not replace the audio."})
  ]}),
  sourceMode&&u.jsx(__F341Control,{label:'Formantlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:"0 preserves the original source pitch. This shift is an intentional timbral change."})
 ]});
}

/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchABCompare({action,wb,busy}) {
  return u.jsxs('details',{className:'f347-recipe-compare',children:[u.jsx('summary',{children:"Optional: Compare Two Transfer Recipes"}),u.jsxs('div',{children:[action("Remember Recipe A",()=>__F341Workbench.storeA(),busy),action(wb.compareSide==='A'?"Switch to Recipe B":"Load Recipe A",()=>__F341Workbench.toggleAB(),!wb.hasA||busy)]}),u.jsx('p',{className:'f341-muted',children:"Only controls and markings change. Source, carrier and tempo remain the same. Each side is heard with the normal Play control; no finished audio take is saved."})]});
}

/* F3.56.31: presentation-only extraction; plain helper, not a React component or extra lifecycle. */
function __f35631WorkbenchPresetSave({presetName,setPresetName,setError,config,materialError,action}) {
  return u.jsxs('footer',{className:'f341-footer',children:[u.jsx('input',{'aria-label':"Name Custom Recipe",placeholder:"Name Preset or Donor Variant",value:presetName,onChange:e=>setPresetName(e.currentTarget.value)}),action("Save Parameter Preset",()=>{try{const item=__F341Workbench.savePreset(presetName);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()),action("Save Donor Variant",()=>{try{const item=__F341Workbench.savePreset(presetName,true);__F341Workbench.set({...config,preset:item.id});setPresetName('');setError('')}catch(e){setError(e.message)}},!presetName.trim()||!!materialError)]});
}

/* F3.56.31: immutable description semantics; fresh array per render as before. */
function __f35631WorkbenchControlDescriptors({hybrid,sourceMode}) {
  return [
  {label:"Projection · Partial Structure ↔ Canvas",name:'mapping',min:0,max:1,help:"Auto follows the analysis suggestion and figure width. You can override this assumption with the control."},
  {label:'Resonanzen erhalten',name:'resonance',min:0,max:1,help:hybrid?.kind==='periodic'?'Periodischer Donor · aktive Resonanzkorrektur.':"Inactive for this donor · requires periodic material."},
  {label:'Donor-Spektrum erhalten · Versuch',name:'sourceSpectrum',min:0,max:1,step:.05,help:"0 = exactly the previous sound. Higher values retain more of the original donor frequencies instead of cutting them with the carrier canvas. Pitch, glissandi and voices remain carrier-controlled. Noise components may also become more pronounced."},
  {label:'Eigenbewegung erhalten · Versuch',name:'sourceMotion',min:0,max:1,step:.05,help:hybrid?.kind==='periodic'?"0 = previous normalization. 1 = preserve natural vibrato and source pitch motion relative to the carrier melody; playback remains tied to source motion. To isolate the effect, set Donor Spectrum to 1 and Material Motion to Forward.":"The source was not recognized as stably tonal: this experiment does not change pitch mapping here."},
  {label:'Peak-Nachbarschaft skalieren · Versuch',name:'spectralCohesion',min:0,max:1,step:.05,help:"0 = previous sound. 1 = when transposing, frequency spacings immediately around spectral peaks shift proportionally too. This may preserve rough or complex sounds differently, but can also create blur. Active only in this experimental listening mode."},
  {label:'Resonanzlage',name:'formant',min:-12,max:12,step:.5,unit:" st",help:hybrid?.kind==='periodic'?"Shifts resonance correction.":"Inactive for this donor · requires periodic material."},
  {label:'Spektrale Breite',name:'spread',min:.5,max:2,help:"Affects the broad-area component."},
  {label:sourceMode?"Body Change Speed":'Materialbewegung',name:'motion',min:0,max:3,help:sourceMode?"Motion only: pace of slow, phase-compatible loop changes. 0 holds the same body.":"0 holds the source position."},
  {label:sourceMode?'Bevorzugter Quellort':'Startposition im Fenster',name:'position',min:0,max:1,help:sourceMode?"When seam quality is similar, prefer a loop body closer to this source position.":"Start center within the yellow FFT-safe span for each carrier run."},
  {label:"Noise Component Weight",name:'noise',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure. Energy correction can balance relative weighting.":"Relative weight; total energy is compensated."},
  {label:'Tonale Anteile gewichten',name:'tonal',min:0,max:2,help:hybrid?.kind==='texture'?"Texture: no separate partial structure; effect may be absent.":"Weight around partial frequencies; not an isolated tonal stem."},
  {label:"Balance Donor Level",name:'dynamics',min:0,max:1,help:"0 retains more microdynamics."},
  {label:"Shorten Windows",name:'detail',min:.25,max:1,step:.25,help:"Powers of two: full, half or quarter length of the selected window rule."}
 ];
}