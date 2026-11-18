'use strict';
// ROOM-SEAMS-03 (real app, Room V Multitrack): playback and a room change. A clip plays (level on the master output); leaving
// the room stops it (silence while another room is shown); back in the room the transport shows "▶ Play" (no stale "Stop"),
// Stop is harmless, and Play plays again. No page error.
// Usage: node tests/e2e/room_seams_multitrack.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__lvl={m:0};const C=AudioNode.prototype.connect,taps=new WeakMap();AudioNode.prototype.connect=function(d,...r){const res=C.call(this,d,...r);try{if(d instanceof AudioDestinationNode&&!this.__t){const c=d.context;let sp=taps.get(c);if(!sp){sp=c.createScriptProcessor(2048,2,2);const z=c.createGain();z.gain.value=0;sp.__t=z.__t=1;sp.onaudioprocess=e=>{const x=e.inputBuffer.getChannelData(0);for(let i=0;i<x.length;i+=4)__lvl.m=Math.max(__lvl.m,Math.abs(x[i]))};C.call(sp,z);C.call(z,d);taps.set(c,sp)}C.call(this,sp)}}catch{}return res}});
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const go=n=>p.evaluate(n=>[...document.querySelectorAll('header button')].find(x=>x.innerText.replace(/\s+/g,' ').includes(n)&&x.offsetParent).click(),n);
 await go('MULTITRACK');await p.waitForTimeout(2500);
 await E(`(async()=>{const sr=48000,n=sr*8,L=new Float32Array(n);for(let i=0;i<n;i++)L[i]=.3*Math.sin(2*Math.PI*220*i/sr);await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'seam-tone',origin:'probe',bpm:120,bars:4,enqueue:true})})()`);await p.waitForTimeout(2000);
 const level=async()=>{await p.evaluate(()=>{__lvl.m=0});await p.waitForTimeout(1200);return p.evaluate(()=>__lvl.m)};
 const transport=()=>p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&/^(▶ Play|■ Stop)$/.test(b.innerText.trim())).map(b=>b.innerText.trim()));
 await p.getByRole('button',{name:/Play from cursor/}).first().click();await p.waitForTimeout(800);
 const l1=await level();assert.ok(l1>.2,'the clip plays: '+l1.toFixed(3));assert.deepEqual(await transport(),['■ Stop']);
 await go('LIVE ROOM');await p.waitForTimeout(1000);const l2=await level();assert.ok(l2<.01,'leaving the room stops the playback: '+l2.toFixed(3));
 await go('MULTITRACK');await p.waitForTimeout(1500);assert.deepEqual(await transport(),['▶ Play'],'back in the room the transport is not stuck at Stop');
 assert.ok((await level())<.01,'still silent until Play');
 await p.getByRole('button',{name:/Play from cursor/}).first().click();await p.waitForTimeout(800);const l3=await level();assert.ok(l3>.2,'Play plays again: '+l3.toFixed(3));
 assert.deepEqual(errors,[]);console.log('PASS ROOM-SEAMS-03: Multitrack plays ('+l1.toFixed(2)+'), stops when the room is left, comes back at Play, plays again ('+l3.toFixed(2)+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
