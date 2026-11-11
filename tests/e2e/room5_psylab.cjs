'use strict';
// ROOM5-01 (real app): Room V · Psychedelic Lab. Chunk stays cold until opened; pad and keyboard make sound on the
// live master; sliders reach the engine; patch + tuning survive a reload; bounce becomes a Material; leaving is silent.
// Usage: node tests/e2e/room5_psylab.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const shot=process.env.SHOT||'';
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__r5={nodes:[],meter:null,posts:0};
    // meter on everything that reaches the destination of the live context
    const oc=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d){const r=oc.apply(this,arguments);try{if(d instanceof AudioDestinationNode&&d.context instanceof AudioContext){if(!S.meter||S.meter.context!==d.context){S.meter=d.context.createAnalyser();S.meter.fftSize=2048}oc.call(this,S.meter)}}catch(e){}return r};
    const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(c instanceof AudioContext)S.nodes.push(n);if(n==='xen-psylab-v1'){const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{S.posts++;S.last=m&&m.t;if(m&&m.t==='p')S.lastParam=[m.i,m.v];return pm(m,t)}}}};
    S.level=()=>{if(!S.meter)return 0;const a=new Float32Array(S.meter.fftSize);S.meter.getFloatTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v));return m}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),false,'chunk is not evaluated at boot');
  assert.equal(await p.evaluate(()=>!!document.getElementById('xen-psylab-style')),false);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText));b.click()});await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),true,'chunk loaded on open');
  assert.equal(await p.locator('[data-xen-psylab]').count(),1);assert.equal(await p.evaluate(()=>__r5.nodes.includes('xen-psylab-v1')),false,'no audio node before the first note');
  const pad=p.locator('.xpl-pad');const bx=await pad.boundingBox();
  // pad: press, drag, release
  await p.mouse.move(bx.x+bx.width*.45,bx.y+bx.height*.5);await p.mouse.down();await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(()=>__r5.nodes.includes('xen-psylab-v1')),true,'engine created by the first note');
  const l1=await p.evaluate(()=>__r5.level());await p.mouse.move(bx.x+bx.width*.7,bx.y+bx.height*.2,{steps:8});await p.waitForTimeout(300);
  assert.equal(await p.evaluate(()=>__r5.last),'p','dragging sends pitch bend and Pad Y');const readout=await p.locator('.xpl-readout').innerText();
  if(shot){await p.waitForTimeout(400);await p.screenshot({path:shot})}
  await p.mouse.up();assert(l1>.01,'pad note is audible on the live master (peak '+l1+')');assert(/Hz/.test(readout));
  // a slider reaches the engine and its label
  const slider=p.locator('input[data-psy-param="fold"]');await slider.focus();for(let i=0;i<30;i++)await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);
  const lp=await p.evaluate(()=>__r5.lastParam);assert.equal(lp[0],11);assert(lp[1]>.07&&lp[1]<.1,'fold moved by 30 steps: '+lp[1]);
  // keyboard walks the scale; another tuning changes the pitch of the same key
  await p.evaluate(()=>document.activeElement.blur());const key=async()=>{await p.keyboard.down('KeyD');await p.waitForTimeout(250);const t=await p.locator('.xpl-readout').innerText();await p.keyboard.up('KeyD');return parseFloat(t)};
  const hzA=await key();await p.fill('#xpl-scale','19edo');await p.keyboard.press('Enter');await p.waitForTimeout(200);const hzB=await key();assert(hzA>20&&hzB>20&&Math.abs(hzA-hzB)>.5,'tuning changes the key pitch: '+hzA+' vs '+hzB);
  assert(/19 steps per period 2/.test(await p.locator('.xpl-tune').innerText()));
  // factory patch, then hold (latched drone) and bounce to Multitrack
  await p.selectOption('select[aria-label="Patch"]',{label:'Escher Staircase'});await p.evaluate(()=>document.activeElement.blur());await p.waitForTimeout(300);assert.equal(await p.inputValue('#xpl-scale'),'1/1 9/8 5/4 3/2 5/3');
  await p.keyboard.press('Space');await p.keyboard.press('KeyA');await p.waitForTimeout(1200);const held=await p.evaluate(()=>__r5.level());assert(held>.01,'held drone sounds after key release: '+held);
  await p.fill('input[aria-label="Bounce length in seconds"]','2');await p.evaluate(()=>[...document.querySelectorAll('.xpl button')].find(b=>/Multitrack/.test(b.innerText)).click());
  await p.waitForFunction(()=>/Sent|failed/.test(document.querySelector('.xpl-status').innerText),null,{timeout:30000});const status=await p.locator('.xpl-status').innerText();assert(/^Sent/.test(status),status);
  assert.equal(await p.evaluate(async()=>{const d=await new Promise((ok,bad)=>{const r=indexedDB.open('xensonar-multitrack-v1');r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error)});return new Promise(ok=>{const q=d.transaction('projects').objectStore('projects').get('inbox');q.onsuccess=()=>ok((q.result||[]).filter(x=>x.origin==='psylab').length)})}),1,'bounce waits in the Multitrack inbox');
  await p.keyboard.press('Escape');await p.waitForTimeout(600);
  // persistence: working patch and tuning survive a reload
  await p.fill('#xpl-root','137.5');await p.keyboard.press('Enter');await p.waitForTimeout(900);
  const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.psylab.instruments.v1')));assert.equal(stored.format,'xensonar.psylab');assert.equal(stored.working.root,137.5);assert.equal(stored.hold,true);
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/PSY LAB/.test(b.innerText)).click()});await p.waitForTimeout(1000);
  assert.equal(await p.inputValue('#xpl-root'),'137.5');assert.equal(await p.inputValue('#xpl-scale'),'1/1 9/8 5/4 3/2 5/3');
  // leaving while a note sounds: silent afterwards, no node left rendering
  const bx2=await p.locator('.xpl-pad').boundingBox();await p.keyboard.press('Space');await p.mouse.move(bx2.x+bx2.width*.5,bx2.y+bx2.height*.4);await p.mouse.down();await p.waitForTimeout(900);
  assert(await p.evaluate(()=>__r5.level())>.01);
  p.once('dialog',d=>d.accept());await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/LIVE ROOM/.test(b.innerText)).click()});await p.mouse.up();await p.waitForTimeout(2500);
  assert.equal(await p.locator('[data-xen-psylab]').count(),0);const after=await p.evaluate(()=>__r5.level());assert(after<.002,'silent after leaving: '+after);
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-01 psylab room',{padPeak:+l1.toFixed(3),heldPeak:+held.toFixed(3),hzA,hzB,status:status.slice(0,60)});
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
