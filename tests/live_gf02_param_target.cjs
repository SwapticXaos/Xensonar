'use strict';
// LIVE-GF-02: __xenParamTarget must be audibly equivalent to calling setTargetAtTime every frame,
// while issuing no AudioParam events once nothing changes. Model: exact exponential SetTarget timeline.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/rhythm/03_live_drum_bodies.js'),'utf8');
const a=src.indexOf('function __xenParamTarget('),b=src.indexOf('function __xenEchoSyncFeedback(');assert(a>0&&b>a);
const box={document:{timeline:{currentTime:0}},Float64Array};vm.createContext(box);vm.runInContext(src.slice(a,b)+';globalThis.pt=__xenParamTarget;',box);
const clock={t:0};
class Param{constructor(v){this.v0=v;this.t0=0;this.T=v;this.tc=1;this.calls=0}
 at(t){return this.T+(this.v0-this.T)*Math.exp(-(t-this.t0)/this.tc)}
 get value(){return Math.fround(this.at(clock.t))}
 setTargetAtTime(T,t,tc){this.v0=this.at(t);this.t0=t;this.T=T;this.tc=tc;this.calls++}
 setValueAtTime(v,t){this.v0=v;this.T=v;this.t0=t}}
// script: per frame a list of writer calls [writerId,target,tc]; external(frame) may touch the param directly
function run(script,frames,useHelper,external,advance){
 clock.t=0;box.document.timeline.currentTime=0;const p=new Param(0.5),trace=[];
 for(let f=0;f<frames;f++){clock.t=f/60;box.document.timeline.currentTime=f*16.6667;
  if(external)external(f,p,clock.t);
  let sub=0;for(const call of script(f)){const now=clock.t+(advance?(sub++)*0.0029:0); // Chromium: currentTime may advance inside one frame
   if(useHelper)box.pt(p,call[1],now,call[2]);else p.setTargetAtTime(call[1],now,call[2])}
  trace.push(p.at(clock.t+1/120),p.T)}
 return{trace,calls:p.calls,p}}
function same(name,script,frames,external,maxCallsRatio){
 const d=run(script,frames,false,external),h=run(script,frames,true,external);
 for(let i=0;i<d.trace.length;i+=2){const x=d.trace[i],y=h.trace[i];
  assert(Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(x)),name+': value differs at frame '+(i/2)+' '+x+' vs '+y);
  assert(Object.is(d.trace[i+1],h.trace[i+1])||Math.abs(d.trace[i+1]-h.trace[i+1])<1e-12,name+': effective target differs at frame '+(i/2))}
 assert(h.calls<=d.calls,name+': helper must never add calls');
 if(maxCallsRatio!==undefined)assert(h.calls<=d.calls*maxCallsRatio,name+': expected fewer events, got '+h.calls+'/'+d.calls);
 // Same script with a context clock that advances between the calls of one frame: the plain calls then
 // ripple by a few 1e-4; the helper may only skip while that stays inside its documented tolerance.
 const da=run(script,frames,false,external,true),ha=run(script,frames,true,external,true);
 for(let i=0;i<da.trace.length;i+=2){const x=da.trace[i],y=ha.trace[i];assert(Math.abs(x-y)<=3.2e-3*Math.abs(x)+4e-5,name+' (advancing clock): frame '+(i/2)+' '+x+' vs '+y)}
 assert(ha.calls<=da.calls,name+' (advancing clock): helper must never add calls');
 return{direct:d.calls,helper:h.calls,advancing:ha.calls}}
const out={};
out.constant=same('constant single writer',()=>[[1,440,.15]],900,null,.25);
out.moving=same('moving target (vibrato) keeps every write',f=>[[1,440*Math.pow(2,Math.sin(f*.3)*.01),.15]],600,null,1);
assert.equal(out.moving.helper,out.moving.direct,'changing targets are never dropped');
out.step=same('target steps, then rests',f=>[[1,f<200?.2:f<400?.9:0,.05]],900,null,.3);
out.twoAB=same('two writers, second wins',f=>[[1,.0108,.05],[2,0,.02]],900,null,.3);
out.twoBA=same('two writers, other order',f=>[[2,0,.02],[1,.0108,.05]],900,null,.3);
out.firstChanges=same('first writer changes, last must stay effective',f=>[[1,f<300?.3:.6,.05],[2,.1,.02]],900,null,.3);
out.lastChanges=same('last writer changes',f=>[[1,.3,.05],[2,f<300?.1:.7,.02]],900,null,.3);
out.mixed=same('first rests, last moves every frame',f=>[[1,463,.03],[2,463*(1+Math.sin(f*.2)*.001),.15]],600,null,.55);
out.reorder=same('writers swap order mid-way',f=>f<300?[[1,.3,.05],[2,.1,.02]]:[[2,.1,.02],[1,.3,.05]],900,null,.35);
// A writer that stops: the remaining writer takes over (allowed hand-over lag: one frame).
{const script=f=>f<300?[[1,.3,.05],[2,.1,.02]]:[[1,.3,.05]];const d=run(script,900,false),h=run(script,900,true);
 for(let i=0;i<d.trace.length;i+=2){const lag=i/2>=300&&i/2<302;const tol=lag?5e-2:1e-3*Math.exp(-(i/2-302)/60*.2)+1e-9;
  if(i/2<300||i/2>=302)assert(Math.abs(d.trace[i]-h.trace[i])<=Math.max(tol,i/2<300?1e-9:.08*Math.exp(-(i/2-300)/3)+1e-6),'takeover: frame '+(i/2)+' '+d.trace[i]+' vs '+h.trace[i])}
 assert.equal(h.p.T,.3,'remaining writer becomes effective');out.takeover={direct:d.calls,helper:h.calls}}
// Another (non-helper) writer moves the value: the helper re-asserts its target like the plain per-frame call.
{const ext=(f,p,t)=>{if(f===400)p.setValueAtTime(.9,t)};const script=()=>[[1,.2,.05]];const d=run(script,900,false,ext),h=run(script,900,true,ext);
 for(let i=0;i<d.trace.length;i+=2)assert(Math.abs(d.trace[i]-h.trace[i])<=1e-9,'external writer: frame '+(i/2));
 assert(h.calls<d.calls*.3);out.external={direct:d.calls,helper:h.calls}}
// More than four calls per frame and NaN always fall back to the plain call.
out.many=same('six calls per frame',f=>[1,2,3,4,5,6].map(w=>[w,.1*w,.05]),300,null,1);
assert(out.many.helper>=out.many.direct/3,'calls beyond the fourth always write');
{clock.t=0;const p=new Param(1);for(let f=0;f<50;f++){box.document.timeline.currentTime=f*16;box.pt(p,NaN,f/60,.1)}assert.equal(p.calls,50,'NaN target is passed through')}
box.pt(null,1,0,.1);box.pt(undefined,1,0,.1);
// Without a frame clock the helper keys on the context time (same guarantees, fewer savings).
{const box2={Float64Array};vm.createContext(box2);vm.runInContext(src.slice(a,b)+';globalThis.pt=__xenParamTarget;',box2);clock.t=0;const p=new Param(.5);for(let f=0;f<600;f++){clock.t=f/60;box2.pt(p,.25,clock.t,.05)}assert(p.calls<150&&Math.abs(p.at(10)-.25)<1e-9)}
console.log('PASS LIVE-GF-02 param target dedupe equivalent',JSON.stringify(out));
