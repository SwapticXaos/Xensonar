#!/usr/bin/env node
// TEST ONLY. Feasibility of a repeated-quantum guard (RFL-GUARD) in a minimal page without XenSonar:
// sine worklet -> gain -> guard worklet -> tapAfter, and gain -> tapBefore. The main thread churns unrelated nodes.
// Counts clicks (second-difference detector, same as the RFL probes) before and after the guard, and the guard's own detections.
//   node tools/probes/rfl_guard_minimal.cjs [--sec 30] [--ops 12] [--burst 3] [--guard path/to/guard-source.js]
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const SEC=+arg('--sec',30),OPS=+arg('--ops',12),BURST=+arg('--burst',3);
const GUARD=fs.readFileSync(arg('--guard',path.join(__dirname,'..','..','src','audio','rfl','03_repeat_guard_worklet.js')),'utf8');
const guardSrc=GUARD.slice(GUARD.indexOf('String.raw`')+11,GUARD.indexOf('`;',GUARD.indexOf('String.raw`')));
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();
  const html=path.join(os.tmpdir(),'rfl_guard_min_'+process.pid+'.html');fs.writeFileSync(html,'<!doctype html><title>g</title>');await p.goto('file://'+html);
  const r=await p.evaluate(async({SEC,OPS,BURST,guardSrc,DETAIL})=>{const process={env:{DETAIL}};
    const ctx=new AudioContext({sampleRate:44100});
    const src=`class S extends AudioWorkletProcessor{process(i,o){const a=o[0][0];for(let k=0;k<a.length;k++){const f=currentFrame+k;a[k]=0.3*Math.sin(2*Math.PI*331.7*f/sampleRate)+0.2*Math.sin(2*Math.PI*97.3*f/sampleRate)}return true}}registerProcessor('s',S);
     class T extends AudioWorkletProcessor{constructor(o){super();this.b=new Float32Array(128*64);this.n=0;this.f0=currentFrame}process(i){const a=i[0]&&i[0][0];if(a)this.b.set(a,this.n*128);else this.b.fill(0,this.n*128,this.n*128+128);if(++this.n===64){this.port.postMessage({f:this.f0,b:this.b},[this.b.buffer]);this.b=new Float32Array(128*64);this.n=0;this.f0=currentFrame+128}return true}}registerProcessor('t',T)`;
    await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));
    await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(guardSrc));
    const s=new AudioWorkletNode(ctx,'s',{outputChannelCount:[1]}),g=ctx.createGain();
    const G=new AudioWorkletNode(ctx,'xensonar-rfl-repeat-guard-v1',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'});
    const tb=new AudioWorkletNode(ctx,'t',{numberOfOutputs:0}),ta=new AudioWorkletNode(ctx,'t',{numberOfOutputs:0});
    s.connect(g);g.connect(G);G.connect(ctx.destination);G.connect(ta);g.connect(tb);
    const C={a:[],b:[]};ta.port.onmessage=e=>C.a.push(e.data);tb.port.onmessage=e=>C.b.push(e.data);
    let det=null;G.port.onmessage=e=>{det=e.data};
    const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);const buf=ctx.createBuffer(1,4410,44100);
    const iv=setInterval(()=>{for(let k=0;k<BURST;k++){const n=ctx.createBufferSource();n.buffer=buf;const gg=ctx.createGain();n.connect(gg);gg.connect(sink);n.start();n.onended=()=>gg.disconnect()}},1000/OPS);
    await new Promise(k=>setTimeout(k,SEC*1000));clearInterval(iv);G.port.postMessage({type:'report'});await new Promise(k=>setTimeout(k,400));
    const join=cs=>{cs.sort((x,y)=>x.f-y.f);const f0=cs[0].f,n=cs[cs.length-1].f+8192-f0,m=new Float32Array(n);for(const c of cs)m.set(c.b,c.f-f0);return m};
    const detect=(f32)=>{const n=f32.length,out=[];const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[i]-2*f32[i-1]+f32[i-2]);const W=384,G=6;let i=W+2+44100;
      while(i<n-W){if(d[i]>0.012){let mx=0,sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++;if(d[k]>mx)mx=d[k]}let s2=sb,c2=cb;for(let k=i+G+1;k<=i+W;k++){s2+=d[k];c2++}const ratio=d[i]/(s2/c2+1e-7);if(ratio>25&&d[i]>8*mx){out.push(process.env.DETAIL?{i,t:+(i/44100).toFixed(4),d2:+d[i].toFixed(4),step:+Math.abs(f32[i]-f32[i-1]).toFixed(4),bg:+(s2/c2).toFixed(5)}:+(i/44100).toFixed(3));i+=W;continue}}i++}return out};
    const repAt=m=>{const r=[];for(let q=128*400;q+128<=m.length;q+=128){let same=true,e=0;for(let k=0;k<128;k++){if(m[q+k]!==m[q+k-128]){same=false;break}e+=Math.abs(m[q+k])}if(same&&e>1e-6)r.push(+(q/44100).toFixed(4))}return r};
    const rep=m=>{let c=0;for(let q=128*400;q+128<=m.length;q+=128){let same=true,e=0;for(let k=0;k<128;k++){if(m[q+k]!==m[q+k-128]){same=false;break}e+=Math.abs(m[q+k])}if(same&&e>1e-6)c++}return c};
    const A=join(C.a),B=join(C.b);
    const fa=C.a[0].f,fb=C.b[0].f;return{before:{clicks:detect(B).length,repeats:rep(B)},after:{clicks:detect(A).length,repeats:rep(A)},guard:det,detail:process.env.DETAIL?{offset:(fa-fb)/44100,beforeRep:repAt(B),beforeClicks:detect(B),afterClicks:detect(A)}:undefined}
  },{SEC,OPS,BURST,guardSrc,DETAIL:process.env.DETAIL||''});
  console.log(JSON.stringify({opsPerSec:OPS*BURST*2,...r}));await b.close();
})();
