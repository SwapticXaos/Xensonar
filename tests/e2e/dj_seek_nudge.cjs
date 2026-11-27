'use strict';
// DJ-SEEK-01 (real app): in the Mixing Desk a click into a bar of the loop ruler (and of the "Takt & Phase" rails)
// spools the running loop into that bar, keeping the position inside the bar (whole-bar shift = stays on the room grid,
// discrete jump, no glide). « / » jump exactly one segment, the middle jog pushes (→) / brakes (←) through the voice's
// own nudge physics and springs back, double-click returns to the grid. The playfield docks beside the opened desk.
// Usage: node tests/e2e/dj_seek_nudge.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:1600,height:1100}});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{localStorage.setItem('xensonar.djStage.expanded.v1','1');localStorage.removeItem('xensonar.stageLayout.v1')}catch{}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 assert.equal(await p.getAttribute('.xen-stage-split','data-dock'),'side','playfield docked beside the opened desk');
 // a 4-bar click loop at 120 BPM (4 beats per bar, 4 segments per bar → 1 segment = 1 beat)
 const id=await E(`(async()=>{const sr=48000,n=sr*8,L=new Float32Array(n);for(let k=0;k<16;k++)for(let i=0;i<240;i++)L[k*sr/2+i]=(k%4?0.4:0.9)*Math.sin(i/3);
  const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'dj-seek-click',origin:'probe',bpm:120,bars:4,enqueue:false});return d.entry.id})()`);
 await E(`__NodalBallGrid.update({materialLoopActive:true,materialLoopId:'${id}'})`);
 const ruler=`[data-xen-loop-ruler="${id}"]`;
 await p.waitForSelector(ruler+'.is-playing',{timeout:15000});await p.waitForTimeout(400);
 const read=()=>E(`(()=>{const m=__XenMaterialVoiceMix.get('${id}'),f=__XenNudgeFeedback.get('${id}'),s=__XenMaterialLivePhase.read('${id}',m.att,false);return{att:m.att,p:s.progress01,L:s.loopBeats,state:s.state,active:f.active,phase:f.phase}})()`);
 const r0=await read();assert.equal(r0.state,'playing');assert.ok(Math.abs(r0.L-16)<0.05,'4 bars × 4 beats: '+r0.L);
 // 1) click into the bar two bars ahead
 const box=async sel=>{const h=await p.$(sel);await h.scrollIntoViewIfNeeded();await p.waitForTimeout(150);return h.boundingBox()};
 const bb=await box(ruler);
 const cur=Math.floor(r0.p*4),target=(cur+2)%4;
 await p.mouse.click(bb.x+bb.width*(target+.5)/4,bb.y+bb.height/2);await p.waitForTimeout(120);
 const r1=await read();
 assert.ok(Math.abs(r1.att/4-Math.round(r1.att/4))<1e-6,'a whole number of bars: att '+r1.att);
 assert.notEqual(Math.round(r1.att),0,'moved');
 const bar1=Math.floor(r1.p*4);assert.ok(bar1===target||bar1===(target+1)%4,'playhead in the clicked bar: '+bar1+' / '+target);
 assert.equal(r1.active,false,'discrete jump, no glide');assert.ok(Math.abs(-r1.phase-r1.att)<1e-6,'audio phase = target');
 // 2) « / » : exactly one segment (= 1 beat)
 const strip=`[data-xen-dj-deck="${id}"]`;
 await p.click(strip+' button[aria-label$="ein Segment vor"]');await p.waitForTimeout(80);
 const r2=await read();
 assert.ok(Math.abs((r2.att-r1.att)-(-1))<1e-6||Math.abs(Math.abs(r2.att-r1.att)-15)<1e-6,'one segment ahead: '+r1.att+' → '+r2.att);
 assert.equal(r2.active,false);
 assert.match(await p.innerText(`[data-xen-nudge-jog="${id}"]`),/Φ [+−]/);
 await p.click(strip+' button[aria-label$="ein Segment zurück"]');await p.waitForTimeout(80);
 assert.ok(Math.abs((await read()).att-r1.att)<1e-6,'back again');
 // 3) jog: drag right = push (soft nudge physics), thumb springs back, the offset stays
 const jog=await box(`[data-xen-nudge-jog="${id}"]`);
 const base=(await read()).att;
 await p.mouse.move(jog.x+jog.width/2,jog.y+jog.height/2);await p.mouse.down();
 await p.mouse.move(jog.x+jog.width*.95,jog.y+jog.height/2,{steps:6});await p.waitForTimeout(250);
 const held=await read();
 assert.ok(base-held.att>0.4&&base-held.att<=0.5+1e-6,'target moved ahead by up to ½ segment: '+base+' → '+held.att);
 assert.equal(await p.getAttribute(`[data-xen-nudge-jog="${id}"]`,'data-motion'),'push','audible push shown');
 await p.mouse.up();await p.waitForTimeout(250);
 assert.equal(await p.evaluate(s=>document.querySelector(s+' b').style.left,`[data-xen-nudge-jog="${id}"]`).then(v=>parseFloat(v)),50,'thumb springs back');
 assert.ok(Math.abs((await read()).att-held.att)<1e-6,'offset stays after release');
 // 4) double-click: back onto the grid (jump)
 await p.dblclick(`[data-xen-nudge-jog="${id}"]`);await p.waitForTimeout(120);
 const r4=await read();assert.equal(r4.att,0);assert.equal(r4.active,false);
 // 5) the "Takt & Phase" rails spool the same way
 await p.click('.xen-dj-monitor-switch button:has-text("Takt & Phase")');await p.waitForTimeout(200);
 const rail=await box(`.xen-dj-time-rail-track[data-xen-bar-seek="${id}"]`);
 const r5=await read(),t5=(Math.floor(r5.p*4)+3)%4;
 await p.mouse.click(rail.x+rail.width*(t5+.5)/4,rail.y+rail.height/2);await p.waitForTimeout(120);
 const r6=await read();assert.ok(Math.abs(r6.att/4-Math.round(r6.att/4))<1e-6&&Math.round(r6.att)!==0,'rail click: whole-bar jump '+r6.att);
 // 6) keyboard: → one bar
 await p.focus(ruler);const before=Math.round((await read()).att);await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
 const after=Math.round((await read()).att);assert.ok([4,-12].includes(before-after),'ArrowRight = one bar ahead: '+before+' → '+after);
 // 7) DJ-OWN-01: a level change from outside the desk (Quick Rack, song recall) becomes the fader position
 await E(`__NodalBallGrid.update({materialLoopVolume:0.31})`);await p.waitForTimeout(300);
 assert.ok(Math.abs(await E(`__XenDjStage.snapshot().baseVolumes['${id}']`)-0.31)<0.006,'desk adopted the outside level');
 await p.click(strip+' .xen-dj-pad-btn.is-mute');await p.waitForTimeout(150);
 await p.click(strip+' .xen-dj-pad-btn.is-mute');await p.waitForTimeout(300);
 assert.ok(Math.abs(await E(`__NodalBallGrid.params().materialLoopVolume`)-0.31)<0.006,'mute/unmute restores the adopted level, not the old fader');
 assert.deepEqual(errs,[]);
 console.log('PASS DJ-OWN-01 + DJ-SEEK-01 bar spooling (ruler, rails, keys), segment jumps, push/brake jog, grid reset, auto side dock');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
