'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),manifest=require('../source-manifest.json');
const html=fs.readFileSync(manifest.entry,'utf8').replace('const kEe=CEe("root");',`window.__smooth=()=>({makeBus:sh,controller:dZ,guard:QZ,state:()=>pe.getState(),store:pe,persistence:__f333Persistence});const kEe=CEe("root");`).replace('const projectSnapshot = state.createProjectSnapshot();','window.__smoothAutosaveCopies=(window.__smoothAutosaveCopies||0)+1;const projectSnapshot = state.createProjectSnapshot();');
const out='results/forge-smoothness';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={entry:manifest.entry,sha256:manifest.sha256,errors:[],checks:[]};
 try{
  const page=await browser.newPage({viewport:{width:1490,height:1000}});page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/smoothness');await page.waitForFunction(()=>typeof window.__smooth==='function');
  const rendered=await page.evaluate(async()=>{
   const api=__smooth(),roles=['main','drone','rhythm','space'],refNames=['finalMixBusRef','drumMixBusRef','masterMixBusRef','finalLimiterRef','finalClipperRef','finalOutputTrimRef','finalMixAnalyserRef','preFxTapAnalyserRef','postFxTapAnalyserRef','monitorTapAnalyserRef','liveMasteringRef'];
   async function render({enabled,antiphase=false}){
    const sr=48000,ctx=new OfflineAudioContext(2,sr*2,sr),refs=Object.fromEntries(refNames.map(k=>[k,{current:null}]));refs.audioTapScratchRef={current:{}};
    const counts={};for(const method of ['createGain','createBiquadFilter','createDynamicsCompressor','createWaveShaper','createAnalyser']){const make=ctx[method].bind(ctx);ctx[method]=(...args)=>{counts[method]=(counts[method]||0)+1;return make(...args)}}
    api.makeBus(ctx,refs);const master=refs.liveMasteringRef.current;
    if(antiphase){const buffer=ctx.createBuffer(2,sr*2,sr),a=buffer.getChannelData(0),b=buffer.getChannelData(1);for(let i=0;i<a.length;i++){a[i]=.12*Math.sin(2*Math.PI*220*i/sr);b[i]=-a[i]}const src=ctx.createBufferSource();src.buffer=buffer;src.connect(master.inputs.main);src.start();}
    else for(let role=0;role<4;role++)for(let voice=0;voice<8;voice++){
     const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();osc.frequency.value=55+role*91+voice*17;pan.pan.value=(voice%3-1)*.7;
     gain.gain.setValueAtTime(.035,0);gain.gain.setValueAtTime(.8,.55);gain.gain.setValueAtTime(.035,1.15);gain.gain.linearRampToValueAtTime(0,1.8);osc.connect(gain);gain.connect(pan);pan.connect(master.inputs[roles[role]]);osc.start();osc.stop(1.85);
    }
    const settings={schwarmUi:{updateMs:100},liveMasteringRef:refs.liveMasteringRef,finalOutputTrimRef:refs.finalOutputTrimRef,liveMasteringEnabled:enabled,liveMasteringStrength:.5,liveMasteringGlue:.45,liveMasteringAir:.35,setLiveMasterMonitor(){}};
    const task=api.controller(settings).find(t=>t.id==='live-mastering'),initialNodes=JSON.stringify(counts),meters=[];
    const run=()=>{task.run({audioNow:ctx.currentTime,perfNow:ctx.currentTime*1000});meters.push({...master.telemetry});};run();
    const pauses=[];for(let t=.084;t<1.9;t+=.084)pauses.push(ctx.suspend(t).then(async()=>{run();await ctx.resume()}));
    const buffer=await ctx.startRendering();await Promise.all(pauses);if(JSON.stringify(counts)!==initialNodes)throw Error('control updates allocated audio nodes');
    const samples=[buffer.getChannelData(0).slice(),buffer.getChannelData(1).slice()];let peak=0,energy=[0,0],sideEnergy=0;for(let i=0;i<samples[0].length;i++){for(let c=0;c<2;c++){const x=samples[c][i];if(!Number.isFinite(x))throw Error('Nonfinite master output');peak=Math.max(peak,Math.abs(x));energy[c]+=x*x}sideEnergy+=(samples[0][i]-samples[1][i])**2}
    const guard=api.guard(ctx).report();return {samples,peak,energy,sideEnergy,counts,meters,guard};
   }
   const active=await render({enabled:true}),bypass=await render({enabled:false}),side=await render({enabled:true,antiphase:true});
   const summary=r=>{const {samples,...rest}=r;return rest};return {active:summary(active),bypass:summary(bypass),side:summary(side)};
  });
  report.master=rendered;for(const r of [rendered.active,rendered.bypass,rendered.side]){assert(r.peak>0&&r.peak<=1,'master output peak remains in range');assert(r.energy.every(v=>v>0));assert.equal(r.guard.audibleEdges,1);assert.equal(r.guard.unauthorizedLive,0)}
  assert(rendered.side.sideEnergy>0);report.checks.push('32 real oscillators through four role buses: finite stereo output below 0 dBFS, mastering on/off, one output owner, no audio node allocation during controls');report.checks.push('stereo side signal remains audible through the actual terminal chain');
  // Real controller/store + IndexedDB, without rendering a new sound for each frame.
  await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();await page.getByRole('button',{name:/SpectralForge/}).click();await page.waitForFunction(()=>__smooth().persistence?.status().restoreComplete);
  const autosave=await page.evaluate(async()=>{const api=__smooth();await api.persistence.saveNow();window.__smoothAutosaveCopies=0;
   for(let i=1;i<=70;i++){api.state().setPlayheadPosition(i/70);await new Promise(r=>setTimeout(r,16))}await new Promise(r=>setTimeout(r,1100));const playbackCopies=window.__smoothAutosaveCopies;api.state().updateMaterialExport({name:'Native autosave edit'});await new Promise(r=>setTimeout(r,1200));return {playbackCopies,afterEdit:window.__smoothAutosaveCopies,lastSavedAt:api.persistence.status().lastSavedAt}});
  report.autosave=autosave;
  assert.equal(autosave.playbackCopies,0);assert.equal(autosave.afterEdit,1);assert(autosave.lastSavedAt>0);report.autosave=autosave;report.checks.push('native IndexedDB autosave: repeated playhead updates do not copy the project; a real name edit saves once');
  assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS native master overload/stereo and IndexedDB autosave');
 }catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({...report,error:error.stack},null,2)+'\n');throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
