(()=>{
const W=window,site=()=>{const s=new Error().stack.split('\n');for(let i=2;i<s.length;i++){const m=s[i].match(/index\.html:(\d+):(\d+)/);if(m&&!s[i].includes('probe'))return m[1]+':'+m[2]}return '?'};
const A=W.__audit={t0:performance.now(),ctx:[],intervals:new Map(),timeouts:new Map(),raf:new Map(),listeners:new Map(),mo:[],ls:new Map(),post:new Map(),nodes:new Map(),wnodes:[],modules:[],ws:[],buffers:0};
const bump=(m,k,n=1)=>m.set(k,(m.get(k)||0)+n);
for(const name of ['AudioContext','webkitAudioContext','OfflineAudioContext']){const O=W[name];if(!O)continue;
 const C=class extends O{constructor(...a){super(...a);const rec={kind:name,site:site(),born:performance.now(),closed:null,sr:this.sampleRate};rec.ref=new WeakRef(this);A.ctx.push(rec);this.__rec=rec;
  if(name!=='OfflineAudioContext'){const c=this.close.bind(this);this.close=(...x)=>{rec.closed=performance.now();return c(...x)}}}};
 W[name]=C;}
const BAC=W.BaseAudioContext.prototype;
for(const k of Object.getOwnPropertyNames(BAC))if(k.startsWith('create')&&typeof BAC[k]==='function'){const o=BAC[k];BAC[k]=function(...a){if(!(this instanceof OfflineAudioContext))bump(A.nodes,k);if(k==='createBuffer')A.buffers+=(a[0]||1)*(a[1]||0)*4;return o.apply(this,a)}}
const AWN=W.AudioWorkletNode;if(AWN){W.AudioWorkletNode=class extends AWN{constructor(c,n,o){super(c,n,o);A.wnodes.push({name:n,site:site(),offline:c instanceof OfflineAudioContext,at:performance.now()})}}}
const AW=W.AudioWorklet&&W.AudioWorklet.prototype;if(AW){const o=AW.addModule;AW.addModule=function(u,...r){A.modules.push({site:site(),len:String(u).length});return o.call(this,u,...r)}}
const MP=MessagePort.prototype.postMessage;MessagePort.prototype.postMessage=function(...a){bump(A.post,site());return MP.apply(this,a)};
const si=W.setInterval,ci=W.clearInterval;W.setInterval=function(f,d,...r){const id=si.call(W,f,d,...r);A.intervals.set(id,{site:site(),d});return id};W.clearInterval=function(id){A.intervals.delete(id);return ci.call(W,id)};
const st=W.setTimeout;W.setTimeout=function(f,d,...r){bump(A.timeouts,site());return st.call(W,f,d,...r)};
const ra=W.requestAnimationFrame;W.requestAnimationFrame=function(f){bump(A.raf,site());return ra.call(W,f)};
const ael=EventTarget.prototype.addEventListener,rel=EventTarget.prototype.removeEventListener;
EventTarget.prototype.addEventListener=function(t,f,o){if(this===W||this===document)bump(A.listeners,(this===W?'window:':'document:')+t);return ael.call(this,t,f,o)};
EventTarget.prototype.removeEventListener=function(t,f,o){if(this===W||this===document)bump(A.listeners,(this===W?'window:':'document:')+t,-1);return rel.call(this,t,f,o)};
const MO=W.MutationObserver;W.MutationObserver=class extends MO{constructor(cb){super(cb);const r={site:site(),obs:0,on:true};A.mo.push(r);this.__r=r}observe(...a){this.__r.obs++;this.__r.on=true;return super.observe(...a)}disconnect(){this.__r.on=false;return super.disconnect()}};
const sI=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){bump(A.ls,site()+' '+String(k).slice(0,40),String(v).length);return sI.call(this,k,v)};
const WS=W.WebSocket;W.WebSocket=class extends WS{constructor(u,...r){super(u,...r);A.ws.push({u,site:site()})}};
A.snapshot=()=>({t:performance.now(),timeouts:new Map(A.timeouts),raf:new Map(A.raf),post:new Map(A.post),nodes:new Map(A.nodes),ls:new Map(A.ls)});
})();
