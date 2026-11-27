'use strict';
// DJ-CLOCK-01 (real app): a Mixing Desk auto-fade runs on the AUDIO clock. With "Takt-Start" it begins exactly on the next
// room bar line of the AudioContext timeline (not a timer), the level keeps moving while the main thread is blocked,
// it ends on the musical length (2 bars), the stores hold the end level and no React effect re-writes the ramp.
// A crossfader touch mid-fade takes over from the audible level without a jump. Scenes morph on the same clock.
// Usage: node tests/e2e/dj_clock_fade.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1600,height:1100}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('xensonar.djStage.expanded.v1','1')}catch{}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 const id=await E(`(async()=>{const sr=48000,n=sr*8,L=new Float32Array(n);for(let i=0;i<n;i++)L[i]=0.2*Math.sin(i/7);
  const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'dj-clock-tone',origin:'probe',bpm:120,bars:4,enqueue:false});return d.entry.id})()`);
 await E(`__NodalBallGrid.update({materialLoopActive:true,materialLoopId:'${id}',materialLoopVolume:0.8})`);
 await p.waitForSelector(`[data-xen-loop-ruler="${id}"].is-playing`,{timeout:15000});await p.waitForTimeout(600);
 const strip=`[data-xen-dj-deck="${id}"]`;
 await p.click(strip+' .xen-dj-bus-switch .is-a');await p.waitForTimeout(300);
 await p.click('.xen-dj-xfade-tools button:has-text("Center")');await p.waitForTimeout(400);
 const bpm=await E(`__XenDjStage.roomBpm()`);assert.ok(bpm>=30&&bpm<=300,'room tempo '+bpm);
 const g=()=>E(`(()=>{const h=__XenMaterialLivePhase.handle('${id}');return{t:h.ctx.currentTime,v:h.gain.gain.value,hr:__XenMaterialLivePhase.headroom(),x:__XenDjStage.snapshot().crossfade,armed:__XenDjStage.snapshot().armedFadeDir,auto:__XenDjStage.snapshot().autoFadeDir,vol:__NodalBallGrid.params().materialLoopVolume}})()`);
 const g0=await g();assert.ok(g0.v>0.3,'deck audible at center: '+JSON.stringify(g0));
 // arm: quantised fade to bus B over 2 bars
 await p.click('.xen-dj-scenes-group button:has-text("Bar start")');
 await p.click('.xen-dj-segmented button:has-text("Bars")');
 const bar=240/bpm;
 const clickT=await E(`__XenMaterialLivePhase.handle('${id}').ctx.currentTime`);
 await p.click('.xen-dj-xfade-side.is-right button:has-text("B 2B")');
 const expectT0=Math.ceil((clickT+0.03)/bar-1e-9)*bar;
 const a1=await g();
 assert.equal(a1.vol,0,'stores already hold the end level (A at full B = 0)');
 // until the bar line: unchanged level, armed state
 if(expectT0-a1.t>0.15){assert.ok(Math.abs(a1.v-g0.v)<0.02,'holds until the bar line');assert.ok(a1.armed,'armed until the bar line');}
 // sample the gain on the audio clock
 const samples=[];const until=expectT0+2*bar+0.3;
 let blocked=false;
 const wallStop=Date.now()+30000;
 while(true){const s=await g();samples.push(s);if(s.t>until)break;assert.ok(Date.now()<wallStop,'audio clock did not reach '+until+' (at '+s.t+')');
  if(!blocked&&s.t>expectT0+bar*0.5){blocked=true;const before=s.v;await p.evaluate(()=>{const t=performance.now();while(performance.now()-t<600){}});const after=await g();samples.push(after);
   assert.ok(after.v<before-0.02,'the level keeps moving while the main thread is blocked: '+before+' → '+after.v);}
  await p.waitForTimeout(40);}
 if(process.env.DBG)console.error(JSON.stringify({expectT0,bar,g0,a1,samples:samples.filter((x,i)=>i%4===0).map(x=>[+x.t.toFixed(3),+x.v.toFixed(4),x.x.toFixed(2),x.vol])}));
 const pre=samples.filter(s=>s.t<expectT0-0.01),post=samples.filter(s=>s.t>expectT0+0.02);
 assert.ok(pre.every(s=>Math.abs(s.v-g0.v)<0.02),'no movement before the bar line');
 assert.ok(post.some(s=>s.t<expectT0+bar*0.25&&s.v<g0.v-1e-4),'moves within the first beat after the bar line (eased start)');
 const firstMove=samples.find(s=>s.v<g0.v-0.003);
 assert.ok(firstMove.t>=expectT0-0.005,'starts on the bar line '+expectT0.toFixed(3)+' (first move at '+firstMove.t.toFixed(3)+')');
 for(let i=1;i<samples.length;i++)assert.ok(samples[i].v<=samples[i-1].v+1e-4,'monotone fade, no bounce');
 const end=samples.filter(s=>s.t>expectT0+2*bar+0.05);
 assert.ok(end.length&&end.every(s=>s.v<0.002),'silent after exactly 2 bars');
 const mid=samples.find(s=>s.t>expectT0+bar*0.95&&s.t<expectT0+bar*1.05);
 if(mid)assert.ok(mid.v>0.05&&mid.v<g0.v-0.05,'half way at one bar: '+mid.v);
 const fin=await g();assert.equal(fin.x,1);assert.equal(fin.auto,null);assert.equal(fin.armed,null);
 // interrupt: fade back unquantised, touch the crossfader half way → takes over without a jump
 await p.click('.xen-dj-scenes-group button:has-text("Bar start")');
 await p.click('.xen-dj-xfade-side:not(.is-right) button:has-text("8B")');
 await p.waitForTimeout(1500);
 const pi=await g();assert.ok(pi.v>0.02&&pi.v<g0.v,'fading back: '+pi.v);
 await p.keyboard.press('Escape');
 await p.focus('.xen-dj-xfade-plate');const k0=await g();await p.keyboard.press('ArrowLeft');await p.waitForTimeout(150);
 const k1=await g();assert.equal(k1.auto,null,'the touch stopped the auto-fade');
 assert.ok(Math.abs(k1.v-k0.v)<0.12,'no jump when taking over: '+k0.v+' → '+k1.v);
 await p.waitForTimeout(600);const k2=await g();assert.ok(Math.abs(k2.v-k2.vol*k2.hr)<0.01,'gain follows the store again: '+k2.v+' / '+k2.vol);
 // scene morph on the audio clock: store S1 at center, go to B, recall S1
 await p.click('.xen-dj-xfade-tools button:has-text("Center")');await p.waitForTimeout(300);
 await p.click('.xen-dj-scene-btn >> nth=0');await p.waitForTimeout(100);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.xen-dj-xfade-btn')].find(x=>x.textContent.trim()==='Cut');b.click()});
 await p.focus('.xen-dj-xfade-plate');for(let i=0;i<13;i++)await p.keyboard.press('ArrowRight');await p.waitForTimeout(400);
 const s0=await g();assert.ok(s0.v<0.01,'at B: deck A silent');
 await p.click('.xen-dj-scene-btn >> nth=0');await p.waitForTimeout(80);
 const s1=await g();assert.ok(Math.abs(s1.vol-0.8)<0.01,'store already at the scene level');
 await p.waitForTimeout(700);const s2=await g();assert.ok(s2.v>0.02&&s2.v<0.8*s2.hr-0.02,'scene morph half way on the audio clock: '+s2.v);
 await p.waitForTimeout(1200);const s3=await g();assert.ok(Math.abs(s3.v-0.8*s3.hr)<0.01,'scene level reached');
 assert.deepEqual(errs,[]);
 console.log('PASS DJ-CLOCK-01 auto-fade on the audio clock: starts on the bar line, survives a blocked main thread, 2 bars exact, takeover without jump, scene morph');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
