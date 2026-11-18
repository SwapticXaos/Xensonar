'use strict';
// LIVE-TEMPO-01 stage 2 (real app): the Root Follow Loop glides with the Live Room tempo.
// A synthetic 1-bar loop with a short click on every beat plays as Root Follow Loop (resident worklet) together with the drums.
// The RFL worklet output is captured with its audio timestamps; the click peaks must sit on the beats of the tempo map
// before, during and after a 108 → 140 BPM glide over 2 bars, and the loop must not restart when the glide lands.
// Control run (XEN_NO_WARP=1, against a build WITHOUT stage 2, e.g. 917942a): the loop keeps 108 BPM / drifts.
// Usage: node tests/e2e/live_tempo_rfl.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const noWarp=process.env.XEN_NO_WARP==='1';
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:2200}})).newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{const W=window.AudioWorkletNode;window.__cap={chunks:[],nodes:0,on:false};
  window.AudioWorkletNode=class extends W{constructor(ctx,name,opt){super(ctx,name,opt);if(name==='xensonar-raw-resident-v1'){__cap.nodes++;const sp=ctx.createScriptProcessor(2048,2,2),z=ctx.createGain();z.gain.value=0;
   sp.onaudioprocess=ev=>{if(!__cap.on)return;const d=ev.inputBuffer.getChannelData(0);let any=0;for(let i=0;i<d.length;i+=16)if(d[i]!==0){any=1;break}if(any)__cap.chunks.push({t:ev.playbackTime,sr:ctx.sampleRate,d:Array.from(d)})};this.connect(sp);sp.connect(z);z.connect(ctx.destination)}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  // 1-bar loop at 120 BPM (2 s), a 6 ms click on every beat
 const id=await E(`(async()=>{const sr=48000,n=sr*2,L=new Float32Array(n);for(let k=0;k<4;k++){const s=k*sr/2;for(let i=0;i<288;i++)L[s+i]=.9*Math.exp(-i/40)*(i%2?1:-1)}
   const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'tempo-click-loop',origin:'probe',bpm:120,bars:1,enqueue:false});return d.entry.id})()`);
 await E(`ri('rootFollowBankMembership',{entryId:'${id}',enabled:true,activate:true})`);
 const cv=await p.locator('canvas').first().boundingBox();if(process.env.XEN_DEBUG)console.log('canvas',JSON.stringify(cv));await p.mouse.move(cv.x+cv.width*.5,cv.y+cv.height*.5);
 const steady=+process.env.XEN_STEADY||0;if(steady){await E(`__NodalBallGrid.update({quantizeBpm:${steady}})`);await p.waitForTimeout(600)}
 await E(`__NodalBallGrid.update({rootFollowLoopActive:true,rootFollowLoopId:'${id}'})`);await p.waitForTimeout(2500);
 assert.ok(await p.evaluate(()=>__cap.nodes)>=1,'the resident RFL worklet plays');
 const restarts0=await E('JSON.stringify(null)');
 await p.evaluate(()=>{__cap.on=true});await p.waitForTimeout(2500);
 if(steady){await p.waitForTimeout(8000);await p.evaluate(()=>{__cap.on=false});const pk=await p.evaluate(()=>{const cs=__cap.chunks.sort((a,b)=>a.t-b.t);const pk=[];let last=-1;for(const c of cs){const d=c.d;for(let i=0;i<d.length;i++){if(Math.abs(d[i])>.25){const t=c.t+i/c.sr;if(t-last>.12){pk.push(t);last=t}}}}return pk});
  const bt=JSON.parse(await E(`JSON.stringify(${JSON.stringify(pk)}.map(t=>__XenLiveTempo.beatAt(t)))`));const of=bt.map(x=>x-Math.round(x));console.log('STEADY',steady,'offsets',of.map(x=>x.toFixed(3)).join(' '),'mean',(of.reduce((a,x)=>a+x,0)/of.length).toFixed(3));await b.close();return}
 // start the glide from the keyboard (Enter in the field): the mouse stays in the playfield, where the RFL plays
 const setVal=async(sel,v)=>{await p.evaluate(([sel,v])=>{const el=document.querySelector(sel);const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.focus({preventScroll:true})},[sel,v])};
 await setVal('[data-xen-tempo-ramp-bars]','2');await setVal('[data-xen-tempo-ramp-to]','140');await p.keyboard.press('Enter');
 const win={start:null,end:null};for(let k=0;k<80;k++){await p.waitForTimeout(100);const q=JSON.parse(await E('JSON.stringify({s:__XenLiveTempo.snapshot(),now:__XenLiveTempo.audioNow()})'));if(q.s&&q.s.state==='running'&&win.start===null)win.start=q.now;if(win.start!==null&&!q.s&&win.end===null)win.end=q.now}
 await p.evaluate(()=>{__cap.on=false});
 // the map (beat position of every audio time) and the anchor of the loop
 const env=await p.evaluate(()=>{const cs=__cap.chunks.sort((a,b)=>a.t-b.t);return cs.map(c=>[+(c.t).toFixed(2),+Math.max(...c.d.map(Math.abs)).toFixed(3)])});if(process.env.XEN_DEBUG)console.log('ENV',JSON.stringify(env.slice(0,80)));
 const res=await p.evaluate(()=>{const cs=__cap.chunks.sort((a,b)=>a.t-b.t);const pk=[];let last=-1;
  for(const c of cs){const d=c.d;for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>.25){const t=c.t+i/c.sr;if(t-last>.12){pk.push(t);last=t}}}}return pk});
 const beats=JSON.parse(await E(`JSON.stringify(${JSON.stringify(res)}.map(t=>__XenLiveTempo.beatAt(t)))`));
 const seg=JSON.parse(await E(`JSON.stringify((()=>{const s=__XenLiveTempo.snapshot();return {mapped:__XenLiveTempo.mapped(),t0:__XenLiveTempo.timeAt(0)}})())`));
 assert.ok(res.length>=12,'clicks found in the RFL output: '+res.length);
 // offset of each click from its nearest beat (in beats). At a steady tempo the granular RFL sits at a constant, tempo-dependent offset
 // (measured: +0.185 beat at 108, +0.262 at 140); following the beat means: constant offset before, a smooth move during, constant after.
 const off=beats.map(x=>x-Math.round(x)),wrap=x=>x-Math.round(x);
 assert.ok(win.start&&win.end,'the glide ran: '+JSON.stringify(win));
 const pre=res.map((t,i)=>[t,off[i]]).filter(([t])=>t<win.start),post=res.map((t,i)=>[t,off[i]]).filter(([t])=>t>win.end+.3),mid=res.map((t,i)=>[t,off[i]]).filter(([t])=>t>=win.start&&t<=win.end+.3);
 const mean=a=>a.reduce((x,[,o])=>x+o,0)/a.length,m0=mean(pre),m1=mean(post),spread=a=>Math.max(...a.map(([,o])=>wrap(o-mean(a))))-Math.min(...a.map(([,o])=>wrap(o-mean(a))));
 const gaps=[];for(let i=1;i<post.length;i++){const g=post[i][0]-post[i-1][0];gaps.push(g/Math.round(g/(60/140)))}
if(process.env.XEN_DEBUG)console.log('POST',JSON.stringify(post.map(([t,o])=>[+t.toFixed(3),+o.toFixed(3)])),'GAPS',JSON.stringify(gaps.map(x=>+x.toFixed(4))));
 // tempo after the glide: least-squares slope of click time over beat number (the grain-level jitter of single clicks averages out)
 const ks=[0];for(let i=1;i<post.length;i++)ks.push(ks[i-1]+Math.max(1,Math.round((post[i][0]-post[i-1][0])/(60/140))));
 const mk=ks.reduce((a,x)=>a+x,0)/ks.length,mt=post.reduce((a,[t])=>a+t,0)/post.length,beatSec=post.reduce((a,[t],i)=>a+(ks[i]-mk)*(t-mt),0)/ks.reduce((a,x)=>a+(x-mk)**2,0);
 console.log((noWarp?'CONTROL ':'')+'clicks '+res.length+' · offset before '+m0.toFixed(3)+' after '+m1.toFixed(3)+' (spread after '+spread(post).toFixed(3)+') · beat after the glide '+beatSec.toFixed(4)+' s (140 BPM = '+(60/140).toFixed(4)+')');
 if(noWarp){const nodes=await p.evaluate(()=>__cap.nodes),lo=Math.min(m0,m1)-.07,hi=Math.max(m0,m1)+.07,out=mid.filter(([,o])=>o<lo||o>hi).length;
  const why=[Math.abs((m1-m0)-.077)>=.06?'lands off the beat grid ('+(m1-m0).toFixed(3)+' instead of +0.077)':'',nodes!==1?'restarted at the landing ('+nodes+' worklet nodes)':'',out?out+' clicks off during the glide':''].filter(Boolean);
  console.log('control findings: '+(why.join('; ')||'none'));assert.ok(why.length>0,'control: the build without stage 2 shows the problem');console.log('PASS control (the old build does not follow)');await b.close();return}
 assert.ok(pre.length>=2&&post.length>=4,'clicks before and after the glide: '+pre.length+'/'+post.length);
 assert.ok(Math.abs(beatSec-60/140)<.015,'after the glide the loop plays at 140 BPM: '+beatSec.toFixed(4)+' s per beat');
 assert.ok(spread(post)<.18,'phase-locked after the glide (no drift): spread '+spread(post).toFixed(3)+' beat (a steady 140 BPM shows ~0.12 from the granular grains)');
 // ±0.15 beat: the granular grains alone spread single clicks by 0.12-0.14 beat at a steady tempo (P2 18.11.: one click at the old ±0.12 edge)
 const lo=Math.min(m0,m1)-.15,hi=Math.max(m0,m1)+.15;for(const [t,o] of mid)assert.ok(o>=lo&&o<=hi,'during the glide the loop stays between its steady offsets: '+o.toFixed(3)+' at '+t.toFixed(2));
 assert.ok(Math.abs((m1-m0)-.077)<.06,'the offset moves by what the steady states predict (+0.077 beat from 108 to 140): '+(m1-m0).toFixed(3));
 assert.equal(await E('__XenLiveTempo.mapped()'),true);assert.match(await p.locator('h3',{hasText:'Time & Echo'}).locator('xpath=..').innerText(),/Live Room Tempo: 140 BPM/);
 assert.equal(await p.evaluate(()=>__cap.nodes),1,'the loop was not restarted when the glide landed (one resident worklet node)');
 const maxErr=spread(post);
 assert.deepEqual(errs,[]);console.log('PASS LIVE-TEMPO-01 RFL: '+res.length+' loop clicks on the gliding beat (max '+maxErr.toFixed(3)+' beat), no restart at the landing');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
