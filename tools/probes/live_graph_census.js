#!/usr/bin/env node
// TEST ONLY. Which creation sites own the nodes that are pulled by the realtime destination right now?
// Usage: node tools/probes/live_graph_census.js /abs/index.html [--after-play]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const http=require('http');
const HTML=path.resolve(process.argv[2]||'index.html');const lines=fs.readFileSync(HTML,'utf8').split('\n');
const snip=s=>{const m=/(\d+):(\d+)$/.exec(s);if(!m)return'';const t=lines[+m[1]-1]||'';return t.slice(Math.max(0,+m[2]-60),+m[2]+70).replace(/\s+/g,' ')};
(async()=>{
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(HTML).pipe(r)});await new Promise(k=>srv.listen(0,'127.0.0.1',k));
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.addInitScript(()=>{
    const C=window.__census={nodes:[],byNode:new WeakMap(),paramOwner:new WeakMap()};
    const site=()=>{const s=(new Error().stack||'').split('\n');const out=[];for(let i=2;i<s.length&&out.length<3;i++){if(!/127\.0\.0\.1/.test(s[i]))continue;const m=/:(\d+):(\d+)\)?$/.exec(s[i]);if(m)out.push(m[1]+':'+m[2])}return out.join(' < ')};
    const reg=(n,kind)=>{if(!(n.context instanceof AudioContext))return n;const r={kind,site:site(),ref:{deref:()=>n},out:new Map(),ended:false,started:false,stopAt:Infinity};C.nodes.push(r);C.byNode.set(n,r);
      for(const k in n){try{if(n[k] instanceof AudioParam)C.paramOwner.set(n[k],n)}catch(e){}}
      if(n.parameters&&n.parameters.forEach)n.parameters.forEach(q=>C.paramOwner.set(q,n));
      if(n.addEventListener&&('onended' in n))n.addEventListener('ended',()=>{r.ended=true});return n};
    for(const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)){if(!/^create/.test(k))continue;const o=BaseAudioContext.prototype[k];if(typeof o!=='function')continue;
      BaseAudioContext.prototype[k]=function(){const n=o.apply(this,arguments);return n instanceof AudioNode?reg(n,k.replace('create','')):n}}
    for(const P of[OscillatorNode.prototype,AudioBufferSourceNode.prototype,ConstantSourceNode.prototype]){const s=P.start,st=P.stop;P.start=function(){const r=C.byNode.get(this);if(r)r.started=true;return s.apply(this,arguments)};P.stop=function(t){const r=C.byNode.get(this);if(r)r.stopAt=t||0;return st.apply(this,arguments)}}
    for(const name of['GainNode','OscillatorNode','BiquadFilterNode','AudioBufferSourceNode','StereoPannerNode','WaveShaperNode','DelayNode','DynamicsCompressorNode','ConvolverNode','AnalyserNode','ConstantSourceNode','ChannelMergerNode','ChannelSplitterNode','PannerNode','IIRFilterNode','AudioWorkletNode','MediaStreamAudioDestinationNode','MediaElementAudioSourceNode','MediaStreamAudioSourceNode']){
      const O=window[name];if(!O)continue;window[name]=class extends O{constructor(c,o){super(c,o);reg(this,name.replace('Node','')+(name==='AudioWorkletNode'?':'+o:'')+'*')}};
      if(name==='AudioWorkletNode')window[name]=class extends O{constructor(c,n,o){super(c,n,o);reg(this,'Worklet:'+n)}}}
    const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
    AudioNode.prototype.connect=function(d){const r=C.byNode.get(this);if(r){const t=d instanceof AudioParam?C.paramOwner.get(d):d;if(t)r.out.set(t,(r.out.get(t)||0)+1);else r.unknownParam=true}return oc.apply(this,arguments)};
    AudioNode.prototype.disconnect=function(d){const r=C.byNode.get(this);if(r){if(d===undefined||typeof d==='number')r.out.clear();else{const t=d instanceof AudioParam?C.paramOwner.get(d):d;r.out.delete(t)}}return od.apply(this,arguments)};
    C.report=()=>{const dest=new Set();let ctx=null;for(const r of C.nodes){const n=r.ref.deref();if(n){ctx=n.context;break}}if(!ctx)return null;
      // reverse edges
      const inc=new Map();const live=[];for(const r of C.nodes){const n=r.ref.deref();if(!n)continue;live.push([r,n]);for(const t of r.out.keys()){if(!inc.has(t))inc.set(t,[]);inc.get(t).push(n)}}
      const seen=new Set([ctx.destination]);const q=[ctx.destination];while(q.length){const t=q.pop();for(const s of(inc.get(t)||[]))if(!seen.has(s)){seen.add(s);q.push(s)}}
      const now=ctx.currentTime;const g=new Map();let total=0,alive=0;const loose=new Map();
      for(const[r,n]of live){alive++;if(!seen.has(n)){if(/Oscillator|BufferSource|ConstantSource|Worklet/.test(r.kind)&&r.started!==false&&!r.ended||/Worklet/.test(r.kind)){const k=r.kind+(r.unknownParam?' (param?)':'')+' @ '+r.site;loose.set(k,(loose.get(k)||0)+1)}continue}const isSrc=/Oscillator|BufferSource|ConstantSource/.test(r.kind);if(isSrc&&(r.ended||!r.started))continue;total++;const k=r.kind+' @ '+r.site;g.set(k,(g.get(k)||0)+1)}
      return{state:ctx.state,sr:ctx.sampleRate,created:C.nodes.length,aliveJs:alive,pulled:total,groups:[...g].sort((a,b)=>b[1]-a[1]),loose:[...loose].sort((a,b)=>b[1]-a[1])}};
  });
  await p.goto('http://127.0.0.1:'+srv.address().port+'/');await p.waitForTimeout(4000);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(6000);
  console.log(await p.evaluate(()=>{const o=__census.nodes.filter(r=>/Oscill/.test(r.kind));return JSON.stringify({n:o.length,started:o.filter(r=>r.started).length,ended:o.filter(r=>r.ended).length,outs:o.slice(0,5).map(r=>r.out.size+':'+!!r.unknownParam)})}));
  const r=await p.evaluate(()=>__census.report());
  console.log(JSON.stringify({state:r.state,created:r.created,aliveJs:r.aliveJs,pulled:r.pulled}));
  const kinds=new Map();for(const[k,n]of r.groups){const kind=k.split(' @ ')[0];kinds.set(kind,(kinds.get(kind)||0)+n)}
  console.log([...kinds].sort((a,b)=>b[1]-a[1]).map(x=>x.join(' ')).join(' | '));
  for(const[k,n]of r.groups.slice(0,70)){const first=k.split(' @ ')[1].split(' < ')[0];console.log(String(n).padStart(3),k,'\n      ',snip(first))}
  console.log('--- running sources/worklets NOT reaching destination (still cost CPU if started):');for(const[k,n]of r.loose.slice(0,30)){const first=k.split(' @ ')[1].split(' < ')[0];console.log(String(n).padStart(3),k,'\n      ',snip(first))}
  await b.close();process.exit(0)})();
