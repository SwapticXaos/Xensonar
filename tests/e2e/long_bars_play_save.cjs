'use strict';
// LONG-BARS-02 (real app): a 64-bar drum pattern plays through all 64 bars and survives a reload; a 64-bar Melodic Loop keeps its length.
//  1. drum pattern 64 bars with only two kicks (bar 34 and bar 64), Live Room on at 240 BPM: the master output shows the two kicks
//     exactly 30 bars apart and the cycle repeats after 64 bars (a pattern cut at 16/32 bars would place them elsewhere or drop one)
//  2. reload: the pattern still has 64 bars and its kicks at bar 34 and bar 64
//  3. Melodic Loop set to 64 bars keeps 64 after a reload
// Usage: node tests/e2e/long_bars_play_save.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__pk={on:false,list:[],t:0};const C=AudioNode.prototype.connect,taps=new WeakMap();
  AudioNode.prototype.connect=function(dst,...r){const res=C.call(this,dst,...r);try{if(dst instanceof AudioDestinationNode&&!this.__tap){const c=dst.context;let sp=taps.get(c);if(!sp){sp=c.createScriptProcessor(1024,2,2);const z=c.createGain();z.gain.value=0;sp.__tap=z.__tap=1;
   let last=-9;sp.onaudioprocess=ev=>{if(!__pk.on)return;if(!__pk.t)__pk.t=ev.playbackTime;if(ev.playbackTime<__pk.t+1)return;/* skip the tail of the pattern switch */const d=ev.inputBuffer.getChannelData(0);let m=0,at=0;for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>m){m=v;at=i}}if(m>.05){const t=ev.playbackTime+at/c.sampleRate;if(t-last>1){__pk.list.push(+t.toFixed(3));last=t}}};C.call(sp,z);C.call(z,dst);taps.set(c,sp)}C.call(this,sp)}}catch{}return res}});
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(x=>__xenProbe.bridge.patch(x),{drumActive:true,bassActive:false,quantizeBpm:240,rootFollowLoopActive:false,materialLoopActive:false});await p.waitForTimeout(800);
 const bpm=+await E('__NodalBallGrid.params().quantizeBpm');assert.equal(bpm,240,'tempo set');
 const made=JSON.parse(await E(`(()=>{const m=__mlSharedDrumMachine,g0=m.liveEdit?.grid||__mlGridFromSelection(m.snapshot),g=wg(g0,64,16,g0.segmentMarkers);
   for(const k of Object.keys(g.laneSteps))g.laneSteps[k]=g.laneSteps[k].map(()=>0);g.laneSteps.kick[33*16]=1;g.laneSteps.kick[63*16]=1;__f52CommitSharedDrumGrid(g);
   const e=__mlSharedDrumMachine.liveEdit.grid;return JSON.stringify({bars:e.bars,len:e.laneSteps.kick.length,on:e.laneSteps.kick.map((v,i)=>v?i:-1).filter(i=>i>=0)})})()`));
 assert.deepEqual(made,{bars:64,len:1024,on:[528,1008]},'64-bar pattern with kicks at bar 34 and bar 64');
 // 1. play: 64 bars at 240 BPM = 64 s; listen for 70 s
 const bar=4*60/bpm;await p.waitForTimeout(1500);await p.evaluate(()=>{__pk.on=true});await p.waitForTimeout((64*bar+8)*1000);await p.evaluate(()=>{__pk.on=false});
 const pk=await p.evaluate(()=>__pk.list);
 const gaps=pk.slice(1).map((t,i)=>+(t-pk[i]).toFixed(2));console.log('kicks heard at',pk.map(t=>t.toFixed(2)).join(' '),'· gaps',gaps.join(' '),'s (30 bars = '+(30*bar)+' s, 34 bars = '+(34*bar)+' s)');
 assert.ok(pk.length>=2,'both kicks of the 64-bar cycle are heard: '+pk.length);
 for(const g of gaps)assert.ok(Math.abs(g-30*bar)<.06||Math.abs(g-34*bar)<.06,'kicks are 30 or 34 bars apart (bar 34 → bar 64 → next cycle bar 34): '+g+' s');
 assert.ok(gaps.some(g=>Math.abs(g-30*bar)<.06),'bar 34 → bar 64 heard within one cycle');
 // 3. Melodic Loop 64 bars (set before the reload)
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(3500);
 const mlBars=p.getByLabel('Number of Bars').first();await mlBars.scrollIntoViewIfNeeded();await mlBars.fill('64');await mlBars.blur();await p.waitForTimeout(800);assert.equal(await mlBars.inputValue(),'64');
 await p.waitForTimeout(4000);// persistence settles after rest
 // 2. reload
 await p.reload();await p.waitForTimeout(4500);
 const after=JSON.parse(await E(`(()=>{const m=__mlSharedDrumMachine,g=m.liveEdit?.grid||__mlGridFromSelection(m.snapshot);return JSON.stringify({bars:g.bars,len:(g.laneSteps?.kick||[]).length,on:(g.laneSteps?.kick||[]).map((v,i)=>v?i:-1).filter(i=>i>=0)})})()`));
 console.log('after reload: drum pattern',JSON.stringify(after));
 assert.deepEqual(after,{bars:64,len:1024,on:[528,1008]},'the 64-bar pattern survives a reload');
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(3500);
 const ml2=p.getByLabel('Number of Bars').first();await ml2.scrollIntoViewIfNeeded();assert.equal(await ml2.inputValue(),'64','the Melodic Loop keeps 64 bars after a reload');
 assert.deepEqual(errors,[]);console.log('PASS LONG-BARS-02: 64-bar drum pattern plays all 64 bars (kicks '+gaps.join('/')+' s apart) and survives a reload; Melodic Loop keeps 64 bars');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
