/* Forge Voices · Synth Lab panels for Gaia, Hildegard and Isolde (lazy, Forge room only).
   KALT: no timers or animation loops. Pictures are redrawn only when the recipe or the
   drawing changes. Sliders answer immediately on screen; the recipe (and with it the
   render) is committed once the hand rests, and a running preview restarts by itself. */
const __ForgeVoiceUI=(()=>{
 const ACCENT={gaia:['#34d399','#064e3b','#0c1f1a'],hildegard:['#fbbf24','#78350f','#1f170a'],isolde:['#38bdf8','#0c4a6e','#0a1a24']};
 const pct=v=>Math.round(v*100)+' %',ms=v=>v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s',sec=v=>v.toFixed(2)+' s',int=v=>String(Math.round(v));
 const cents=r=>Math.round(1200*Math.log2(r))+' ct';
 // label, value text, one-line meaning. Order is the order on screen.
 const META={
  gaia:[['reachPitch','Reach · pitch',v=>v.toFixed(2)+' st','How far the orbit looks up and down the picture: which neighbouring voices colour the note.'],
   ['reachTime','Reach · time',ms,'How far it looks back (left ear) and ahead (right ear) in time.'],
   ['lift','Lift',v=>v.toFixed(2),'1 = the orbit just touches the note\'s own line. 0 = centred on it. Negative = it looks upwards.'],
   ['lobes','Lobes',int,'Loops of the orbit. More lobes emphasise higher overtones.'],
   ['relief','Relief',v=>v<.34?'sharp':v<.67?'rolling':'soft','Sharp ridges sound bright and reedy, soft hills round and flute-like.'],
   ['drift','Drift',pct,'The orbit slowly changes shape while a note lasts. Pitch stays exact.'],
   ['dynamics','Dynamics → orbit',pct,'Louder strokes swing a wider orbit and sound richer.'],
   ['anchor','Fundamental',pct,'Keeps the drawn pitch clear, however wild the terrain is.'],
   ['richness','Overtone limit',int,'Highest overtone read from the terrain.']],
  hildegard:[['mirror','Mirror',pct,'0 = ordinary harmonics. 100 % = every overtone moves to an interval that occurs in the figure.'],
   ['partials','Overtones',int,''],['tilt','Brightness',pct,''],
   ['bow','Strike ↔ Bow',v=>v<.2?'struck':v>.8?'bowed':'mixed','Struck tones ring out on their own; bowed tones follow the drawn loudness.'],
   ['decay','Ring time',sec,'How long a struck tone rings. High overtones fade first.'],
   ['hardness','Mallet',v=>v<.34?'felt':v<.67?'wood':'metal',''],
   ['dynamics','Dynamics → colour',pct,'Softer strokes sound darker.'],
   ['halo','Sympathetic halo',pct,'Resonators on the figure\'s own tones answer everything that is played.'],
   ['haloDecay','Halo ring',sec,''],['shimmer','Shimmer',pct,'Slow beating between the left and right overtones.']],
  isolde:[['density','Steps per equave',int,'1 = one partial per equave (the classic endless tone).'],
   ['body','Body',int,'Harmonics of each partial: 1 is glassy, 4 is full.'],
   ['center','Centre',v=>Math.round(v)+' Hz','Where the sound is loudest. It stays there, whatever the pitch does.'],
   ['span','Span',v=>v.toFixed(1)+' oct','Width of the audible window.'],
   ['spiral','Spiral',v=>v===0?'still':(v>0?'+':'')+Math.round(v)+' steps / loop','The whole spectrum climbs or sinks during the loop and arrives exactly where it began.'],
   ['pulse','Pulse depth',pct,'Each register pulses at its own rate.'],
   ['sharp','Pulse sharpness',pct,''],['swirl','Swirl',pct,'Registers are spread around the stereo field and rotate with the spiral.']],
  common:[['attack','Attack',ms,''],['release','Release',ms,'The tail belongs to the note. With wrapping on it continues at the start of the loop.'],
   ['width','Stereo width',pct,''],['space','Room',pct,''],['size','Room size',v=>(.4+v*v*7).toFixed(1)+' s',''],['level','Level',pct,'']]};
 const RATIOS={equave:['Equave',[['2/1',2],['3/1',3],['3/2',1.5],['φ',1.6180339887]],'The interval at which the sound repeats itself. 2/1 is the octave, 3/1 the tritave.'],
  pulseRate:['Pulses per loop',[['1',1],['2',2],['3',3],['4',4],['5',5],['7',7]],'Pulses of the centre register in one loop. Any number, whole numbers keep the loop seamless.'],
  pulseRatio:['Pulse ratio per equave',[['2',2],['3',3],['3/2',1.5]],'One equave higher pulses this much faster. Rates are rounded to whole pulses per loop.']};
 const parseRatio=text=>{const m=String(text).trim().replace(',','.').match(/^(\d*\.?\d+)\s*(?:[/:]\s*(\d*\.?\d+))?$/);if(!m)return NaN;return m[2]?+m[1]/+m[2]:+m[1]};

 function Slider({engine,name,label,format,hint,value,spec,accent,onLive,onCommit}){
  const h=P.createElement,[local,setLocal]=P.useState(value);P.useEffect(()=>setLocal(value),[value]);
  return h('label',{title:hint||undefined,style:{display:'grid',gridTemplateColumns:'minmax(0,7.6rem) minmax(0,1fr) 5.2rem',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:26}},
   h('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},label),
   h('input',{type:'range','aria-label':label,'data-forge-voice-param':name,min:spec.min,max:spec.max,step:spec.step,value:local,style:{width:'100%',accentColor:accent},
    onChange:e=>{const v=+e.target.value;setLocal(v);onLive(name,v)},onPointerUp:()=>onCommit(),onKeyUp:()=>onCommit(),onBlur:()=>onCommit()}),
   h('span',{style:{textAlign:'right',fontVariantNumeric:'tabular-nums',color:'#f1f5f9'}},format(local)));
 }
 function RatioField({name,value,spec,accent,onSet}){
  const h=P.createElement,[label,chips,hint]=RATIOS[name],[text,setText]=P.useState(''),[bad,setBad]=P.useState(false);
  const show=v=>{const c=chips.find(c=>Math.abs(c[1]-v)<1e-6);return c?c[0]:String(+v.toFixed(5))};P.useEffect(()=>{setText(show(value));setBad(false)},[value]);
  const commit=()=>{const v=text.trim()==='φ'?1.6180339887:parseRatio(text);if(!(v>=spec.min&&v<=spec.max)){setBad(true);return}setBad(false);onSet(name,v)};
  return h('div',{title:hint,style:{display:'grid',gridTemplateColumns:'minmax(0,7.6rem) minmax(0,1fr)',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:28}},
   h('span',null,label),
   h('div',{style:{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}},
    ...chips.map(([t,v])=>h('button',{key:t,type:'button','data-forge-voice-ratio':name+':'+t,onClick:()=>onSet(name,v),
     style:{padding:'2px 7px',borderRadius:4,border:'1px solid '+(Math.abs(v-value)<1e-6?accent:'#334155'),background:Math.abs(v-value)<1e-6?accent+'22':'transparent',color:'#e2e8f0',fontSize:11}},t)),
    h('input',{type:'text','aria-label':label+' (ratio or number)','data-forge-voice-ratio-input':name,value:text,onChange:e=>setText(e.target.value),onBlur:commit,onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();commit()}},
     style:{width:'4.6rem',padding:'2px 5px',borderRadius:4,border:'1px solid '+(bad?'#f87171':'#334155'),background:'#0b1220',color:'#f1f5f9',fontSize:11}}),
    name==='equave'?h('span',{style:{color:'#94a3b8'}},cents(value)):null,
    bad?h('span',{role:'alert',style:{color:'#fca5a5'}},'Use '+spec.min+' … '+spec.max+', e.g. 3/2'):null));
 }

 /* Pictures. Each shows what the renderer will actually read. */
 // A magnifier on the longest note: the terrain around it and the path the two ears travel.
 function drawGaia(ctx,W,H,accent,params,fig){
  const ev=fig.events.slice().sort((a,b)=>(b.endSec-b.startSec)*Math.max(...b.gain)-(a.endSec-a.startSec)*Math.max(...a.gain))[0];
  if(!ev){ctx.fillStyle='#94a3b8';ctx.font='11px monospace';ctx.fillText('Draw a figure: it becomes the landscape.',10,H/2);return}
  const grid=fig.grid,gw=grid.width,gh=grid.height,rowsPerSemi=gh/(12*Math.log2(1000)),hz=ev.pitch[ev.pitch.length>>1];
  const cxg=(ev.startSec+ev.endSec)/2/fig.durationSec*gw,cyg=(1-Math.log(hz/20)/Math.log(1000))*gh-.5;
  const ryg=params.reachPitch*rowsPerSemi,rxg=params.reachTime/fig.durationSec*gw,halfRows=Math.max(4*rowsPerSemi,(Math.abs(params.lift)+1.25)*ryg),halfCols=Math.max(gw*.02,rxg*1.6,halfRows*W/H*.6);
  const image=ctx.createImageData(W,H),columns=new Map();
  for(let x=0;x<W;x++){let gx=Math.round(cxg+(x/(W-1)*2-1)*halfCols);gx=((gx%gw)+gw)%gw;let c=columns.get(gx);if(!c){c=grid.getColumn(gx);columns.set(gx,c)}
   for(let y=0;y<H;y++){const gy=Math.round(cyg+(y/(H-1)*2-1)*halfRows),v=gy>=0&&gy<gh?Math.min(1,c[gy]||0):0,i=(y*W+x)*4;image.data[i]=14+40*v;image.data[i+1]=30+200*v;image.data[i+2]=34+130*v;image.data[i+3]=255}}
  ctx.putImageData(image,0,0);
  const sx=W/2/halfCols,sy=H/2/halfRows,x=W/2,y=H/2,cy=y+params.lift*ryg*sy,lobes=Math.round(params.lobes);
  for(const [color,dir,offset] of [['#7dd3fc',1,0],['#fdba74',-1,params.width*.6]]){ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();
   for(let j=0;j<=240;j++){const a=Math.PI*2*j/240,px=x+dir*Math.max(1,rxg*sx)*Math.cos(a),py=cy-ryg*sy*Math.sin(lobes*a+offset);j?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#cbd5e1';ctx.font='10px monospace';ctx.fillText('± '+(halfRows/rowsPerSemi).toFixed(1)+' st · ± '+Math.round(halfCols/gw*fig.durationSec*1000)+' ms around the longest note',6,H-5);
 }
 function drawHildegard(ctx,W,H,accent,params,fig){
  const dsp=__ForgeVoicesRuntime.dsp(),tones=dsp.scaleOf(fig.events),P2=Math.round(params.partials),spec=dsp.mirrorSpectrum(tones,{partials:P2,mirror:params.mirror,equave:params.equave});
  const top=Math.log(P2+1),X=r=>8+Math.log(r)/top*(W-16),slope=2.2-1.7*params.tilt;
  ctx.strokeStyle='#33415588';ctx.lineWidth=1;for(let k=1;k<=P2;k++){ctx.beginPath();ctx.moveTo(X(k),H-14);ctx.lineTo(X(k),H-8);ctx.stroke()}
  spec.ratios.forEach((r,k)=>{const a=Math.pow(k+1,-slope*.45),moved=Math.abs(Math.log(r/(k+1)))>.002;ctx.strokeStyle=moved?accent:'#e2e8f0';ctx.lineWidth=moved?2:1.2;ctx.beginPath();ctx.moveTo(X(r),H-16);ctx.lineTo(X(r),H-16-a*(H-30));ctx.stroke()});
  ctx.fillStyle='#94a3b8';ctx.font='10px monospace';ctx.fillText(tones.length<2?'One pitch only: add a second note to mirror':tones.length+' tones · '+spec.intervals.length+' intervals · '+spec.ratios.filter((r,k)=>Math.abs(Math.log(r/(k+1)))>.002).length+' overtones moved',8,11);
 }
 function drawIsolde(ctx,W,H,accent,params,fig){
  const E=params.equave,D=Math.max(1,Math.min(Math.round(params.density),Math.floor(Math.log(E)/Math.log(1.07)))),step=Math.log(E)/D,ev=fig.events[0],hz=ev?ev.pitch[0]:220;
  const cx=W/2,cy=H/2+2,R=Math.min(W,H)/2-8,lo=Math.log(20),range=Math.log(1000),half=params.span/2;
  ctx.strokeStyle='#475569';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<=600;i++){const lf=lo+range*i/600,a=lf/Math.log(E)*Math.PI*2,r=4+(lf-lo)/range*R,x=cx+r*Math.cos(a),y=cy-r*Math.sin(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
  for(let n=Math.ceil((lo-Math.log(hz))/step);;n++){const lf=Math.log(hz)+n*step;if(lf>lo+range)break;const u=(lf-Math.log(params.center))/Math.LN2/half,w=Math.abs(u)<1?Math.cos(Math.PI*u/2)**2:0;
   const a=lf/Math.log(E)*Math.PI*2,r=4+(lf-lo)/range*R;ctx.fillStyle=w>0?accent:'#475569';ctx.globalAlpha=w>0?.35+.65*w:.6;ctx.beginPath();ctx.arc(cx+r*Math.cos(a),cy-r*Math.sin(a),w>0?2+4*w:1.5,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
  if(params.pulse>0){const rates=[-2,-1,0,1,2].map(o=>Math.max(1,Math.round(params.pulseRate*Math.pow(params.pulseRatio,o))));ctx.fillStyle='#94a3b8';ctx.font='10px monospace';ctx.fillText('pulses / loop: '+rates.join(' · '),8,H-5)}
 }
 const DRAW={gaia:drawGaia,hildegard:drawHildegard,isolde:drawIsolde};
 function Picture({engine,params,accent}){
  const h=P.createElement,ref=P.useRef(null),grid=pe(s=>s.spectralData),version=pe(s=>s.renderVersion),material=pe(s=>s.materialExport),W=320,H=engine==='isolde'?150:120;
  const fig=P.useMemo(()=>__ForgeVoicesRuntime.figure(),[grid,version,material.bars,material.bpm,material.beatsPerBar]);
  P.useEffect(()=>{const canvas=ref.current,ctx=canvas?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);
   try{DRAW[engine](ctx,W,H,accent,params,fig)}catch(error){ctx.fillStyle='#fca5a5';ctx.font='11px monospace';ctx.fillText('Picture unavailable',10,20)}
  },[engine,params,fig,accent]);
  return h('canvas',{ref,width:W,height:H,'data-forge-voice-picture':engine,role:'img','aria-label':engine==='gaia'?'Terrain with the orbit of the longest note; blue is the left ear, orange the right':engine==='hildegard'?'Overtones of each note; coloured lines were moved onto intervals of the figure':'Spiral of partials; bright dots are audible',
   style:{width:'100%',height:'auto',aspectRatio:W+' / '+H,display:'block',borderRadius:5,border:'1px solid '+accent+'55',background:'#070b12'}});
 }

 function Lab({engine}){
  const h=P.createElement,spec=__ForgeVoices.spec,def=spec.engines[engine],[accent,deep,ground]=ACCENT[engine];
  const recipe=P.useSyncExternalStore(__ForgeVoices.subscribe,()=>__ForgeVoices.snapshot()[engine]),report=P.useSyncExternalStore(__ForgeVoices.subscribe,__ForgeVoices.lastReport),failure=P.useSyncExternalStore(__ForgeVoices.subscribe,__ForgeVoices.lastError);
  const [draft,setDraft]=P.useState(recipe.params),pending=P.useRef(null),[more,setMore]=P.useState(false);
  P.useEffect(()=>{pending.current=null;setDraft(recipe.params)},[recipe]);
  // Commit = one recipe change. If the figure was sounding, it is rendered again and keeps playing.
  // The Forge prepares the new sound by itself; playback resumes as soon as that is ready.
  const resume=P.useRef(null),forget=()=>{if(resume.current){resume.current();resume.current=null}};P.useEffect(()=>forget,[]);
  const apply=next=>{const sounding=__ForgeTransportAccess.snapshot().phase==='playing'||!!resume.current;forget();
   if(__ForgeVoices.set(engine,next)===recipe||!sounding)return;
   let seenBusy=false;const again=()=>{const phase=__ForgeTransportAccess.snapshot().phase;if(phase!=='idle'){seenBusy=true;return}if(!seenBusy)return;forget();
     if(__ForgeVoices.engineOf(pe.getState().carrierIntegralSelection?.machineId)===engine)__ForgeTransportAccess.activate()};
   const off=__ForgeTransportAccess.subscribe(again),settle=setTimeout(()=>{seenBusy=true;again()},450),limit=setTimeout(forget,20000);
   resume.current=()=>{off();clearTimeout(settle);clearTimeout(limit)}};
  const live=(name,value)=>{pending.current={...(pending.current??recipe.params),[name]:value};setDraft(pending.current)};
  const commit=()=>{if(pending.current){const params=pending.current;pending.current=null;apply({preset:null,params})}};
  const setNow=(name,value)=>{pending.current=null;apply({preset:null,params:{...recipe.params,[name]:value}})};
  const slider=([name,label,format,hint])=>h(Slider,{key:name,engine,name,label,format,hint,value:draft[name],spec:def.params[name],accent,onLive:live,onCommit:commit});
  const ratio=name=>h(RatioField,{key:name,name,value:recipe.params[name],spec:def.params[name],accent,onSet:setNow});
  const box={border:'1px solid '+accent+'33',borderRadius:6,padding:'8px 9px',marginTop:8,background:ground},head={fontSize:10,letterSpacing:'.12em',textTransform:'uppercase',color:accent,marginBottom:4};
  const own=report?.engine===engine?report:null,db=v=>(20*Math.log10(Math.max(v,1e-6))).toFixed(1);
  return h('section',{'data-forge-voice-lab':engine,style:{padding:'8px 0',color:'#e2e8f0',minWidth:0}},
   h('div',{style:{display:'flex',alignItems:'baseline',gap:8}},h('span',{'aria-hidden':true,style:{fontSize:20,color:accent}},def.glyph),h('strong',{style:{letterSpacing:'.08em'}},def.title.toUpperCase())),
   h('p',{style:{fontSize:11,lineHeight:1.5,color:'#a8b3c4',margin:'5px 0 8px'}},def.summary),
   h(Picture,{engine,params:draft,accent}),
   h('div',{role:'group','aria-label':def.label+' presets',style:{display:'flex',flexWrap:'wrap',gap:5,marginTop:8}},
    ...def.presets.map(p=>h('button',{key:p.id,type:'button','data-forge-voice-preset':p.id,'aria-pressed':recipe.preset===p.id,onClick:()=>{pending.current=null;apply(spec.preset(engine,p.id))},
     style:{padding:'4px 9px',borderRadius:999,border:'1px solid '+(recipe.preset===p.id?accent:'#334155'),background:recipe.preset===p.id?deep:'#0b1220',color:'#f1f5f9',fontSize:11}},p.name))),
   h('div',{style:box},h('div',{style:head},engine==='gaia'?'Orbit':engine==='hildegard'?'Spectrum & touch':'Spiral'),
    engine==='isolde'?ratio('equave'):null,...META[engine].map(slider),engine==='hildegard'?ratio('equave'):null,
    engine==='isolde'?[ratio('pulseRate'),ratio('pulseRatio')]:null),
   h('div',{style:box},
    h('button',{type:'button','aria-expanded':more,'data-forge-voice-more':true,onClick:()=>setMore(v=>!v),style:{...head,background:'none',border:0,padding:0,cursor:'pointer',width:'100%',textAlign:'left',marginBottom:more?4:0}},(more?'▾ ':'▸ ')+'Envelope, stereo & room'),
    more?[...META.common.map(slider),
     h('label',{key:'wrap',title:'Off: tails are cut at the end, for one-shot samples.',style:{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'#cbd5e1',minHeight:26}},
      h('input',{type:'checkbox','data-forge-voice-param':'tailWrap',checked:recipe.params.tailWrap>=.5,onChange:e=>setNow('tailWrap',e.target.checked?1:0),style:{accentColor:accent}}),'Tails continue at the loop start (seamless loop)')]:null),
   h('div',{style:{display:'flex',gap:8,alignItems:'center',marginTop:8}},
    h('button',{type:'button','data-forge-voice-reset':true,onClick:()=>{pending.current=null;apply(spec.recipe(engine))},style:{padding:'4px 9px',borderRadius:4,border:'1px solid #334155',background:'#0b1220',color:'#cbd5e1',fontSize:11}},'Reset '+def.label),
    h('span',{style:{fontSize:10,color:'#7c8798'}},'Play below renders the figure with these settings.')),
   h('p',{role:'status','aria-live':'polite','data-forge-voice-status':failure?'error':own?'rendered':'idle',style:{fontSize:11,lineHeight:1.5,minHeight:32,margin:'8px 0 0',color:failure?'#fca5a5':'#9fb3c8'}},
    failure||(own?own.notes+' notes'+(own.omitted?' (the '+own.notes+' strongest of '+(own.notes+own.omitted)+')':'')+' · peak '+db(own.peak)+' dBFS'+(own.guardDb<-.05?' · levelled '+own.guardDb.toFixed(1)+' dB to stay clean':'')+(own.roomSeconds?' · room '+own.roomSeconds.toFixed(1)+' s':'')+
     (own.resonators?' · '+own.resonators+' halo strings':'')+(own.components?' · '+own.components+' partials per note':''):'Stereo · exact pitch · tails wrap into the loop')));
 }
 return {Lab,parseRatio};
})();
const ForgeVoiceLab=__ForgeVoiceUI.Lab;
