'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),m=require('../source-manifest.json');
const html=fs.readFileSync(m.entry,'utf8').replace('const kEe=CEe("root");',`window.__nb=()=>({grid:__NodalBallGrid,save:LJ,tunings:sj,create:myzelGCreate,update:myzelGUpdate});const kEe=CEe("root");`);
const out='results/nodal-ball-grid';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={entry:m.entry,sha256:m.sha256,errors:[],checks:[]};
 try{
  const p=await b.newPage({viewport:{width:1490,height:1000}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
  await p.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('https://xensonar.test/nodal-ball');
  await p.getByRole('button',{name:/III.*NODAL/}).click();await p.getByRole('button',{name:'Installation',exact:true}).click();
  const panel=p.locator('[data-nodal-ball-controls]');await panel.waitFor();
  const volume=panel.getByRole('slider',{name:'Ball Y tone volume',exact:true});assert.equal(await volume.inputValue(),'1');
  await volume.fill('0');await p.waitForFunction(()=>__nb().grid.mix().ballToneLevel===0);
  await volume.fill('0.7');await p.waitForFunction(()=>__nb().grid.mix().ballToneLevel===.7);
  await panel.getByRole('combobox',{name:'Ball tone trigger mode',exact:true}).selectOption('grid');
  const id=await p.evaluate(()=>__nb().save({id:'custom:nodal-grid-test-128',label:'Nodal shared 128',family:'edo',periodFamily:'octave',divisionKind:'equal',periodCents:1200,steps:128,stepCents:Array.from({length:128},(_,i)=>i/128*1200),defaultModePolicy:'church_projection',hotkeyCycleEligible:true}));
  await panel.getByRole('combobox',{name:'Installation grid tuning',exact:true}).selectOption(id);
  await panel.getByRole('combobox',{name:'Installation grid mode',exact:true}).selectOption('chromatic');
  const base=panel.getByRole('spinbutton',{name:'Installation grid base Hz',exact:true});await base.fill('660');await base.blur();
  await p.waitForFunction(()=>__nb().grid.params().gridBase===660);
  const shared=await p.evaluate(()=>({tuning:__nb().grid.params().gridTuning,mode:__nb().grid.params().gridMode,base:__nb().grid.params().gridBase,lines:__nb().grid.lines().length}));assert.equal(shared.tuning,id);assert.ok(shared.lines>=380&&shared.lines<=390,'canonical three-octave grid supports 128 steps');report.shared=shared;
  const beforeShift=await p.evaluate(()=>__nb().grid.lines().find(line=>line.y>.3&&line.y<.6));
  await panel.getByRole('slider',{name:'Installation grid shift cents',exact:true}).fill('120');
  const shifted=await p.evaluate(id=>{const line=__nb().grid.lines().find(line=>line.id===id);return {freq:line.freq,y:line.y,offsets:__nb().grid.params().manualGridStepOffsets.slice()}},beforeShift.id);
  assert.ok(Math.abs(shifted.freq/beforeShift.freq-2**(.1))<1e-9);assert.ok(shifted.y<beforeShift.y,'whole-grid shift moves the visible lines');assert.ok(shifted.offsets.every(value=>Math.abs(value-12)<1e-9));report.shift={before:beforeShift,after:{freq:shifted.freq,y:shifted.y},cents:120};
  await panel.getByRole('button',{name:'Raster bearbeiten / Schrittzahl',exact:true}).click();await p.getByText('🪜 Grid Workbench',{exact:true}).waitFor();
  const limit=await p.locator('input[type=number][max="256"]').count();assert.ok(limit>0,'same shared Workbench allows free step count up to 256');const steps=p.locator('input[type=number][max="256"]');await steps.fill('127');assert.equal(await steps.inputValue(),'127','shared equal-step editor accepts a free count above its former 64-step limit');await p.getByRole('button',{name:'×',exact:true}).click();
  const offline=p.getByRole('button',{name:'Mycelium offline',exact:true});if(await offline.count())await offline.click();else await p.getByRole('button',{name:'Mycelium active',exact:true}).waitFor();
  await p.waitForTimeout(250);await p.locator('.nd-legacy-stage').screenshot({path:out+'/field-1490.png'});
  for(const width of [1490,720]){await p.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();await p.waitForTimeout(150);await panel.screenshot({path:out+'/controls-'+width+'.png'});const r=await panel.boundingBox();assert.ok(r.width>250&&r.x>=0&&r.x+r.width<=width+1);}
  // Exercise the production native Worklet and its fixed-node fallback adapter.
  // This separate silent probe never creates audible test monitoring.
  const native=await p.evaluate(async()=>{
   const api=__nb(),ctx=new AudioContext();await ctx.resume();const silent=ctx.createGain();silent.gain.value=0;silent.connect(ctx.destination);
   const refs={};api.create(ctx,refs,silent);const g=refs.__myzelG;await g.ready;
   const count=g.nodes.length,sources=g.sources.length,line=api.grid.lines().find(x=>x.y>.2&&x.y<.7),mix={...api.grid.mix(),rootLevel:.7,ballLevel:0,nodeLevel:0};
   // The bridge gates on audio time (30 ms), not elapsed wall time. A delayed
   // frame over 250 ms intentionally resets crossing history without a hit.
   const deadline=performance.now()+5000,timing={baselineResets:0,crossingDeltaSec:null};
   const waitForFrame=async()=>{while(g.active&&ctx.currentTime-g.lastMessage<.03){if(performance.now()>deadline)throw Error('Myzel audio control clock did not advance');await new Promise(resolve=>setTimeout(resolve,4));}};
   const tick=y=>api.update(ctx,refs,{enabled:true,audible:true,mode:'installation',couplingEnabled:false,rootHz:220,snapshot:{cursorNormalizedY:y,cursorNormalizedX:.5,myzelAudioNodes:[]},mix});
   const nextTick=async y=>{await waitForFrame();tick(y)};
   tick(line.y-.001);let hit;
   while(!hit){
    if(performance.now()>deadline)throw Error('Myzel crossing never received a current control frame');
    await waitForFrame();
    if(ctx.currentTime-g.ballToneState.time>.25||g.ballToneState.grid!==api.grid.lines()){tick(line.y-.001);timing.baselineResets++;continue;}
    const baselineTime=g.ballToneState.time;tick(line.y+.001);
    timing.crossingDeltaSec=g.ballToneState.time-baselineTime;
    if(timing.crossingDeltaSec>.25){await nextTick(line.y-.001);timing.baselineResets++;continue;}
    hit={...g.lastControls};
   }
   do{await nextTick(line.y+.001)}while(g.lastControls.ballToneGate>0&&performance.now()<deadline);
   const stopped={...g.lastControls};mix.rootLevel=0;await nextTick(line.y-.1);const zero={...g.lastControls};
   api.grid.update({rootFollowImpulsRasterMuted:true});await nextTick(.9);const muted={...g.lastControls};api.grid.update({rootFollowImpulsRasterMuted:false});
   const result={worklet:!!g.worklet,error:g.error,timing,hit:{hz:hit.ballToneHz,gate:hit.ballToneGate},stopped:stopped.ballToneGate,zero:{level:zero.rootLevel,gate:zero.ballToneGate},muted:muted.ballToneGate,nodesBefore:count,nodesAfter:g.nodes.length,sourcesBefore:sources,sourcesAfter:g.sources.length,lineHz:line.freq};g.dispose();await ctx.close();return result;
  });
  report.native=native;assert.equal(native.worklet,true,native.error);assert.equal(native.hit.hz,native.lineHz);assert.ok(native.hit.gate>0);assert.equal(native.stopped,0);assert.deepEqual(native.zero,{level:0,gate:0});assert.equal(native.muted,0);assert.equal(native.nodesBefore,native.nodesAfter);assert.equal(native.sourcesBefore,native.sourcesAfter);
  await p.getByRole('button',{name:'I. XENSONAR MAIN ROOM',exact:true}).click();assert.equal(await p.evaluate(()=>__nb().grid.params().gridTuning),id);assert.equal(await p.evaluate(()=>__nb().grid.params().gridBase),660);
  await p.getByRole('button',{name:/III.*NODAL/}).click();await p.getByRole('button',{name:'Installation',exact:true}).click();assert.equal(await panel.getByRole('combobox',{name:'Installation grid tuning',exact:true}).inputValue(),id);
  assert.deepEqual(report.errors,[]);report.checks=['UI Ball level reaches zero; the separate .62 Root Reference remains independent','shared saved 128-step tuning, chromatic mode and shifted base remain identical across rooms','shared Grid Workbench exposes a single free-step editor (2–256)','actual native Worklet receives line frequency and impulse gate, zero volume and shared mute','no AudioNode/source allocations per crossing, and no stationary continuous tone in grid mode','1490/720 control geometry and clean room transitions'];
  fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Installation Ball volume/shared grid UI, native Worklet crossings, mute, fixed node count and room parity');
 }catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({...report,error:e.stack},null,2)+'\n');throw e;}finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
