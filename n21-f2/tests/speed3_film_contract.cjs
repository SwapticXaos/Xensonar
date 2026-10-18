// Exercise the actual two module factories without adding production exports.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const roots=process.argv.slice(2).map(p=>p==='@speed2'?p:path.resolve(p));
if(roots.length!==2)throw Error('Usage: node tests/speed3_film_contract.cjs baseline candidate');
function modules(root){
 if(root==='@speed2')root=path.join(__dirname,'fixtures/speed3_baseline');
 const instantiate=(file,require)=>{const obj=vm.runInNewContext('({'+fs.readFileSync(path.join(root,'src/forge/module_bundle',file),'utf8')+'})',{Float64Array,Float32Array,Map,Math,Number,Error});const exports={};Object.values(obj)[0]({},exports,require);return exports;};
 const spectrum=instantiate('16_complexSpectrum.js',()=>{throw Error('unexpected require')});
 return {spectrum,film:instantiate('18_donorSpectralFilm.js',()=>spectrum)};
}
const mods=roots.map(modules),hash=crypto.createHash('sha256');let frames=0,evidenceCases=0;
const models=[8000,16000,22050,24000,44100,48000,96000,192000].map(sr=>({sampleRate:sr,samples:Float32Array.from({length:48000},(_,i)=>.17*Math.sin(i*.091)+.05*Math.cos(i*.041)),referenceHz:173}));
for(const n of [32,64,128,256,512,1024,2048,4096,8192]){
 const w=mods[1].spectrum.rootHannWindow(n);assert.strictEqual(w,mods[1].spectrum.rootHannWindow(n));
 for(let i=0;i<n;i++)assert.equal(w[i],mods[0].spectrum.rootHann(i,n));
}
for(const model of models)for(const target of [8000,16000,44100,48000])for(const size of [32,256,1024]){
 const run={sourceStart:311.25,sourceEnd:47000.75};
 const geo=mods.map(m=>m.film.spectralFilmGeometry(model,run,target,size));
 assert.deepEqual(JSON.parse(JSON.stringify(geo[1])),JSON.parse(JSON.stringify(geo[0])));
 const scratch=mods.map(()=>({re:new Float64Array(size),im:new Float64Array(size)}));
 for(const center of [geo[0].safeLo,geo[0].safeHi,(geo[0].safeLo+geo[0].safeHi)/2+.123456789]){
  const result=mods.map((m,i)=>m.film.readSpectralFilmInto(model,geo[i],center,scratch[i].re,scratch[i].im));
  for(const k of ['re','im']){const bytes=result.map(r=>Buffer.from(r[k].buffer));assert.deepEqual(bytes[1],bytes[0],JSON.stringify({sr:model.sampleRate,target,size,center,k}));hash.update(bytes[0]);}
  frames++;
 }
 if(size===256){const evidence=mods.map((m,i)=>m.film.measureFilmEvidence(model,geo[i],target));
  const describe=e=>JSON.parse(JSON.stringify(e));assert.deepEqual(describe(evidence[1]),describe(evidence[0]));
  for(const hz of [35,173,600,3200,target*.46])assert.equal(evidence[1].envelope(hz),evidence[0].envelope(hz));evidenceCases++;
 }
 for(const m of mods)assert.throws(()=>m.film.readSpectralFilm(model,geo[0],geo[0].safeLo-1),/Invalid donor-film center/);
}
const report={status:'PASS',spectralFrames:frames,evidenceCases,sourceRates:models.map(m=>m.sampleRate),targetRates:[8000,16000,44100,48000],sizes:[32,256,1024],windowSizes:[32,64,128,256,512,1024,2048,4096,8192],float64Identical:true,sha256:hash.digest('hex'),scope:'Complete complex FFT Float64 arrays, evidence and window boundary rejection'};
fs.writeFileSync(process.env.OUT||path.join(__dirname,'../results/speed3-film.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

module.exports={modules};
