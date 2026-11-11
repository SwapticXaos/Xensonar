'use strict';
// LIVE-GF-01: particle resident worklet render() without per-quantum closures/iterators
// must render bit-identically to the pre-patch source (all 16 outputs, random voices, cuts, routes).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const current=(()=>{const s=fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');const a=s.indexOf('const ore=`')+11,b=s.indexOf('`,ire=`',a);assert(a>11&&b>a);return s.slice(a,b)})();
const before=fs.readFileSync(path.join(root,'tests/fixtures/particle_resident_pre_livegf01.txt'),'utf8');
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function run(literal){
 const src=new Function('return `'+literal+'`')().replace(/export\{[^}]*\};?\s*$/,'');
 const sent=[];const scope={sampleRate:44100,currentFrame:0,console};
 scope.AudioWorkletProcessor=class{constructor(){this.port={onmessage:null,postMessage:m=>sent.push(m.type+':'+(m.id??'')+':'+(m.reason??''))}}};
 scope.registerProcessor=(n,k)=>scope.Processor=k;vm.createContext(scope);vm.runInContext(src,scope);
 const F32=vm.runInContext('Float32Array',scope),F64=vm.runInContext('Float64Array',scope),AB=vm.runInContext('ArrayBuffer',scope);
 const p=new scope.Processor({processorOptions:{session:7}});const r=rng(99);
 const bank=new F32(782718);for(let i=0;i<bank.length;i++)bank[i]=Math.sin(i*.003)*.8+(r()-.5)*.1;
 p.port.onmessage({data:{type:'load',session:7,bank}});
 const outputs=Array.from({length:16},()=>[new F32(128),new F32(128)]);const chunks=[];let id=1,frame=0;
 for(let tick=0;tick<1400;tick++){
  scope.currentFrame=frame;
  if(tick%9===0&&tick<1200){const rec=new F64(new AB(320));const start=frame+128+Math.floor(r()*300),att=40+Math.floor(r()*400),hold=Math.floor(r()*3000),rel=2000+Math.floor(r()*20000),filters=1+Math.floor(r()*3);
   rec[0]=1;rec[1]=id++;rec[2]=1+Math.floor(r()*65534);rec[3]=start;rec[4]=start+att;rec[5]=start+att+hold;rec[6]=start+att+hold+rel;rec[7]=.0005;rec[8]=.2+r()*.6;rec[9]=(rec[8]-rec[7])/att;rec[10]=r()<.5?1:2;rec[11]=.9990+r()*.0009;rec[12]=rec[5]+Math.floor(rel*.7);rec[13]=rec[8];rec[14]=.001+r()*.05;rec[15]=2049*Math.floor(r()*381);rec[16]=filters;rec[17]=filters;rec[18]=frame;
   for(let f=0;f<filters;f++){const k=20+f*5;rec[k]=.2+r()*.1;rec[k+1]=.1*r();rec[k+2]=.05*r();rec[k+3]=-.5*r();rec[k+4]=.2*r()}
   p.port.onmessage({data:{type:'arm',session:7,record:rec.buffer}})}
  if(tick%31===5&&id>3)p.port.onmessage({data:{type:'cut',session:7,id:id-2}});
  assert.equal(p.process([],outputs),true);frame+=128;
  for(const o of outputs)for(const ch of o)chunks.push(Buffer.from(new Uint8Array(ch.buffer.slice(0))));
 }
 return{pcm:Buffer.concat(chunks),sent,src};
}
const a=run(before),b=run(current);
assert(a.pcm.some(x=>x!==0),'scenario must render voices');
assert(a.sent.filter(x=>x.startsWith('ended')).length>50&&a.sent.some(x=>x.includes('key-up-cut')),'voices must end and be cut');
assert(a.pcm.equals(b.pcm),'particle resident PCM must be bit-identical');
assert.deepEqual(b.sent,a.sent,'processor messages must be identical');
const t=Buffer.from(b.pcm);t[t.length>>1]^=1;assert(!a.pcm.equals(t));
const render=b.src.slice(b.src.indexOf('render(s,n){'),b.src.indexOf('var F=class'));
assert(!/\.some\(|=>/.test(render),'render() must not create closures per quantum');
assert(!/for\(let \w+ of /.test(render.slice(0,render.indexOf('this.fault="nonfinite-render"'))),'render() hot path must use indexed loops');
console.log('PASS LIVE-GF-01 particle resident render bit-identical',{bytes:b.pcm.length,messages:b.sent.length});
