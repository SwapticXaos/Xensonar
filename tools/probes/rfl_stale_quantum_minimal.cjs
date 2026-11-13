#!/usr/bin/env node
// TEST ONLY. Minimal browser repro WITHOUT XenSonar: is a node's output quantum ever repeated (exact copy of the previous 128 frames)
// while the main thread connects/disconnects unrelated nodes?  Source = deterministic ramp-free sine in an AudioWorklet (computes from currentFrame),
// captured by a second tap worklet. A repeated quantum shows up as a frame whose content equals the frame 128 earlier.
//   node tools/probes/rfl_stale_quantum_minimal.cjs [--sec 30] [--ops 60] [--burst 3] [--mode none|churn|bufsrc|absonly|startonly|param]  (absonly = only BufferSource.connect(persistent gain), no disconnect; startonly = create+start without connect; param = AudioParam automation only)
const {chromium}=require('playwright');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const SEC=+arg('--sec',30),OPS=+arg('--ops',60),BURST=+arg('--burst',3),MODE=arg('--mode','churn');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();
  const fs=require('fs'),os=require('os'),path=require('path');const html=path.join(os.tmpdir(),'rfl_minimal_'+process.pid+'.html');fs.writeFileSync(html,'<!doctype html><title>m</title>');await p.goto('file://'+html);
  const r=await p.evaluate(async({SEC,OPS,BURST,MODE})=>{
    const ctx=new AudioContext({sampleRate:44100});
    const src=`class S extends AudioWorkletProcessor{process(i,o){const a=o[0][0];for(let k=0;k<a.length;k++){const f=currentFrame+k;a[k]=0.5*Math.sin(2*Math.PI*331.7*f/sampleRate)}return true}}registerProcessor('s',S);
     class T extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(128*64);this.n=0;this.f0=currentFrame}process(i){const a=i[0]&&i[0][0];if(a)this.b.set(a,this.n*128);if(++this.n===64){this.port.postMessage({f:this.f0,b:this.b},[this.b.buffer]);this.b=new Float32Array(128*64);this.n=0;this.f0=currentFrame+128}return true}}registerProcessor('t',T)`;
    await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));
    const s=new AudioWorkletNode(ctx,'s',{outputChannelCount:[1]}),g=ctx.createGain(),t=new AudioWorkletNode(ctx,'t',{numberOfOutputs:0});
    s.connect(g);g.connect(ctx.destination);g.connect(t);
    const chunks=[];t.port.onmessage=e=>chunks.push(e.data);
    const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);
    const buf=ctx.createBuffer(1,4410,44100);
    let ops=0;const iv=MODE==='none'?0:setInterval(()=>{for(let k=0;k<BURST;k++){if(MODE==='absonly'){const n=ctx.createBufferSource();n.buffer=buf;n.connect(sink);n.start();ops+=1}else if(MODE==='startonly'){const n=ctx.createBufferSource();n.buffer=buf;n.start();ops+=0}else if(MODE==='param'){sink.gain.setValueAtTime(0,ctx.currentTime+.01);ops+=0}else if(MODE==='bufsrc'){const n=ctx.createBufferSource();n.buffer=buf;const gg=ctx.createGain();n.connect(gg);gg.connect(sink);n.start();n.onended=()=>{gg.disconnect()};ops+=2}else{const n=ctx.createGain();n.connect(sink);n.disconnect();ops+=2}}},1000/OPS);
    await new Promise(k=>setTimeout(k,SEC*1000));clearInterval(iv);await new Promise(k=>setTimeout(k,300));
    chunks.sort((a,b)=>a.f-b.f);const f0=chunks[0].f,n=chunks[chunks.length-1].f+8192-f0,m=new Float32Array(n);for(const c of chunks)m.set(c.b,c.f-f0);
    // expected signal (gain 1): compare per quantum; detect repeated quanta
    const bad=[];for(let q=0;q+128<=n;q+=128){let e=0,rep=0;for(let k=0;k<128;k++){const f=f0+q+k,x=0.5*Math.sin(2*Math.PI*331.7*f/44100);e=Math.max(e,Math.abs(m[q+k]-x));if(q>=128)rep=Math.max(rep,Math.abs(m[q+k]-m[q+k-128]))}if(e>1e-3)bad.push({t:+((f0+q)/44100).toFixed(4),err:+e.toFixed(3),repeatOfPrev:rep<1e-6})}
    const late=bad.filter(x=>x.t>0.5);return{seconds:+(n/44100).toFixed(1),ops,badQuantaAfter0_5s:late.length,repeatsAfter0_5s:late.filter(x=>x.repeatOfPrev).length,startupBad:bad.length-late.length,sample:late.slice(0,6)}
  },{SEC,OPS,BURST,MODE});
  console.log(JSON.stringify({mode:MODE,opsPerSec:OPS*BURST,...r}));await b.close();
})();
