'use strict';
// DRUM-HALL-01 (real app): a single drum hit gets a long hall (Last Drum Hit · Hall). The step program keeps `hall` (0…1,
// saved with the beat), the hit editor shows the slider, and the rack's hall input rings for seconds (measured on the live context).
// Usage: node tests/e2e/drum_hit_hall.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+html);
 await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 // step program normalisation keeps and bounds the hall amount
 assert.equal(await E(`WH({hall:.7},'kick',0,1).hall`),.7);
 assert.equal(await E(`WH({hall:3},'kick',0,1).hall`),1);
 assert.equal(await E(`WH({},'kick',0,1).hall`),0,'old beats: no hall');
 // the hit editor writes it into the live beat
 const hall=await E(`(()=>{const g=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
   const lane=g.laneOrder[0];g.laneSteps[lane][0]=1;__f52CommitSharedDrumGrid(g);__f52PatchDrumHit(lane,0,'hall',.55);
   const h=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit.grid);return WH(h.stepPrograms?.[lane]?.[0],lane,0,1).hall})()`);
 assert.equal(hall,.55,'Last Drum Hit · Hall stored with the hit');
 // the rack's hall rings for seconds
 const ring=await E(`(async()=>{const ctx=new AudioContext();await ctx.resume();const an=ctx.createAnalyser();an.fftSize=2048;
   const rack=__f48GetDrumRack(ctx,an);rack.update({...__f48RackParams});const tap=rack.hallTap();
   const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=220;g.gain.value=0;o.connect(g);g.connect(tap);
   const t=ctx.currentTime+.05;g.gain.setValueAtTime(.9,t);g.gain.setValueAtTime(0,t+.06);o.start(t);o.stop(t+.1);
   const rms=()=>{const d=new Float32Array(an.fftSize);an.getFloatTimeDomainData(d);let s=0;for(const x of d)s+=x*x;return Math.sqrt(s/d.length)};
   const at=async sec=>{while(ctx.currentTime<t+sec)await new Promise(r=>setTimeout(r,20));return rms()};
   const r1=await at(.5),r25=await at(2.5),r9=await at(9.2);rack.dispose?.();await ctx.close();return JSON.stringify({r1,r25,r9})})()`).then(JSON.parse);
 assert.ok(ring.r1>1e-3,'hall audible after 0.5 s: '+JSON.stringify(ring));
 assert.ok(ring.r25>ring.r1*.05&&ring.r25>2e-4,'still ringing after 2.5 s (long hall): '+JSON.stringify(ring));
 assert.ok(ring.r9<ring.r25,'decays: '+JSON.stringify(ring));
 assert.deepEqual(errs,[]);
 console.log('PASS DRUM-HALL-01 hit program keeps hall (bounded, stored), rack hall rings '+ring.r1.toExponential(1)+' → '+ring.r25.toExponential(1)+' (2.5 s) → '+ring.r9.toExponential(1)+' (9 s)');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
