'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'src/nodal',n),'utf8');
const before=process.env.XENSONAR_BASELINE_DIR||path.join(root,'tests/fixtures/f444_baseline');
const modelSource=read('01_instrument_model.js'),starterSource=read('07_sound_designer.js');
const load=kernel=>new Function(modelSource+'\n'+kernel+'\n'+starterSource+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter};')();
const originalKernel=fs.readFileSync(path.join(before,'02_synthesis_kernel.js'),'utf8');
assert.equal(require('node:crypto').createHash('sha256').update(originalKernel).digest('hex'),'e5394d5d845fbdf7069206e09f20de0b77970d16b3538d399264cbc8794cdea4','F443 reference fixture must remain unchanged');
const old=load(originalKernel),now=load(read('02_synthesis_kernel.js'));
let cases=0,samples=0;
for(const engine of [1,2])for(const count of [1,3,7])for(const kind of ['tone','breath','impulse'])for(const sr of [44100,48000,96000]){
 const base=now.starter(['hollow','ember','obsidian'][cases%3]);
 const raw={...base,schemaVersion:engine,kernelVersion:'coupled-modal-v'+engine,nodes:Array.from({length:count},(_,k)=>({...base.nodes[k%3],id:'voice-'+k,ratio:1+k*.137,excitationKind:kind,role:engine===1&&k%3===0?'fold':base.nodes[k%3].role})),excitation:{kind,level:.6},material:{...base.material,natural:.13,width:.8,follow:.23},articulation:{durationSec:.047,attackSec:.003,releaseSec:.031}};
 const i=now.model.normalize(raw),p=now.model.compile(i),q=old.model.compile(old.model.normalize(raw));
 const reused=now.dsp.voice(p,{},sr);
 for(let take=0;take<3;take++){
  const opts={frequency:[71.123,423.987,11000][take],seed:take===1?7321:i.seed,velocity:.43+take*.2,gain:.23+take*.15,durationSec:.047,held:take===2,
    volumeCurve:take===1?[0,.8,.5,1]:undefined,pitchCurve:take===1?[0,.125,-.03125]:undefined,attackSec:.003,releaseSec:.031};
  const expected=old.dsp.voice(q,opts,sr);reused.reset(opts);
  // Exercise reuse after an interrupted voice, pitch slews, manual release and accumulation.
  const n=Math.ceil(sr*.31),l=new Float32Array(n),r=new Float32Array(n),a=new Float32Array(n),b=new Float32Array(n);
  for(let at=0;at<n;at+=73){
   if(at>=sr*.025&&at<sr*.025+73){reused.setFrequency(333.321);expected.setFrequency(333.321);}
   if(take===2&&at>=sr*.07&&at<sr*.07+73){reused.noteOff();expected.noteOff();}
   const count=Math.min(73,n-at);reused.process(l,r,at,count,true);expected.process(a,b,at,count,true);
  }
  assert.deepEqual(l,a,`left: V${engine}/${count}/${kind}/${sr}/${take}`);assert.deepEqual(r,b,'right');
  assert.equal(reused.snapshot().faults,0);assert(reused.ended);cases++;samples+=n*2;
 }
}
fs.mkdirSync(path.join(root,'results'),{recursive:true});
const report={cases,comparedStereoSamples:samples,match:'bit-identical Float32 output to unmodified F443, including resets, glissandi, release and natural tails'};
fs.writeFileSync(path.join(root,'results/f444-kernel-identity.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',report);
