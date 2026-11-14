'use strict';
// VOICE-HOST-01 (real app, probe build): with drums and bass playing, the main thread no longer changes the audio graph per hit/note,
// and the browser no longer hands AudioWorklets stale clocks (the cause of the Root-Follow crackle and of false recording gaps).
// Same 20 s run twice: default (resident worklet voices) and ?xenVoiceHost=0 (previous native nodes, as the counter-check).
// Usage: node tests/e2e/voice_host_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const SEC=+(process.env.LIVE_SEC||20);
async function run(query){
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__clk={ops:0,created:0};const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
  AudioNode.prototype.connect=function(){S.ops++;return oc.apply(this,arguments)};AudioNode.prototype.disconnect=function(){S.ops++;return od.apply(this,arguments)};
  const B=BaseAudioContext.prototype;for(const k of ['createGain','createOscillator','createBufferSource','createBiquadFilter','createStereoPanner','createWaveShaper']){const o=B[k];B[k]=function(...a){if(!(this instanceof OfflineAudioContext))S.created++;return o.apply(this,a)}}});
 await p.goto('file://'+html+(query?'?'+query:''));await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 await E(`__NodalBallGrid.update({drumActive:true,bassActive:true})`);await p.waitForTimeout(3000);
 await E(`(async()=>{const s=__XenLiveStemSource.get(),ctx=s.ctx;const src="class C extends AudioWorkletProcessor{constructor(){super();this.l=-1;this.s=0;this.peak=0;this.port.onmessage=()=>{this.port.postMessage({stale:this.s,peak:this.peak})}}process(i){const f=currentFrame;if(this.l>=0&&f!==this.l+128)this.s++;this.l=this.l<0?f:Math.max(f,this.l+128);const x=i[0]&&i[0][0];if(x)for(let k=0;k<x.length;k++){const v=Math.abs(x[k]);if(v>this.peak)this.peak=v}return true}}registerProcessor('xen-clock-watch',C)";
  await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));const n=new AudioWorkletNode(ctx,'xen-clock-watch',{numberOfOutputs:0});s.premaster.connect(n);window.__clkNode=n;return true})()`);
 const before=await p.evaluate(()=>({...__clk}));
 const box=await (await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0])).boundingBox();
 const t0=Date.now();while(Date.now()-t0<SEC*1000){const t=(Date.now()-t0)/1000;await p.mouse.move(box.x+box.width*(.5+.35*Math.sin(t)),box.y+box.height*(.5+.35*Math.sin(t*.7)));if(Math.floor(t)%3===0)await p.keyboard.press('KeyA');await p.waitForTimeout(40)}
 const after=await p.evaluate(()=>({...__clk}));
 const watch=await p.evaluate(()=>new Promise(r=>{__clkNode.port.onmessage=e=>r(e.data);__clkNode.port.postMessage(0)}));
 const host=await E(`__XenLiveVoiceHost.status(__XenLiveStemSource.get().ctx)`);
 await b.close();
 return {opsPerSec:+((after.ops-before.ops)/SEC).toFixed(1),createdPerSec:+((after.created-before.created)/SEC).toFixed(1),stale:watch.stale,peak:+watch.peak.toFixed(3),host,errors};
}
(async()=>{
 const now=await run(''),old=await run('xenVoiceHost=0');
 console.log('worklet voices',JSON.stringify(now));console.log('native voices ',JSON.stringify(old));
 assert.equal(now.host.ok,true,'voice host loaded');assert.equal(now.host.tables,true,'bass wave tables ready');
 assert.ok(old.opsPerSec>10,'counter-check: native drum/bass voices change the graph ('+old.opsPerSec+'/s)');
 assert.ok(now.opsPerSec<2,'drums and bass play without graph changes ('+now.opsPerSec+'/s)');
 assert.ok(now.createdPerSec<1,'no audio node is created per hit/note ('+now.createdPerSec+'/s)');
 assert.ok(now.stale<=2,'at most a stray stale worklet clock in '+SEC+' s (was '+old.stale+' with native voices): '+now.stale);
 assert.ok(now.peak>.05,'the live mix is audible ('+now.peak+')');
 assert.ok(Math.abs(20*Math.log10(now.peak/old.peak))<3,'same loudness as before within 3 dB (peak '+now.peak+' vs '+old.peak+')');
 assert.deepEqual(now.errors,[],'no page errors');
 console.log(`PASS VOICE-HOST-01 live: graph ops ${old.opsPerSec}/s → ${now.opsPerSec}/s, nodes ${old.createdPerSec}/s → ${now.createdPerSec}/s, stale worklet clocks ${old.stale} → ${now.stale} in ${SEC} s, peak ${old.peak} → ${now.peak}`);
})().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,4).join('\n'));process.exit(1)});
