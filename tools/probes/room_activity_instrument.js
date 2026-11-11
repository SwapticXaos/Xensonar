(()=>{
 const S=window.__probe={t:0,i:0,raf:0,mc:0,starts:0,wk:0,osc:0,active:new Map(),ctxs:[],taps:[],src:new Map()};
 const st=window.setTimeout,si=window.setInterval,ci=window.clearInterval,ra=window.requestAnimationFrame;
 const where=()=>{const s=(new Error().stack||'').split('\n')[3]||'';return s.replace(/.*index\.html:/,'L').replace(/\)$/,'').trim().slice(0,40)};
 window.setTimeout=function(f,d,...a){S.t++;return st.call(this,f,d,...a)};
 window.setInterval=function(f,d,...a){S.i++;const id=si.call(this,f,d,...a);S.active.set(id,{d,w:where()});return id};
 window.clearInterval=function(id){S.active.delete(id);return ci.call(this,id)};
 window.requestAnimationFrame=function(f){S.raf++;const w=where();S.src.set(w,(S.src.get(w)||0)+1);return ra.call(this,f)};
 const AC=window.AudioContext;
 window.AudioContext=window.webkitAudioContext=class extends AC{constructor(...a){super(...a);S.ctxs.push(this);
   const an=AC.prototype.createAnalyser.call(this);an.fftSize=2048;S.taps.push({ctx:this,an});}};
 const conn=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(t,...a){const r=conn.call(this,t,...a);
   if(t instanceof AudioDestinationNode){const tap=S.taps.find(x=>x.ctx===this.context);if(tap)try{conn.call(this,tap.an)}catch{}}
   return r};
 const start=AudioScheduledSourceNode.prototype.start;
 AudioScheduledSourceNode.prototype.start=function(...a){S.starts++;if(this instanceof OscillatorNode)S.osc++;return start.apply(this,a)};
 const AW=window.AudioWorkletNode;
 if(AW)window.AudioWorkletNode=class extends AW{constructor(...a){super(...a);S.wk++;}};
 S.reset=()=>{S.t=0;S.i=0;S.raf=0;S.starts=0;S.osc=0;S.wk=0;S.src=new Map()};
 S.rms=()=>S.taps.map((x,k)=>{const b=new Float32Array(x.an.fftSize);x.an.getFloatTimeDomainData(b);let s=0;for(const v of b)s+=v*v;return {k,state:x.ctx.state,sr:x.ctx.sampleRate,rms:+Math.sqrt(s/b.length).toFixed(5)}});
 S.read=()=>({timeouts:S.t,intervalsCreated:S.i,intervalsActive:S.active.size,raf:S.raf,sourceStarts:S.starts,oscStarts:S.osc,workletNodes:S.wk,ctx:S.rms(),rafTop:[...S.src].sort((a,b)=>b[1]-a[1]).slice(0,4)});
})();
