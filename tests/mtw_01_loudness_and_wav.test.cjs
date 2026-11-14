// MTW-01: the shared measuring core of the Wave Editor and the Multitrack mixdown (__XenWaveCoreW01.loudness) against
// the published reference cases (ITU-R BS.1770-4 coefficients, EBU Tech 3341 / 3342 test signals), and the 24-bit WAV encoder.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/post-oct/015-xen-wave-editor-w01-modules.js'),'utf8');
const sandbox={console,Float32Array,Float64Array,Int32Array,Uint8Array,Uint32Array,ArrayBuffer,DataView,Math,Number,Object,Array,JSON,Map,Set,WeakMap,Promise,Error,RangeError,TypeError,Date,setTimeout,clearTimeout};
sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'015-xen-wave-editor-w01-modules.js'});
const core=sandbox.__XenWaveCoreW01;
const sine=(fs,sec,hz,db,phase=0)=>{const n=Math.round(fs*sec),a=Math.pow(10,db/20),x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=a*Math.sin(2*Math.PI*hz*i/fs+phase);return x};
const concat=parts=>{const n=parts.reduce((s,p)=>s+p.length,0),o=new Float32Array(n);let at=0;for(const p of parts){o.set(p,at);at+=p.length}return o};
const near=(got,want,tol,msg)=>assert(Math.abs(got-want)<=tol,msg+': got '+got+', expected '+want+' ± '+tol);

test('K-weighting coefficients at 48 kHz are the ones printed in ITU-R BS.1770-4',()=>{
  const k=core.kWeighting(48000);
  const shelf=[1.53512485958697,-2.69169618940638,1.19839281085285,-1.69065929318241,0.73248077421585];
  const high=[1,-2,1,-1.99004745483398,0.99007225036621];
  shelf.forEach((v,i)=>near(k.shelf[i],v,1e-8,'shelf['+i+']'));high.forEach((v,i)=>near(k.high[i],v,1e-8,'high['+i+']'));
});

test('EBU Tech 3341 case 1/2: stereo 1 kHz sine at -23 / -33 dBFS reads -23.0 / -33.0 LUFS (48 and 44.1 kHz)',()=>{
  for(const fs of [48000,44100])for(const db of [-23,-33]){const s=sine(fs,20,1000,db);near(core.loudness([s,s],fs).integrated,db,.1,'integrated at '+fs+' Hz, '+db+' dBFS')}
});

test('a mono 997 Hz full-scale sine reads -3.01 LUFS (BS.1770 reference level)',()=>{
  near(core.loudness([sine(48000,10,997,0)],48000).integrated,-3.01,.05,'mono full scale');
});

test('EBU Tech 3341 case 3: -36 / -23 / -36 dBFS: the relative gate keeps the result at -23.0 LUFS',()=>{
  const fs=48000,s=concat([sine(fs,10,1000,-36),sine(fs,60,1000,-23),sine(fs,10,1000,-36)]),r=core.loudness([s,s],fs);
  near(r.integrated,-23,.1,'gated integrated loudness');assert.strictEqual(r.gated,true);
  // without the gate the quiet parts would pull the number down by more than half a LU
  const ungated=10*Math.log10((10*Math.pow(10,-3.6)+60*Math.pow(10,-2.3)+10*Math.pow(10,-3.6))/80);assert(ungated<-23.5);
});

test('EBU Tech 3341 case 5: -26 / -20 / -26 dBFS reads -23.0 LUFS',()=>{
  const fs=48000,s=concat([sine(fs,20,1000,-26),sine(fs,20.1,1000,-20),sine(fs,20,1000,-26)]);
  near(core.loudness([s,s],fs).integrated,-23,.1,'integrated');
});

test('EBU Tech 3342 case 1: 20 s at -20 dBFS then 20 s at -30 dBFS has a loudness range of 10 LU',()=>{
  const fs=48000,s=concat([sine(fs,20,1000,-20),sine(fs,20,1000,-30)]);
  near(core.loudness([s,s],fs).range,10,1,'LRA');
});

test('true peak finds the peak between the samples (fs/4 sine sampled at 45 degrees: samples -3.01 dB, true peak 0 dB)',()=>{
  const fs=48000,s=sine(fs,1,fs/4,0,Math.PI/4),r=core.loudness([s],fs);
  near(r.samplePeakDb,-3.01,.02,'sample peak');near(r.truePeakDb,0,.35,'true peak');
  const slow=sine(fs,1,440,-6),q=core.loudness([slow],fs);near(q.truePeakDb,-6,.05,'a low tone has no inter-sample overshoot');assert(q.truePeak>=q.samplePeak);
});

test('silence, very short audio and a range are handled; correlation is +1 / -1 / null',()=>{
  const fs=48000,z=new Float32Array(fs);let r=core.loudness([z,z],fs);assert.strictEqual(r.integrated,-Infinity);assert.strictEqual(r.truePeakDb,-Infinity);
  r=core.loudness([sine(fs,.1,1000,-12)],fs);assert(Number.isFinite(r.integrated),'shorter than one block: ungated value');assert.strictEqual(r.gated,false);
  const a=sine(fs,2,1000,-12),b=a.map(v=>-v);assert(Math.abs(core.loudness([a,a],fs).correlation-1)<1e-6);assert(Math.abs(core.loudness([a,b],fs).correlation+1)<1e-6);assert.strictEqual(core.loudness([a],fs).correlation,null);
  const two=concat([new Float32Array(fs*2),sine(fs,4,1000,-23)]);near(core.loudness([two,two],fs,{start:fs*2,end:fs*6}).integrated,-23,.1,'range only');
});

test('encodeWav writes 24-bit PCM (three bytes, word aligned) and keeps 16-bit and float output as before',()=>{
  const doc=core.create({channels:[new Float32Array([0,.5,-.5,1,-1])],sampleRate:48000});
  const b=core.encodeWav(doc,{format:'pcm24'}),v=new DataView(b);
  assert.strictEqual(v.getUint16(20,true),1,'PCM');assert.strictEqual(v.getUint16(34,true),24,'bits');assert.strictEqual(v.getUint16(32,true),3,'block align');assert.strictEqual(v.getUint32(40,true),15,'data bytes');
  assert.strictEqual(b.byteLength,44+15+1,'odd data is padded to a word');assert.strictEqual(v.getUint32(4,true),b.byteLength-8);
  const s=i=>{const o=44+i*3,u=v.getUint8(o)|(v.getUint8(o+1)<<8)|(v.getUint8(o+2)<<16);return u&0x800000?u-0x1000000:u};
  assert.deepStrictEqual([0,1,2,3,4].map(s),[0,4194304,-4194304,8388607,-8388608]);
  const d=core.encodeWav(doc,{format:'pcm24',dither:true}),w=new DataView(d);const sd=i=>{const o=44+i*3,u=w.getUint8(o)|(w.getUint8(o+1)<<8)|(w.getUint8(o+2)<<16);return u&0x800000?u-0x1000000:u};
  assert(Math.abs(sd(1)-4194304)<=2,'dither stays within two 24-bit steps');
  const p16=new DataView(core.encodeWav(doc,{format:'pcm16'}));assert.strictEqual(p16.getUint16(34,true),16);assert.strictEqual(p16.getInt16(44+2,true),16384);assert.strictEqual(p16.byteLength,44+10);
  const f=new DataView(core.encodeWav(doc,{format:'float32'}));assert.strictEqual(f.getUint16(20,true),3);assert.strictEqual(f.getFloat32(56+4,true),.5);
  assert.throws(()=>core.encodeWav(doc,{format:'pcm8'}));
});
