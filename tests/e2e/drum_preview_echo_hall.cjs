'use strict';
// DRUM-ECHO-LANES-01 + DRUM-HALL-01 in the drum PREVIEW (pre-rendered stem): with a lane selection the Dub Echo gets a companion
// stem in which only the ticked lanes play (in step with the drum stem, into the rack's echo input); the Last Drum Hit hall is
// rendered into the stem (a hit with hall rings on where the dry stem is silent).
// Usage: node tests/e2e/drum_preview_echo_hall.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));if(process.env.DBG)p.on('console',m=>{if(m.type()==='warning'&&/drum-echo/.test(m.text()))console.error('W',m.text().slice(0,300))});
 await p.goto('file://'+html);
 await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-drum-pattern-manager')));
 await p.waitForSelector('[data-drum-echo-panel]',{timeout:10000});
 // a clear test beat: kick on 1, snare on 5, hats in between (first 16 steps)
 await E(`(()=>{const g=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
   for(const l of g.laneOrder)g.laneSteps[l]=g.laneSteps[l].map(()=>0);
   g.laneSteps.kick[0]=1;g.laneSteps.snare[4]=1;g.laneSteps.hatClosed[2]=.8;g.laneSteps.hatClosed[6]=.8;g.stepPrograms={};__f52CommitSharedDrumGrid(g);return 1})()`);
 // echo on, only Kick ticked
 await E(`__f48PatchRack({...__f48RackParams,drumEcho:.6,drumEchoLanes:__xenDrumEchoLaneBit('kick')})`);
 await p.getByRole('button',{name:'Preview Drums'}).first().click();
 await p.waitForFunction(()=>window.__xenProbe.draw.evalInBundle('!!(b9e()&&b9e().stemBuffers.has("__drums__"))'),null,{timeout:30000});
 await p.waitForFunction(()=>window.__xenProbe.draw.evalInBundle('!!(__xenEchoComp&&__xenEchoComp.source)'),null,{timeout:30000});
 const cmp=await E(`(()=>{const full=b9e().stemBuffers.get('__drums__'),comp=__xenEchoComp.source.buffer;
   const rms=(buf,a,z)=>{const d=buf.getChannelData(0),i0=Math.floor(a*buf.sampleRate),i1=Math.min(d.length,Math.floor(z*buf.sampleRate));let s=0;for(let i=i0;i<i1;i++)s+=d[i]*d[i];return Math.sqrt(s/Math.max(1,i1-i0))};
   const step=b9e().drumRenderRequest?((b9e().totalDurationSec||full.duration)/(b9e().totalSteps||16)):0;
   return JSON.stringify({step,kickFull:rms(full,0,step*.9),kickComp:rms(comp,0,step*.9),snareFull:rms(full,4*step,4.9*step),snareComp:rms(comp,4*step,4.9*step),key:__xenEchoComp.key})})()`).then(JSON.parse);
 assert.ok(cmp.kickComp>.02&&Math.abs(cmp.kickComp-cmp.kickFull)/cmp.kickFull<.35,'the companion holds the kick: '+JSON.stringify(cmp));
 assert.ok(cmp.snareFull>.02&&cmp.snareComp<cmp.snareFull*.15,'…and no snare: '+JSON.stringify(cmp));
 // all ticked → companion gone; none → none
 await E(`__f48PatchRack({...__f48RackParams,drumEchoLanes:__xenDrumEchoLaneAll})`);await p.waitForTimeout(200);
 assert.equal(await E('__xenEchoComp'),null,'all drums: the drum bus feeds the echo, no companion');
 // hall baked into the stem: the snare with full hall rings where the dry stem is quiet
 const hall=await E(`(async()=>{const req=JSON.parse(JSON.stringify({...b9e().drumRenderRequest,signal:undefined}));req.customDrumPattern=__xenDrumEchoLaneGrid(b9e().drumRenderRequest);req.drumPattern=undefined;
   const dry=await __mlGetStem(req,'__drums__');const wet=JSON.parse(JSON.stringify(req));
   const cp=wet.customDrumPattern;cp.stepPrograms=cp.stepPrograms||{};cp.stepPrograms.snare=cp.stepPrograms.snare||[];cp.stepPrograms.snare[4]={...WH(cp.stepPrograms.snare[4],'snare',4,1),hall:1};
   const hb=await __mlGetStem(wet,'__drums__');const step=__mlStemPeriodSec(b9e(),'__drums__',req)/Math.max(1,cp.stepCount||16);
   const rms=(buf,a,z)=>{const d=buf.getChannelData(0),i0=Math.floor(a*buf.sampleRate),i1=Math.min(d.length,Math.floor(z*buf.sampleRate));let s=0;for(let i=i0;i<i1;i++)s+=d[i]*d[i];return Math.sqrt(s/Math.max(1,i1-i0))};
   return JSON.stringify({dry:rms(dry,7.2*step,15.5*step),wet:rms(hb,7.2*step,15.5*step),step,len:dry.duration,steps:cp.stepCount})})()`).then(JSON.parse);
 assert.ok(hall.wet>hall.dry*4&&hall.wet>.003,'the snare hall rings on after the last hit: '+JSON.stringify(hall));
 assert.deepEqual(errs,[]);
 console.log('PASS preview: echo companion = kick only ('+cmp.kickComp.toFixed(3)+' vs snare '+cmp.snareComp.toFixed(4)+'), all → none; hall in the stem '+hall.dry.toExponential(1)+' → '+hall.wet.toExponential(1));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
