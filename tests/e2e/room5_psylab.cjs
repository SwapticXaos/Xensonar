'use strict';
// ROOM5-01/02 (real app): Room V · Psychedelic Lab on the Main Room grid. Chunk cold until opened; pad, triangles, keys, tuning hotkeys,
// view switch, sliders, patches, bounce, persistence, leaving silent. Uses the probe build to read the Main Room's own grid parameters.
// Usage: node tests/e2e/room5_psylab.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const shot=process.env.SHOT||'';
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__r5={nodes:[],meter:null,last:null};
    const oc=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d){const r=oc.apply(this,arguments);try{if(d instanceof AudioDestinationNode&&d.context instanceof AudioContext){if(!S.meter||S.meter.context!==d.context){S.meter=d.context.createAnalyser();S.meter.fftSize=2048}oc.call(this,S.meter)}}catch(e){}return r};
    const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(c instanceof AudioContext)S.nodes.push(n);if(n==='xen-psylab-v1'){const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&m.t==='on')S.last=m;if(m&&m.t==='p')S.lastParam=[m.i,m.v];return pm(m,t)}}}};
    S.level=()=>{if(!S.meter)return 0;const a=new Float32Array(S.meter.fftSize);S.meter.getFloatTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v));return m}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const E=(code)=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),false,'chunk is not evaluated at boot');
  assert.equal(await p.evaluate(()=>!!document.getElementById('xen-psylab-style')),false);
  await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),true,'chunk loaded on open');assert.equal(await p.locator('[data-xen-psylab]').count(),1);
  assert.equal(await p.evaluate(()=>__r5.nodes.includes('xen-psylab-v1')),false,'no audio node before the first note');
  assert.equal(await p.locator('[data-xen-grid-controls]').count(),1,'the shared grid controls are mounted');assert.equal(await p.locator('#xpl-scale').count(),0,'the typed scale field is gone');
  const canvas=p.locator('.xpl-pad canvas[role=application]');let bx=await canvas.boundingBox();const fresh=async()=>{bx=await canvas.boundingBox()};
  const sx0=bx.width/1100,sy0=bx.height/580;const at=(x,y)=>[bx.x+x*sx0,bx.y+y*sy0];const sx=sx0,sy=sy0;
  const grid=async()=>JSON.parse(await E('JSON.stringify((p=>({tuning:p.gridTuning,mode:p.gridMode,base:p.gridBase,muted:p.manualGridMutedSteps,offsets:p.manualGridStepOffsets,lock:p.lockCursorToGrid,on:p.gridOn}))(__NodalBallGrid.params()))'));
  const rows=async()=>JSON.parse(await E('JSON.stringify(__NodalBallGrid.rows().map(r=>({step:r.stepIndex,freq:r.freq,muted:r.manualMuted||r.modeMuted,y:Zs(r.freq)})))'));
  let g0=await grid();assert.equal(g0.tuning,'12edo');assert(g0.on!==false,'grid lines on by default');
  // ---- blue triangles: click toggles mute, drag tunes, right click sets the base (same logic as the Live Room) ----
  // the Live Room takes the FIRST line within 12 px of the pointer: test on lines that have no neighbour that close (the top of the range is spread out)
  const isolated=(rs,skip=[])=>rs.filter(r=>r.y>8&&r.y<572&&!skip.includes(r.step)&&rs.every(o=>o===r||Math.abs(o.y-r.y)>14));
  let r0=await rows();const iso=isolated(r0);assert(iso.length>=3,'isolated lines exist: '+iso.length);const target=iso.find(r=>!r.muted);assert(target,'an isolated visible line');const S1=target.step;
  const[tx,ty]=at(8,target.y);await p.mouse.click(tx,ty);await p.waitForTimeout(300);
  let g1=await grid();assert(g1.muted.includes(S1),'click on a triangle mutes the step in the Main Room grid: '+JSON.stringify(g1.muted));
  assert.equal(await p.evaluate(()=>__r5.nodes.includes('xen-psylab-v1')),false,'a triangle click makes no sound');
  await p.mouse.click(tx,ty);await p.waitForTimeout(300);assert(!(await grid()).muted.includes(S1),'second click unmutes');
  const r1=await rows();const t2=isolated(r1,[S1])[0];const S2=t2.step;const[dx,dy]=at(8,t2.y);await p.mouse.move(dx,dy);await p.mouse.down();await p.mouse.move(dx,dy-50*sy,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
  const g2=await grid();assert(g2.offsets[S2]>1.5&&g2.offsets[S2]<2.5,'dragging a triangle up by 50 px raises its offset by 2 (Live: 1 per 25 px): '+g2.offsets[S2]);assert(!g2.muted.includes(S2)||(await grid()).muted.filter(x=>x===S2).length===1&&g0.muted.includes(S2),'a drag does not change the mute state');
  await E('__NodalBallGrid.update({manualGridStepOffsets:Array(12).fill(0)})');await p.waitForTimeout(200);
  const r2=await rows(),t3=isolated(r2,[S1,S2])[0],[rx,ry]=at(8,t3.y);await p.mouse.click(rx,ry,{button:'right'});await p.waitForTimeout(300);
  const g3=await grid();assert(Math.abs(g3.base-t3.freq*2)<.5||Math.abs(g3.base-t3.freq)<.5,'right click on a triangle sets the grid base: '+g3.base+' vs line '+t3.freq);await E('__NodalBallGrid.update({gridBase:440})');await p.waitForTimeout(200);
  // ROOM5-06: the muted triangle under the cursor is highlighted (guide line to x=64 at its y), away from it nothing is drawn
  {await p.evaluate(()=>{const o=CanvasRenderingContext2D.prototype.lineTo;window.__hov=[];CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(x===64)window.__hov.push(y);return o.apply(this,arguments)}});
   const rh=await rows(),th=isolated(rh,[S1,S2,t3.step]).find(r=>!r.muted);assert(th,'an isolated line for the hover check');const[hx,hy]=at(8,th.y);await p.mouse.click(hx,hy);await p.waitForTimeout(300);assert((await grid()).muted.includes(th.step),'triangle muted for the hover check');
   await p.mouse.move(...at(550,290));await p.waitForTimeout(300);await p.evaluate(()=>{window.__hov.length=0});await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>window.__hov.length),0,'no highlight while the cursor is away');
   await p.mouse.move(hx,hy);await p.waitForTimeout(500);const hv=await p.evaluate(()=>window.__hov.slice());assert(hv.length>0&&hv.every(y=>Math.abs(y-th.y)<1),'muted triangle under the cursor is highlighted at its own line: '+hv.slice(0,3)+' vs '+th.y);
   await p.mouse.click(hx,hy);await p.waitForTimeout(300);assert(!(await grid()).muted.includes(th.step),'clicking again unmutes it');await p.mouse.move(...at(550,290));await p.waitForTimeout(200)}
  // ---- pad: with Snap the ball and the sound sit on a grid line ----
  await p.locator('[aria-label="Snap ball to grid"]').getByRole('radio',{name:'Scale'}).click();await p.waitForTimeout(200);assert.equal((await grid()).lock,true);
  await fresh();const lines=await rows();const line=isolated(lines).find(r=>!r.muted&&r.y<500);const[px,py]=at(600,line.y+3);
  await p.mouse.move(px,py);await p.mouse.down();await p.waitForTimeout(1400);
  const l1=await p.evaluate(()=>__r5.level()),hz=await p.evaluate(()=>__r5.last.hz);assert(l1>.005,'pad note audible (peak '+l1+')');assert(Math.abs(hz-line.freq)<.01,'snapped to the grid line: '+hz+' vs '+line.freq);
  if(shot){await p.waitForTimeout(300);await p.screenshot({path:shot})}
  await p.mouse.up();
  // ---- the mandala: own canvas at full resolution, fine hairlines, fades out after the sound ----
  const scopeInfo=async()=>p.evaluate(()=>{const c=document.querySelector('canvas.xpl-scope'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>24)n++;return{w:c.width,h:c.height,lit:n,quality:c.dataset.quality??null}});
  await fresh();await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*.4);await p.mouse.down();await p.waitForTimeout(1800);const sc=await scopeInfo();assert.equal(sc.w,1100,'the mandala canvas has the full pad resolution (not 1/4)');assert.equal(sc.h,580);assert(sc.lit>4000,'the mandala is painted while a note sounds: '+sc.lit+' pixels');
  await p.mouse.up();let sc2=await scopeInfo();for(let i=0;i<40&&sc2.lit>=sc.lit*.05;i++){await p.waitForTimeout(500);sc2=await scopeInfo()} // the echo tail keeps the picture alive for a few seconds
  assert(sc2.lit<sc.lit*.05,'the mandala fades away after the sound (echo tail included): '+sc2.lit+' vs '+sc.lit);
  // ---- Live Room keys: 1 plays the first grid note, , . cycle the grid system, Ctrl cycles the mode ----
  const key=async k=>{await p.keyboard.down(k);await p.waitForTimeout(250);const t=await p.locator('.xpl-readout').innerText();await p.keyboard.up(k);return t};
  // ---- arrow keys: the Live Room's logic (one grid step at the cursor with Snap), not the page scroll ----
  await E('__NodalBallGrid.update({manualGridMutedSteps:[],manualGridStepOffsets:Array(12).fill(0),lockCursorToGrid:true})');await p.waitForTimeout(200);await p.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,40)});await fresh();
  await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*.5);await p.mouse.down();await p.waitForTimeout(500);await p.mouse.up();const baseHz=await p.evaluate(()=>__r5.last.hz);
  const nextHz=d=>E('(p=>Qa(uZ(Zs('+baseHz+'),'+d+',p.gridBase,p.gridTuning,p.manualGridMutedSteps,p.manualGridStepOffsets)))(__NodalBallGrid.params())');
  const scrollBefore=await p.evaluate(()=>scrollY);await p.keyboard.down('ArrowUp');await p.waitForTimeout(250);const hzUp=await p.evaluate(()=>__r5.last.hz);await p.keyboard.up('ArrowUp');
  assert(Math.abs(hzUp-await nextHz(1))<.01&&hzUp>baseHz,'ArrowUp = one grid step higher at the cursor: '+baseHz+' → '+hzUp);
  await p.keyboard.down('ArrowDown');await p.waitForTimeout(250);const hzDown=await p.evaluate(()=>__r5.last.hz);await p.keyboard.up('ArrowDown');assert(Math.abs(hzDown-baseHz)<.01,'ArrowDown goes back one step: '+hzDown);
  await p.keyboard.down('ArrowDown');await p.waitForTimeout(250);const hzDown2=await p.evaluate(()=>__r5.last.hz);await p.keyboard.up('ArrowDown');assert(Math.abs(hzDown2-await nextHz(-1))<.01&&hzDown2<baseHz,'and one more step lower: '+hzDown2);
  assert.equal(await p.evaluate(()=>scrollY),scrollBefore,'the arrow keys do not scroll the page');
  // ---- spacing: linear (the Main Room) or logarithmic; the keys and the sound do not care ----
  await E('__NodalBallGrid.update({lockCursorToGrid:false})');await p.waitForTimeout(200);await fresh();
  const pressAt=async fy=>{await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*fy);await p.mouse.down();await p.waitForTimeout(300);const h=await p.evaluate(()=>__r5.last.hz);await p.mouse.up();return h};
  const lin1=await pressAt(.25),lin2=await pressAt(.5),lin3=await pressAt(.75);assert(Math.abs(lin2-(lin1+lin3)/2)<.5,'linear: equal steps in Hz ('+lin1+' '+lin2+' '+lin3+')');
  await p.locator('[data-psy-log]').click();await p.waitForTimeout(200);await fresh();const lg1=await pressAt(.25),lg2=await pressAt(.5),lg3=await pressAt(.75);assert(Math.abs(lg2*lg2-lg1*lg3)/(lg2*lg2)<.01,'logarithmic: equal ratios ('+lg1+' '+lg2+' '+lg3+')');assert(Math.abs(lg2-lin2)>5,'and the scale really changed');
  {const k1=parseFloat(await key('Digit1')),w1=await E('(p=>wF(p.gridBase,p.gridTuning,0,0,p.manualGridMutedSteps,p.manualGridStepOffsets))(__NodalBallGrid.params())');assert(Math.abs(k1-w1)<.01,'the keys ignore the spacing: '+k1+' vs '+w1)}
  await p.locator('[data-psy-log]').click();await p.waitForTimeout(200);await fresh();
  // ---- lines at the edges only; the notes that sound are drawn in pink over the full width ----
  const pixel=(fx,freq)=>p.evaluate(([fx,freq])=>{const c=document.querySelector('.xpl-pad canvas[role=application]'),k=c.width/1100,y=(1-(freq-55)/385)*580*k,d=c.getContext('2d').getImageData(Math.round(c.width*fx),Math.round(y),1,1).data;return[d[0],d[1],d[2],d[3]]},[fx,freq]);
  const hzQb=await E('(p=>uw(p.gridBase,p.gridTuning,p.manualGridMutedSteps,p.manualGridStepOffsets)[10])(__NodalBallGrid.params())');
  await p.locator('[aria-label="Snap ball to grid"]').getByRole('radio',{name:'Free'}).click();await E('__NodalBallGrid.update({lockCursorToGrid:false})');
  const quiet=await pixel(.5,hzQb);assert(quiet[3]<10,'edges only: no grid line in the middle, the mandala has the room: '+quiet);const edge=await pixel(.04,hzQb);assert(edge[3]>8,'but the line is there at the outer end: '+edge);
  await p.keyboard.down('KeyQ');await p.waitForTimeout(500);const lit=await pixel(.5,hzQb);await p.keyboard.up('KeyQ');assert(lit[3]>80&&lit[0]>150&&lit[2]>200&&lit[1]<170,'a sounding note is a pink line over the full width: '+lit);
  await p.locator('[data-psy-edges]').click();await p.waitForTimeout(300);const full=await pixel(.5,hzQb);assert(full[3]>8,'full lines: the grid line crosses the middle again: '+full);await p.locator('[data-psy-edges]').click();await p.waitForTimeout(300);
  await p.evaluate(()=>document.activeElement.blur());
  const hz1=parseFloat(await key('Digit1'));assert(Math.abs(hz1-440)<.01,'key 1 = the top grid note (440): '+hz1);
  const hzQ=parseFloat(await key('KeyQ')),want=await E('(p=>uw(p.gridBase,p.gridTuning,p.manualGridMutedSteps,p.manualGridStepOffsets)[10])(__NodalBallGrid.params())');assert(Math.abs(hzQ-want)<.01,'key Q = the 11th note of the Main Room grid (muted steps skipped): '+hzQ+' vs '+want);
  // third row (A–#, the Live Room's Keyboard Extension) continues the notes: A = 21st note ... L = 29th, # = 32nd (DE layout default)
  for(const[code,i]of[['KeyA',20],['KeyL',28],['Backslash',31]]){const hzK=parseFloat(await key(code)),wantK=await E('(p=>uw(p.gridBase,p.gridTuning,p.manualGridMutedSteps,p.manualGridStepOffsets)[0]&&wF(p.gridBase,p.gridTuning,0,'+i+',p.manualGridMutedSteps,p.manualGridStepOffsets))(__NodalBallGrid.params())');assert(Math.abs(hzK-wantK)<.01,code+' = key '+(i+1)+' of the extended keyboard: '+hzK+' vs '+wantK)}
  // the grid hotkeys work while a drop-down still has the focus (the Live Room does not block them either)
  await p.locator('select[aria-label="Grid mode"]').focus();const tBefore=(await grid()).tuning;await p.keyboard.press('Period');await p.waitForTimeout(350);assert.notEqual((await grid()).tuning,tBefore,'. cycles the grid system while a drop-down has the focus');
  assert(/^Grid: /.test(await p.locator('.xpl-status').innerText()),'the new grid is announced: '+await p.locator('.xpl-status').innerText());await p.keyboard.press('Comma');await p.waitForTimeout(350);assert.equal((await grid()).tuning,tBefore);
  // a click on the pad takes the focus away from the control, so that keys play again
  await p.locator('select[aria-label="Grid mode"]').focus();await fresh();await p.mouse.click(bx.x+bx.width*.6,bx.y+bx.height*.3);assert.equal(await p.evaluate(()=>document.activeElement===document.body||!document.activeElement.matches('select,input')),true,'the pad blurs the focused control');
  const before=(await grid()).tuning;await p.keyboard.press('Period');await p.waitForTimeout(300);const after=(await grid()).tuning;assert.notEqual(after,before,'. cycles the grid system');
  await p.keyboard.press('Comma');await p.waitForTimeout(300);assert.equal((await grid()).tuning,before,', cycles it back');
  const m0=(await grid()).mode;await p.keyboard.press('ControlRight');await p.waitForTimeout(300);assert.notEqual((await grid()).mode,m0,'right Ctrl cycles the grid mode');await p.keyboard.press('ControlRight');await p.keyboard.press('ControlRight');await p.keyboard.press('ControlRight');
  await E('__NodalBallGrid.changeMode("chromatic")');await p.waitForTimeout(200);
  // a muted step is silent on the keyboard, exactly like in the Live Room
  await E('__NodalBallGrid.toggleMute(0)');await p.waitForTimeout(200);const hzM=await key('Digit1');assert(/muted/.test(hzM)||Math.abs(parseFloat(hzM)-440)>1,'muted step does not play: '+hzM);await E('__NodalBallGrid.toggleMute(0)');await p.waitForTimeout(200);
  // ---- view switch: only the picture changes, never the keys ----
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/View: Main Room/.test(b.innerText)).click());await p.waitForTimeout(300);
  assert.equal(await p.locator('[data-psy-orient]').getAttribute('data-psy-orient'),'piano');
  const hzP=parseFloat(await key('Digit1'));assert(Math.abs(hzP-hz1)<.01,'the view does not touch the keys: key 1 is still '+hz1+' in piano view, got '+hzP);
  // pad in piano view: triangles are on the top edge, pitch grows to the right
  await fresh();const rows2=await rows(),ln=isolated(rows2).find(r=>!r.muted);const pxp=bx.x+(1100-(1-(ln.freq-55)/385)*1100)*sx,top=bx.y+8*sy;await p.mouse.click(pxp,top);await p.waitForTimeout(300);assert((await grid()).muted.includes(ln.step),'piano view: the triangle on the top edge mutes its step');await p.mouse.click(pxp,top);await p.waitForTimeout(300);assert(!(await grid()).muted.includes(ln.step),'and unmutes it again');
  await fresh();await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.6);await p.mouse.down();await p.waitForTimeout(600);const hzMid=await p.evaluate(()=>__r5.last.hz);await p.mouse.move(bx.x+bx.width*.9,bx.y+bx.height*.6,{steps:5});await p.waitForTimeout(300);const hzHi=parseFloat(await p.locator('.xpl-readout').innerText());await p.mouse.up();assert(hzHi>hzMid,'piano view: moving right raises the pitch '+hzMid+' → '+hzHi);
  // direction: turning the pitch axis round makes the right side the low side (piano view)
  await p.locator('[data-psy-flip]').click();await p.waitForTimeout(200);await fresh();await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.6);await p.mouse.down();await p.waitForTimeout(500);
  await p.mouse.move(bx.x+bx.width*.9,bx.y+bx.height*.6,{steps:5});await p.waitForTimeout(300);const hzFlipR=parseFloat(await p.locator('.xpl-readout').innerText());await p.mouse.move(bx.x+bx.width*.1,bx.y+bx.height*.6,{steps:5});await p.waitForTimeout(300);const hzFlipL=parseFloat(await p.locator('.xpl-readout').innerText());await p.mouse.up();
  assert(hzFlipL>hzFlipR,'flipped piano view: left is high, right is low: '+hzFlipL+' / '+hzFlipR);assert.equal(parseFloat(await key('Digit1')),hz1,'the keys ignore the direction');
  await p.locator('[data-psy-flip]').click();await p.waitForTimeout(200);
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/View: piano/.test(b.innerText)).click());await p.waitForTimeout(300);
  // Main Room view, flipped: low on top
  await p.locator('[data-psy-flip]').click();await p.waitForTimeout(200);await fresh();await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*.1);await p.mouse.down();await p.waitForTimeout(500);const hzTopFlip=parseFloat(await p.locator('.xpl-readout').innerText());await p.mouse.up();
  await p.locator('[data-psy-flip]').click();await p.waitForTimeout(200);await p.mouse.move(bx.x+bx.width*.6,bx.y+bx.height*.1);await p.mouse.down();await p.waitForTimeout(500);const hzTop=parseFloat(await p.locator('.xpl-readout').innerText());await p.mouse.up();
  assert(hzTop>hzTopFlip+100,'Main Room view: high on top by default, low on top when flipped: '+hzTop+' vs '+hzTopFlip);
  // keys mirrored: its own switch (the Live Room's mirror)
  await p.locator('[data-psy-mirror]').click();await p.evaluate(()=>document.activeElement.blur());const hzMir=parseFloat(await key('Digit1')),wantMir=await E('(p=>wF(p.gridBase,p.gridTuning,0,31,p.manualGridMutedSteps,p.manualGridStepOffsets))(__NodalBallGrid.params())');assert(Math.abs(hzMir-wantMir)<.01,'keys low → high: key 1 plays the 32nd position: '+hzMir+' vs '+wantMir);
  await p.locator('[data-psy-mirror]').click();await p.evaluate(()=>document.activeElement.blur());assert.equal(parseFloat(await key('Digit1')),hz1,'mirror off again');
  // German / English keyboard: the same setting as the Live Room, it only changes the third row (A–# or A–/); the notes stay 1–0, Q–P, third row = 32 positions
  assert(/Three pitch rows: 1–0 · Q–P · A S D F G H J K L Ö Ä # · 32 positions/.test(await p.locator('.xpl-gridsub').innerText()),'default German layout, the hint uses the Live Room\'s own wording');assert.equal(await p.locator('input[aria-label="Keyboard Extension"]').count(),0,'no extra Keyboard Extension switch: all three rows always play');
  await p.locator('[data-psy-layout="en"]').click();await p.evaluate(()=>document.activeElement.blur());assert(/A S D F G H J K L ; ' \/ · 32 positions/.test(await p.locator('.xpl-gridsub').innerText()),'English layout: A–/');
  assert.equal(await E('__XenKeyboardLayout.getSnapshot()'),'en','the Live Room\'s own layout setting changed');
  const hzSlash=parseFloat(await key('Slash')),want32=await E('(p=>wF(p.gridBase,p.gridTuning,0,31,p.manualGridMutedSteps,p.manualGridStepOffsets))(__NodalBallGrid.params())');assert(Math.abs(hzSlash-want32)<.01,'English layout: the / key is the 32nd position: '+hzSlash+' vs '+want32);
  await p.locator('[data-psy-layout="de"]').click();await p.evaluate(()=>document.activeElement.blur());const hzHash=parseFloat(await key('Backslash'));assert(Math.abs(hzHash-want32)<.01,'German layout: the # key is the 32nd position');
  // large view: the pad takes the full width, controls and sliders move below it
  const smallW=(await canvas.boundingBox()).width;await p.locator('[data-psy-large]').click();await p.waitForTimeout(600);await fresh();assert(bx.width>smallW*1.5,'large view: the pad is much wider: '+smallW+' -> '+bx.width);
  const panelsTop=await p.evaluate(()=>document.querySelector('.xpl-panels').getBoundingClientRect().top),padBottom=bx.y+bx.height;assert(panelsTop>=padBottom-1,'large view: the sliders sit below the pad: '+panelsTop+' vs '+padBottom);
  const sc3=await scopeInfo();assert(sc3.w>1100&&sc3.w===(await p.evaluate(()=>document.querySelector('.xpl-pad canvas[role=application]').width)),'the picture follows the displayed size (crisp in the large view): '+sc3.w);
  await p.mouse.move(bx.x+bx.width*.5,bx.y+bx.height*.5);await p.mouse.down();await p.waitForTimeout(500);assert(parseFloat(await p.locator('.xpl-readout').innerText())>0,'the large pad plays');await p.mouse.up();
  const stored2=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.psylab.instruments.v1')));await p.waitForTimeout(800);const st3=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.psylab.instruments.v1')));assert.equal(st3.large,true);assert.equal(st3.mirror,false);
  await p.locator('[data-psy-large]').click();await p.waitForTimeout(400);await fresh();
  // ---- octave shift, sliders, patches, hold, bounce ----
  await p.locator('button[aria-label="Octave up"]').click();const hzO=parseFloat(await key('Digit1'));assert(Math.abs(hzO-880)<.1,'octave +1 doubles the key pitch: '+hzO);await p.locator('button[aria-label="Octave down"]').click();
  const slider=p.locator('input[data-psy-param="fold"]');await slider.focus();for(let i=0;i<30;i++)await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);
  const lp=await p.evaluate(()=>__r5.lastParam);assert.equal(lp[0],11);assert(lp[1]>.07&&lp[1]<.1,'fold moved by 30 steps: '+lp[1]);await p.evaluate(()=>document.activeElement.blur());
  await p.selectOption('select[aria-label="Patch"]',{label:'Liquid Bell'});await p.evaluate(()=>document.activeElement.blur());await p.waitForTimeout(300);
  assert(/Grid → Just Intonation/.test(await p.locator('.xpl-bar').innerText()),'patch suggests its grid system');
  await p.keyboard.press('Space');await p.keyboard.press('Digit1');await p.waitForTimeout(1200);const held=await p.evaluate(()=>__r5.level());assert(held>.005,'held drone sounds after key release: '+held);
  await p.fill('input[aria-label="Bounce length in seconds"]','2');await p.evaluate(()=>[...document.querySelectorAll('.xpl button')].find(b=>/Multitrack/.test(b.innerText)).click());
  await p.waitForFunction(()=>/Sent|failed/.test(document.querySelector('.xpl-status').innerText),null,{timeout:30000});const status=await p.locator('.xpl-status').innerText();assert(/^Sent/.test(status),status);
  await p.keyboard.press('Escape');await p.waitForTimeout(600);
  // ---- persistence: working patch, view, octave survive a reload; the grid itself belongs to the Main Room ----
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/View: Main Room/.test(b.innerText)).click());await p.waitForTimeout(900);
  const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.psylab.instruments.v1')));assert.equal(stored.format,'xensonar.psylab');assert.equal(stored.orient,'piano');assert.equal(stored.hold,true);assert.equal(stored.working.scale,undefined);assert(!('scale' in stored.working)||true);
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1000);
  assert.equal(await p.locator('[data-psy-orient]').getAttribute('data-psy-orient'),'piano','the view is remembered');
  // ---- leaving while a note sounds: silent afterwards ----
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/View: piano/.test(b.innerText)).click());await p.keyboard.press('Space');
  const bx2=await p.locator('.xpl-pad canvas[role=application]').boundingBox();await p.mouse.move(bx2.x+bx2.width*.5,bx2.y+bx2.height*.4);await p.mouse.down();await p.waitForTimeout(900);assert(await p.evaluate(()=>__r5.level())>.005);
  p.once('dialog',d=>d.accept());await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/LIVE ROOM/.test(b.innerText)).click()});await p.mouse.up();await p.waitForTimeout(2500);
  assert.equal(await p.locator('[data-xen-psylab]').count(),0);const after2=await p.evaluate(()=>__r5.level());assert(after2<.002,'silent after leaving: '+after2);
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-02 psylab room on the Main Room grid',{padPeak:+l1.toFixed(3),heldPeak:+held.toFixed(3),hz1,hzP,hzO});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
