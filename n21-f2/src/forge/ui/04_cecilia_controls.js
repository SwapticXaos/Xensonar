

function __F351CombinationRack(){
 const session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot),render=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),wb=P.useSyncExternalStore(__F341Workbench.subscribe,__F341Workbench.getSnapshot,__F341Workbench.getSnapshot);
 const runtime=cU(),recipe=session.recipe,[error,setError]=P.useState('');
 const current=render.result?.key===__F352Runtime.identity(),supported=wb.config.params.materialPilot;
 const slider=(name,label,help,enabled=true)=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[u.jsx('span',{children:label}),u.jsx('output',{htmlFor:'f351-'+name,children:Math.round(recipe[name]*100)+' %'})]}),u.jsx('input',{id:'f351-'+name,type:'range',min:0,max:100,step:1,value:Math.round(recipe[name]*100),disabled:!enabled,'aria-label':'Kombinieren: '+label,'aria-describedby':'f351-explain-'+name,onChange:e=>__F352Session.patch({[name]:Number(e.currentTarget.value)/100})}),u.jsx('small',{id:'f351-explain-'+name,children:help})]},name);
 const audition=async()=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");await __F352Runtime.play();}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const exportAudio=async(format)=>{setError('');try{if(!Vt.selectDonor())throw Error("Please load a donor first.");const state=pe.getState(),blob=format==='flac'?await __f345ExportFlacCurrent(state):await __f333ExportCurrent(state);Yk(blob,Xk(state.materialExport.name)+'_Donor_Cecilia.'+format,'spectralForge/HybridRack');}catch(e){if(e.name!=='AbortError')setError(e.message);}};
 const mode=__F352Session.modes.find(m=>m.id===recipe.mode);
 const phase=render.phase==='rendering'?'Calculated · '+render.stage:current?"Result up to date":render.result?"Recipe changed · recalculate result":"Ready to Render";
 return u.jsxs('div',{className:'f351-combination','data-f351-combination-rack':'true',children:[
  u.jsxs('div',{className:'f351-combo-heading',children:[u.jsx('div',{className:'f351-overline',children:"SOUND BODY"}),u.jsx('h3',{children:"Combine with"}),u.jsx('p',{children:"Donor and Cecilia. One shared musical figure."})]}),
  u.jsxs('label',{className:'f352-enable',children:[u.jsx('input',{type:'checkbox',checked:recipe.enabled,'aria-label':'Klangkombination aktivieren',onChange:e=>__F352Session.patch({enabled:e.currentTarget.checked})}),' Kombination aktiv']}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Klangerzeugung'}),u.jsx('select',{'aria-label':"Combine with Sound Generator",value:'cecilia',children:__F352Session.providers.map(p=>u.jsx('option',{value:p.id,disabled:!p.readyForPilot,children:p.label+(p.readyForPilot?'':" · later")},p.id))})]}),
  u.jsxs('label',{className:'f351-selector',children:[u.jsx('span',{children:'Cecilia · Verbindungsverfahren'}),u.jsx('select',{'aria-label':'Cecilia-Verbindungsverfahren',value:recipe.mode+'|'+(recipe.variantRevision==='original'?'original':'revised'),onChange:e=>{const parts=e.currentTarget.value.split('|');__F352Session.patch({mode:parts[0],variantRevision:parts[1]})},children:__F352Session.modes.flatMap(m=>['original','revised'].map(revision=>u.jsx('option',{value:m.id+'|'+revision,children:m.label+' · '+(revision==='original'?'1':'2')},m.id+'|'+revision)))})]}),
  u.jsxs('p',{className:'f351-method-hint',children:[mode.description,' · ',recipe.variantRevision==='original'?'Variant 1: previous rendering.':'Variant 2: recalculated coloration/coupling (Ü).']}),
  u.jsxs('div',{className:'f351-meter',role:'img','aria-label':"Sound identity: Donor "+Math.round((1-recipe.amount)*100)+' Prozent, Cecilia '+Math.round(recipe.amount*100)+" percent",children:[u.jsx('span',{style:{width:((1-recipe.amount)*100)+'%'}}),u.jsx('span',{style:{width:(recipe.amount*100)+'%'}})]}),
  slider('amount',"Sound Identity","0%: Donor Sustain. 100%: Cecilia. Between them: loudness-aware crossfade."),
  slider('coupling','Zustandskopplung',recipe.mode==='state'?"Noisiness and brightness of selected donor states shape Cecilia; time and pitch remain carrier-controlled.":"Active in States mode.",recipe.mode==='state'),
  slider('color',"Spectral Complement",recipe.mode==='spectral'?"0: blend freely. 100: gently reduce Cecilia in occupied frequency regions. Donor material remains intact.":"Active in Spectral mode.",recipe.mode==='spectral'),
  u.jsx(__F352CeciliaControls,{}),
  !supported?u.jsx('p',{className:'f341-error',role:'status',children:"For blending, choose the “Sound Material · Motion” listening mode. Historical spectral modes remain available separately."}):null,
  u.jsxs('div',{className:'f351-status',role:'status',children:[u.jsx('strong',{children:phase}),render.phase==='rendering'?u.jsx('progress',{max:1,value:render.progress,'aria-label':'Klangkombination Fortschritt'}):null,u.jsx('p',{children:recipe.enabled?"Playback, result image and export use the same rendered sound.":"Activate links the recipe to playback and export."})]}),
  u.jsxs('div',{className:'f352-rack-actions',children:[u.jsx('button',{type:'button',className:'f341-primary',disabled:!recipe.enabled||!supported||!runtime.model,onClick:()=>runtime.phase==='playing'||render.phase==='rendering'?__F352Runtime.stop():void audition(),children:runtime.phase==='playing'||render.phase==='rendering'?"Stop / Cancel":"Listen to Combination"}),...['wav','flac'].map(format=>u.jsx('button',{type:'button',disabled:!recipe.enabled||!supported||!runtime.model||render.phase==='rendering',onClick:()=>void exportAudio(format),children:format.toUpperCase()},format))]}),
  error||render.error?u.jsx('p',{role:'alert',className:'f341-error',children:error||render.error}):null,
  u.jsx('button',{type:'button',className:'f351-reset',onClick:()=>__F352Session.reset(),children:"Reset Combination Recipe"})
 ]});
}
function __F352CeciliaControls(){
 const state=P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState),p=xR('vocal',state.carrierIntegralSynthLab?.readerSettings);
 const change=(name,value)=>{const s=pe.getState(),lab=s.carrierIntegralSynthLab;s.setCarrierIntegralSynthLab({...lab,readerSettings:{...lab.readerSettings,vocal:{...lab.readerSettings?.vocal,[name]:value}},updatedAt:Date.now()});};
 return u.jsxs('details',{className:'f352-cecilia',children:[u.jsx('summary',{children:'Cecilias Klangfarbe'}),...[
  ['vowel',"Vowel Shape",0,4,.05],['formantShift','Formantlage',-10,10,.5],['breath','Hauch',0,.45,.01],['presence',"Presence",0,1,.01]
 ].map(([name,label,min,max,step])=>u.jsxs('label',{className:'f351-control',children:[u.jsxs('span',{className:'f351-control-head',children:[label,u.jsx('output',{children:p[name].toFixed(name==='formantShift'?1:2)})]}),u.jsx('input',{type:'range',min,max,step,value:p[name],'aria-label':'Cecilia '+label,onChange:e=>change(name,Number(e.currentTarget.value))})]},name)),u.jsx('small',{children:"The carrier figure controls pitch motion, onsets and rests. Vowel shape, formant position, breath and presence shape Cecilia."})]});
}

function __F352ResultPanel(){
 const rendering=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot),session=P.useSyncExternalStore(__F352Session.subscribe,__F352Session.getSnapshot,__F352Session.getSnapshot);
 P.useSyncExternalStore(pe.subscribe,pe.getState,pe.getState);const canvas=P.useRef(null),artifact=rendering.result,current=!!artifact&&artifact.key===__F352Runtime.identity();
 P.useEffect(()=>{if(!canvas.current||!artifact?.spectrum)return;const node=canvas.current;let pending=0;const paint=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const {ctx,w,h}=__f341CanvasSetup(node);ctx.fillStyle='#080d18';ctx.fillRect(0,0,w,h);__f341Heatmap(ctx,artifact.spectrum,0,0,w,h);});};paint();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(paint);observer?.observe(node);return()=>{observer?.disconnect();if(pending)cancelAnimationFrame(pending);};},[artifact]);
 return u.jsxs('section',{className:'f352-result-panel','data-f352-result-panel':'true',children:[
  u.jsxs('div',{className:'f352-result-header',children:[u.jsx('strong',{children:(!session.recipe.enabled||session.recipe.amount===0)?(__F341Workbench.getConfig().params.gestaltPilot?"Klanggestalt · Rendered Result":__F341Workbench.getConfig().params.materialPilot?"Sound Material · Combined Result":"Donor Sustain · Combined Result"):'Donor + Cecilia · combined result'}),u.jsx('span',{role:'status',children:rendering.phase==='rendering'?rendering.stage:current?"Current":artifact?"Recipe changed · previous result":"Not calculated yet"})]}),
  rendering.phase==='rendering'?u.jsx('progress',{max:1,value:rendering.progress,'aria-label':'Forge Klangberechnung Fortschritt'}):null,
  artifact?.spectrum?u.jsx('canvas',{ref:canvas,'aria-label':"Spectrum of the Audible Forge Result"}):u.jsx('p',{children:"The carrier figure controls the donor. An enabled blend adds Cecilia."}),
  artifact?u.jsx('p',{className:'f352-result-note',children:"Output: "+(artifact.manifest.audioOrigin==='SOURCE_ONLY'?"original donor audio only":"original donor audio + Cecilia")+' · '+artifact.durationSec.toFixed(2)+' s · '+artifact.sampleRate+' Hz · '+artifact.material.runs.length+" sound events"}):null,
  rendering.error?u.jsx('p',{role:'alert',className:'f341-error',children:rendering.error}):null
 ]});
}
