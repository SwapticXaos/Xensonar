'use strict';
// LIVE-TEMPO-01 stage 2 (real app): a held Thunder key (hold clock in the audio worklet) glides with the Live Room tempo.
// Keyboard Hold with the Entrophon factory sound (C11 worklet), 16 steps per bar, held through a 108 → 140 BPM glide over 2 bars.
//  - the clock description that reaches the C11 worklet (HOLD_PLAN, then HOLD_WARP when the glide begins) is captured; the expected
//    step times are computed with the shared step function (xenHoldStepFrame) and compared with the onsets in the C11 output:
//    the residual (detection latency) must be the same before, during and after the glide (no drift, no jump), every step heard once
//  - after the glide the steps come at 140 BPM; the glide landing does not restart the hold (one HOLD_PLAN for the gesture)
//  - Nodal (troodle, Nodal worklet): its hold clock receives the warp while the key is held (troodle's own trill makes its onsets
//    unusable for timing; the step function is the same)
// Usage: node tests/e2e/live_tempo_hold.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
async function run(nodal){
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:2200}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(want=>{window.__cap={chunks:[],on:false,msgs:[]};const W=window.AudioWorkletNode;
  const pm=MessagePort.prototype.postMessage;MessagePort.prototype.postMessage=function(m,...r){try{if(m&&typeof m==='object'&&(m.type==='HOLD_PLAN'||m.type==='HOLD_WARP'||m.holdClock||m.options?.nodalHoldClock))__cap.msgs.push(JSON.parse(JSON.stringify({type:m.type||'nodal',id:m.id,clock:m.clock||m.holdClock||m.options?.nodalHoldClock||null,warp:m.type==='HOLD_WARP'?m.warp:null})))}catch{}return pm.call(this,m,...r)};
  window.AudioWorkletNode=class extends W{constructor(ctx,name,opt){super(ctx,name,opt);if(name===want){const sp=ctx.createScriptProcessor(1024,2,2),z=ctx.createGain();z.gain.value=0;
   sp.onaudioprocess=ev=>{if(!__cap.on)return;const d=ev.inputBuffer.getChannelData(0);let any=0;for(let i=0;i<d.length;i+=8)if(d[i]!==0){any=1;break}if(any)__cap.chunks.push({t:ev.playbackTime,sr:ctx.sampleRate,d:Array.from(d)})};for(let k=0;k<this.numberOfOutputs;k++)this.connect(sp,k);sp.connect(z);z.connect(ctx.destination)}}}},nodal?'xensonar-nodal-instrument-v1':'xensonar-c11-host');
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.evaluate(x=>__xenProbe.bridge.patch(x),{...(nodal?{}:{keyboardHoldSoundPreset:'entrophon:factory:marimba-holz@1'}),thunderModeEnabled:true,thunderKeyboardEnabled:true,thunderTiming:'exact',keyboardHoldSegments:16,keyboardHoldCustomSegments:16,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array(16).fill(true),keyboardHoldPitchCents:Array(16).fill(0),keyboardHoldSlotVolumes:[],keyboardHoldMicrotiming:[],drumActive:false,bassActive:false});
 await p.waitForTimeout(1200);
 await p.keyboard.down('q');await p.waitForTimeout(700);await p.keyboard.up('q');await p.waitForTimeout(800);// warm-up gesture
 await p.evaluate(()=>{__cap.on=true;__cap.msgs.length=0});await p.keyboard.down('q');await p.waitForTimeout(2200);
 const setVal=async(sel,v)=>{await p.evaluate(([sel,v])=>{const el=document.querySelector(sel);const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))},[sel,v])};
 await setVal('[data-xen-tempo-ramp-bars]','2');await setVal('[data-xen-tempo-ramp-to]','140');
 await p.evaluate(()=>{document.querySelector('[data-xen-tempo-ramp-go]').click()});// by script: the held key stays down
 const win={start:null,end:null};for(let k=0;k<75;k++){await p.waitForTimeout(100);const q=JSON.parse(await E('JSON.stringify({s:__XenLiveTempo.snapshot(),now:__XenLiveTempo.audioNow()})'));if(q.s&&q.s.state==='running'&&win.start===null)win.start=q.now;if(win.start!==null&&!q.s&&win.end===null)win.end=q.now}
 await p.keyboard.up('q');await p.evaluate(()=>{__cap.on=false});
 assert.ok(win.start&&win.end,'the glide ran');
 const msgs=await p.evaluate(()=>__cap.msgs);
 if(nodal){const warped=msgs.filter(m=>m.clock&&m.clock.warp);assert.ok(msgs.some(m=>m.clock&&!m.clock.warp),'Nodal hold clock before the glide (no warp)');
  assert.ok(warped.length>=1,'the Nodal hold clock receives the tempo map while the key is held: '+warped.length+' of '+msgs.length+' clock messages');
  assert.deepEqual(errs,[]);await b.close();return 'Nodal: hold clock got the map ('+warped.length+' updates)'}
 const plans=msgs.filter(m=>m.type==='HOLD_PLAN'),warps=msgs.filter(m=>m.type==='HOLD_WARP');
 assert.ok(plans.length>=1,'a C11 hold plan');const ids=new Set(plans.map(m=>m.id));assert.equal(ids.size,1,'one hold session for the whole gesture (no restart at the landing): '+[...ids]);
 assert.ok(warps.length>=1&&warps.some(w=>w.warp),'the running C11 hold plan gets the tempo map (HOLD_WARP)');
 // expected step times with the shared step function and the latest map the worklet received
 const plan=plans[0].clock,warp=warps.filter(w=>w.warp).at(-1).warp;
 const on=await p.evaluate(()=>{const cs=__cap.chunks.sort((a,b)=>a.t-b.t);const fr=[];let prev=0;
  for(const c of cs){for(let i=0;i+64<=c.d.length;i+=64){let e=0;for(let j=i;j<i+64;j++){const d=c.d[j]-prev;prev=c.d[j];e+=d*d}fr.push([c.t+i/c.sr,e])}}
  const out=[];let last=-1;for(let k=20;k<fr.length;k++){let m=0;for(let j=k-20;j<k;j++)m+=fr[j][1];m/=20;const [t,e]=fr[k];if(e>4*m&&e>1e-8&&t-last>.09){out.push(t);last=t}}return out});
 const exp=JSON.parse(await E(`JSON.stringify((()=>{const p=${JSON.stringify(plan)},w=${JSON.stringify(warp)},r=w.rate;const c={start:p.startSec*r,interval:p.intervalMs*r/1000,pattern:p.pattern,slotMicrotiming:null,warp:{...w}};const out=[];for(let i=0;i<400;i++)out.push(xenHoldStepFrame(c,i)/r);return out})())`));
 const res=on.map(t=>{let best=1e9,bi=-1;for(let i=0;i<exp.length;i++){const d=t-exp[i];if(Math.abs(d)<Math.abs(best)){best=d;bi=i}}return [t,best,bi]});
 const steady=res.filter(([t])=>t>plan.startSec+1.2);// after the takeover from the main-thread first pulses
 const phase=([t])=>t<win.start?'before':t<=win.end+.2?'glide':'after';const by={before:[],glide:[],after:[]};for(const r of steady)by[phase(r)].push(r[1]*1000);
 const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};const D=med(by.before);
 const worst=k=>Math.max(...by[k].map(x=>Math.abs(x-D)));
 const idx=steady.map(r=>r[2]);const doubles=idx.filter((x,i)=>i&&x===idx[i-1]).length,gaps=idx.filter((x,i)=>i&&x-idx[i-1]>1).length;
 const after=steady.filter(r=>phase(r)==='after').map(r=>r[0]),g=after.slice(1).map((t,i)=>t-after[i]).sort((a,b)=>a-b);
 console.log('C11 hold: residual (onset − clock) median before '+D.toFixed(1)+' ms; worst deviation from it: before '+worst('before').toFixed(1)+' · glide '+worst('glide').toFixed(1)+' · after '+worst('after').toFixed(1)+' ms (median glide '+med(by.glide).toFixed(1)+', after '+med(by.after).toFixed(1)+') · steps '+steady.length+', doubles '+doubles+', gaps '+gaps+' · 16th after the glide '+(g[g.length>>1]*1000).toFixed(1)+' ms (140 BPM: '+(60/140/4*1000).toFixed(1)+')');
 assert.ok(by.before.length>=6&&by.glide.length>=12&&by.after.length>=8,'steps in every phase');
 // the onset detector misses or adds a transient now and then: judge the clock by the bulk of the steps
 const inl=k=>by[k].filter(x=>Math.abs(x-D)<12).length/by[k].length;
 const gl=steady.filter(r=>phase(r)==='glide'&&Math.abs(r[1]*1000-D)<12);const mx=gl.reduce((a,r)=>a+r[0],0)/gl.length,my=gl.reduce((a,r)=>a+r[1]*1000,0)/gl.length;
 const slope=gl.reduce((a,r)=>a+(r[0]-mx)*(r[1]*1000-my),0)/gl.reduce((a,r)=>a+(r[0]-mx)**2,0);
 console.log('within ±12 ms of the clock: before '+(inl('before')*100).toFixed(0)+' % · glide '+(inl('glide')*100).toFixed(0)+' % · after '+(inl('after')*100).toFixed(0)+' % · drift during the glide '+slope.toFixed(2)+' ms/s');
 assert.ok(inl('before')>=.4&&inl('glide')>=.4&&inl('after')>=.4,'most steps within ±12 ms of their clock time in every phase (the detector loses some overlapping marimba attacks at the faster tempo; the same spread shows at a steady 140 BPM)');
 // < 6 ms: the marimba onset detector misses/doubles 6-8 attacks per run, which moves a phase median by up to ~5.5 ms on any build
 // (measured 18.11. on 839293a and 817a14b); a hold that did not follow the glide would be off by hundreds of ms
 assert.ok(Math.abs(med(by.glide)-D)<6&&Math.abs(med(by.after)-D)<6,'the onsets keep the same distance to the clock before, during and after the glide (< 6 ms)');
 assert.ok(Math.abs(slope)<2.5,'no drift against the gliding clock (a hold that ignored the glide would drift by hundreds of ms/s): '+slope.toFixed(2)+' ms/s');
 assert.ok(Math.abs(g[g.length>>1]-60/140/4)<.002,'after the glide the hold steps at 140 BPM');
 assert.deepEqual(errs,[]);await b.close();return 'C11: '+steady.length+' steps on the gliding clock (median residual before/glide/after '+D.toFixed(1)+'/'+med(by.glide).toFixed(1)+'/'+med(by.after).toFixed(1)+' ms, drift '+slope.toFixed(2)+' ms/s), one session, no restart';
}
(async()=>{const a=await run(false),n=await run(true);console.log('PASS LIVE-TEMPO-01 hold · '+a+' · '+n)})().catch(e=>{console.error(e);process.exit(1)});
