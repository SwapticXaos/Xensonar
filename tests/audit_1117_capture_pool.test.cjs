// AUDIT-1117: the Multitrack input capture worklet (xen-mt-capture) copies each render quantum into a 4096-frame chunk
// instead of allocating three typed arrays per block. PCM comparison before/after: the OLD worklet text (kept here verbatim
// as the reference) and the NEW one from the sources get the same input blocks; the assembled takes must be bit-identical,
// and the chunk start frames must match. Also: the stem recorder keeps a start frame beyond 2^31 (no 32-bit cut).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const mt=fs.readFileSync(path.join(root,'src/post-oct/032-xen-room-multitrack.js'),'utf8');
const stems=fs.readFileSync(path.join(root,'src/post-oct/036-xen-stem-recorder.js'),'utf8');
const OLD="class C extends AudioWorkletProcessor{constructor(){super();this.b=[[],[]];this.n=0;this.s=-1;this.run=true;\n this.port.onmessage=e=>{if(e.data==='stop'){this.flush();this.run=false;this.port.postMessage({kind:'done'})}}}\n flush(){if(!this.n)return;const a=new Float32Array(this.n),b=new Float32Array(this.n);let o=0;for(let i=0;i<this.b[0].length;i++){a.set(this.b[0][i],o);b.set(this.b[1][i],o);o+=this.b[0][i].length}this.port.postMessage({kind:'chunk',frame:this.s,l:a,r:b},[a.buffer,b.buffer]);this.b=[[],[]];this.n=0;this.s=-1}\n process(inputs){if(!this.run)return false;const i=inputs[0];if(this.s<0)this.s=currentFrame;const l=i&&i[0]?i[0]:new Float32Array(128),r=i&&i[1]?i[1]:l;this.b[0].push(new Float32Array(l));this.b[1].push(new Float32Array(r));this.n+=l.length;if(this.n>=4096)this.flush();return true}}\nregisterProcessor('xen-mt-capture',C);";
function newSource(){const a=mt.indexOf('const MT_CAPTURE_WORKLET=`'),b=mt.indexOf('`;',a);assert(a>0&&b>a);return mt.slice(a+'const MT_CAPTURE_WORKLET=`'.length,b)}
// minimal AudioWorkletGlobalScope: a port that records messages, currentFrame driven by the test, real structured transfer
function load(src){
  const scope={frame:0,cls:null};
  const port=()=>{const p={sent:[],onmessage:null,postMessage(m,tr){if(tr)m=structuredClone(m,{transfer:tr});p.sent.push(m)}};return p};
  class AudioWorkletProcessor{constructor(){this.port=port()}}
  const run=new Function('AudioWorkletProcessor','registerProcessor','scope',src.replace(/\bcurrentFrame\b/g,'scope.frame'));
  run(AudioWorkletProcessor,(n,c)=>{scope.cls=c},scope);
  return {scope,node:new scope.cls()};
}
// the same assembly as recorder.finish()
function assemble(chunks){const cs=chunks.slice().sort((a,b)=>a.frame-b.frame);const first=cs[0].frame,last=cs[cs.length-1],total=last.frame+last.l.length-first,L=new Float32Array(total),R=new Float32Array(total);
  for(const c of cs){const o=c.frame-first;if(o<0||o+c.l.length>total)continue;L.set(c.l,o);R.set(c.r,o)}return {first,L,R}}
function drive(src,blocks){const {scope,node}=load(src);scope.frame=777;
  for(const ins of blocks){assert.strictEqual(node.process(ins),true);scope.frame+=128}
  node.port.onmessage({data:'stop'});assert.strictEqual(node.process([[]]),false,'stopped worklet ends itself');
  const chunks=node.port.sent.filter(m=>m.kind==='chunk');assert(node.port.sent.some(m=>m.kind==='done'));return chunks}
function blocks(count){let seed=12345;const rnd=()=>((seed=(seed*1103515245+12345)>>>0)/2**32)*2-1;const out=[];
  for(let k=0;k<count;k++){const L=new Float32Array(128).map(rnd),R=new Float32Array(128).map(rnd);
    out.push(k%37===5?[[]]:k%29===3?[[L]]:k%53===7?[]:[[L,R]])}// silent input, mono input, no input at all
  return out}

test('xen-mt-capture: new chunked capture is bit-identical to the old one (stereo, mono, missing input, partial last chunk)',()=>{
  const B=blocks(32*9+17);
  const a=drive(OLD,B),b=drive(newSource(),B);
  assert.deepStrictEqual(b.map(c=>[c.frame,c.l.length]),a.map(c=>[c.frame,c.l.length]),'same chunk frames and lengths');
  const A=assemble(a),N=assemble(b);
  assert.strictEqual(N.first,A.first);assert.strictEqual(N.L.length,A.L.length);
  assert.ok(Buffer.from(N.L.buffer).equals(Buffer.from(A.L.buffer)),'left channel bit-identical');
  assert.ok(Buffer.from(N.R.buffer).equals(Buffer.from(A.R.buffer)),'right channel bit-identical');
  assert.strictEqual(A.L.length,(32*9+17)*128);
});

test('xen-mt-capture: process() allocates no typed array per block (one chunk pair per 4096 frames)',()=>{
  const src=newSource(),proc=src.slice(src.indexOf('process(inputs)'),src.indexOf('registerProcessor'));
  assert.ok(!/new Float32Array/.test(proc.replace(/this\.flush\(\)/g,'')),'no allocation in process() itself');
});

test('stem recorder: a start frame beyond 2^31 is kept (no 32-bit cut)',()=>{
  assert.ok(!/startFrame\|0/.test(stems),'startFrame|0 is gone');
  assert.ok(/Math\.floor\(m\.startFrame\)/.test(stems));
});
