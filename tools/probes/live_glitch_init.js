// TEST ONLY. Injected with addInitScript by live_glitch_probe.js; never part of index.html.
// 1) Seeded Math.random (comparable runs). 2) Master tap: every connect() into a realtime
// AudioDestinationNode is mirrored into a capture worklet. 3) Counters: AudioParam calls,
// node creation, worklet messages, long tasks, frame gaps.
(()=>{
  let seed=0x2f6e2b1;Math.random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const G=window.__glitch={chunks:[],sampleRate:0,ctx:null,params:new Map(),nodes:new Map(),post:0,postBytes:0,longTasks:[],frames:[],marks:[],startedAt:0,paramSites:new Map(),siteOn:false};
  G.mark=l=>{G.marks.push({l,t:G.ctx?G.ctx.currentTime:0,frame:G.frame||0})};
  const tapSrc=`class T extends AudioWorkletProcessor{constructor(){super();this.n=0;this.b=new Float32Array(2*128*64);this.f=0}
   process(i){const a=i[0];const L=a&&a[0],R=a&&(a[1]||a[0]);const o=this.n*256;if(L){for(let k=0;k<128;k++){this.b[o+2*k]=L[k];this.b[o+2*k+1]=R[k]}}else this.b.fill(0,o,o+256);
   if(++this.n===64){const out=this.b;this.b=new Float32Array(2*128*64);this.n=0;this.port.postMessage({f:this.f,ct:currentTime,b:out},[out.buffer])}this.f+=128;return true}}
   registerProcessor('xen-probe-tap',T)`;
  const taps=new WeakMap();
  function tapFor(ctx){
    let t=taps.get(ctx);if(t)return t;
    t={ready:false,pending:[],node:null};taps.set(ctx,t);G.ctx=ctx;G.sampleRate=ctx.sampleRate;
    const url=location.protocol==='file:'?'data:application/javascript;charset=utf-8,'+encodeURIComponent(tapSrc):URL.createObjectURL(new Blob([tapSrc],{type:'text/javascript'}));
    origAdd.call(ctx.audioWorklet,url).then(()=>{
      const n=new AudioWorkletNode(ctx,'xen-probe-tap',{numberOfInputs:1,numberOfOutputs:0,channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers'});
      n.port.onmessage=e=>{G.frame=e.data.f;if(G.recording)G.chunks.push(e.data)};
      t.node=n;t.ready=true;for(const s of t.pending){try{origConnect.call(s.node,n,s.out||0,0)}catch(e){}}t.pending.length=0;
    });
    return t;
  }
  const origAdd=AudioWorklet.prototype.addModule;
  const origConnect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dest,out,inp){
    const r=origConnect.apply(this,arguments);
    try{if(dest instanceof AudioDestinationNode&&dest.context instanceof AudioContext){const t=tapFor(dest.context);if(t.ready)origConnect.call(this,t.node,out||0,0);else t.pending.push({node:this,out})}}catch(e){}
    return r;
  };
  const site=()=>{const s=(new Error().stack||'').split('\n');for(let i=3;i<s.length;i++){const m=/:(\d+):(\d+)\)?$/.exec(s[i]);if(m)return m[1]+':'+m[2]}return'?'};
  for(const m of['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','setTargetAtTime','setValueCurveAtTime','cancelScheduledValues','cancelAndHoldAtTime']){
    const o=AudioParam.prototype[m];AudioParam.prototype[m]=function(){G.params.set(m,(G.params.get(m)||0)+1);if(G.siteOn){const k=m+'@'+site();G.paramSites.set(k,(G.paramSites.get(k)||0)+1)}return o.apply(this,arguments)};
  }
  const vd=Object.getOwnPropertyDescriptor(AudioParam.prototype,'value');
  Object.defineProperty(AudioParam.prototype,'value',{get:vd.get,set(v){G.params.set('value=',(G.params.get('value=')||0)+1);if(G.siteOn){const k='value=@'+site();G.paramSites.set(k,(G.paramSites.get(k)||0)+1)}vd.set.call(this,v)},configurable:true});
  for(const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)){if(!/^create/.test(k))continue;const o=BaseAudioContext.prototype[k];if(typeof o!=='function')continue;
    BaseAudioContext.prototype[k]=function(){if(this instanceof AudioContext){G.nodes.set(k,(G.nodes.get(k)||0)+1);if(G.siteOn){const s=k+'@'+site();G.paramSites.set(s,(G.paramSites.get(s)||0)+1)}}return o.apply(this,arguments)}}
  const pm=MessagePort.prototype.postMessage;MessagePort.prototype.postMessage=function(d){G.post++;return pm.apply(this,arguments)};
  try{new PerformanceObserver(l=>{for(const e of l.getEntries())G.longTasks.push({t:e.startTime,d:e.duration})}).observe({entryTypes:['longtask']})}catch(e){}
  let last=0;const fr=t=>{if(last&&G.recording)G.frames.push(t-last);last=t;requestAnimationFrame(fr)};requestAnimationFrame(fr);
  G.snapshot=()=>({params:[...G.params],nodes:[...G.nodes],post:G.post,sites:[...G.paramSites]});
  G.take=()=>{const c=G.chunks;G.chunks=[];let n=0;for(const x of c)n+=x.b.length;const all=new Float32Array(n);let o=0;const gaps=[];let pf=null;for(const x of c){if(pf!==null&&x.f!==pf+128*64)gaps.push([pf,x.f]);pf=x.f;all.set(x.b,o);o+=x.b.length}
    const u8=new Uint8Array(all.buffer);let s='';const CH=0x8000;for(let i=0;i<u8.length;i+=CH)s+=String.fromCharCode.apply(null,u8.subarray(i,i+CH));return{b64:btoa(s),gaps,first:c[0]?c[0].f:0,sr:G.sampleRate}};
})();
