'use strict';
// DRUM-ECHO-LANES-01 + DRUM-HALL-01 in the LIVE ROOM (resident drum voices): with only Kick ticked, every kick hit is played once
// more into the echo input (one extra voice output, as many hits as kicks) and nothing else; with all ticked there is no extra
// output. A snare with Last Drum Hit · Hall is played once more into the hall input.
// Usage: node tests/e2e/drum_live_echo_hall.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{window.__dg={o:{},on:false};const pm=MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage=function(m,...r){if(__dg.on&&m&&m.t==='hit')__dg.o[m.o]=(__dg.o[m.o]||0)+1;return pm.call(this,m,...r)}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 // beat: kick on 1 and 9, snare on 5 and 13 (with hall on the second snare), hats on the offbeats
 await E(`(()=>{const g=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit?.grid||__mlGridFromSelection(__mlSharedDrumMachine.snapshot));
   for(const l of g.laneOrder)g.laneSteps[l]=g.laneSteps[l].map(()=>0);g.stepPrograms={};
   for(let i=0;i<g.stepCount;i+=16){g.laneSteps.kick[i]=1;g.laneSteps.kick[i+8]=1;g.laneSteps.snare[i+4]=1;g.laneSteps.snare[i+12]=1;for(const k of [2,6,10,14])g.laneSteps.hatClosed[i+k]=.7}
   g.useCustom=true;__f52CommitSharedDrumGrid(g);return 1})()`);
 const run=async(mask,sec=4)=>{await E(`__f48PatchRack({...__f48RackParams,drumEcho:.5,drumEchoLanes:${mask}})`);await p.waitForTimeout(300);
  await p.evaluate(()=>{__dg.o={};__dg.on=true});await p.waitForTimeout(sec*1000);return p.evaluate(()=>{__dg.on=false;return {...__dg.o}})};
 await E(`__NodalBallGrid.update({drumActive:true})`);await p.waitForTimeout(3500);
 const all=await run(4095);
 const kick=await run(1);
 const tot=o=>Object.values(o).reduce((a,b)=>a+b,0);
 const extraOf=(o,base)=>Object.keys(o).filter(k=>!(k in base));
 assert.ok(tot(all)>10,'drums are playing live: '+JSON.stringify(all));
 const xk=extraOf(kick,all);
 assert.equal(xk.length,1,'one extra (echo) output with only Kick ticked: '+JSON.stringify({all,kick}));
 const ratio=kick[xk[0]]/tot(kick);
 assert.ok(ratio>.12&&ratio<.32,'the echo copies are the kicks only (~2 of 8 hits per bar + copies): '+ratio.toFixed(2)+' '+JSON.stringify(kick));
 // hall on every second snare
 await E(`(()=>{const g=__f52EnsureDrumGrid(__mlSharedDrumMachine.liveEdit.grid);for(let i=12;i<g.stepCount;i+=16)__f52PatchDrumHit('snare',i,'hall',.8);return 1})()`);
 await p.waitForTimeout(600);
 const hall=await run(4095);
 const xh=extraOf(hall,all);
 assert.equal(xh.length,1,'one extra (hall) output: '+JSON.stringify({all,hall}));
 const hr=hall[xh[0]]/tot(hall);
 assert.ok(hr>.04&&hr<.16,'hall copies = the snares with hall (1 of 8 hits per bar): '+hr.toFixed(2)+' '+JSON.stringify(hall));
 assert.deepEqual(errs,[]);
 console.log('PASS live room: echo copies only for Kick ('+(ratio*100).toFixed(0)+'% of voices), none with all ticked; hall copies for the snare with hall ('+(hr*100).toFixed(0)+'%)');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
