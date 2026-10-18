const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {load}=require('./offline_runtime.cjs'),{setup,pcmBytes}=require('./forge_speed2.cjs');
async function main(){
 const base=process.argv[2]||'@speed1',next=path.resolve(process.argv[3]||'.');
 const runtimes=[base==='@speed1'?load(next,{speed1:true}):load(path.resolve(base)),load(next)];
 for(const r of runtimes){r.run(setup);r.run(`__speedSR=8000;__speedDuration=.28;`);}
 const cases=[];
 const compare=async(name,script)=>{
  const outputs=[];
  for(const r of runtimes){r.run('__speedSeed()');outputs.push(await r.run(script));}
  assert.deepEqual(pcmBytes(outputs[1].buffer??outputs[1].pcm??outputs[1].values??outputs[1]),pcmBytes(outputs[0].buffer??outputs[0].pcm??outputs[0].values??outputs[0]),name+' complete PCM');
  const meta=v=>JSON.parse(JSON.stringify(v,(k,v)=>k==='buffer'||k==='pcm'?undefined:v));
  if(outputs[0].buffer||outputs[0].pcm)assert.deepEqual(meta(outputs[1]),meta(outputs[0]),name+' metadata');
  cases.push(name);
 };
 for(const mode of ['additive','granular','glyph','ifft'])for(const mix of ['{sine:1,sawtooth:0,square:0,triangle:0}','{sine:.1,sawtooth:.3,square:.4,triangle:.2}','{sine:0,sawtooth:0,square:0,triangle:0}']){
  // Small IFFT fixture still includes nonempty columns and multiple frequency bins.
  await compare('Pure '+mode+' '+mix,`__speedRaw.renderToBuffer(__speedGrid,${JSON.stringify(mode)},${mix},()=>{},{durationSec:__speedDuration})`);
 }
 const profiles=runtimes[0].run('[...tDe.keys()]');
 for(const profileId of profiles)await compare('HX '+profileId,`BR({...__speedArgs(),harmonicXplore:{...wR(),profileId:${JSON.stringify(profileId)}},cooperative:true,onProgress:()=>{}})`);
 for(const variant of ['painted','silence','dense','exact-carrier']){
  for(const r of runtimes)r.run(`__speedGrid=new ph(48,72);for(let x=0;x<48;x++)for(let y=0;y<72;y++){const v=${variant==='silence'?'0':variant==='dense'?'.18+.24*Math.sin(x*.19+y*.43)**2':'x>5&&x<42?.65*Math.exp(-(((y-(32+9*Math.sin(x*.12)))/1.4)**2)):0'};__speedGrid.set(x,y,v);__speedGrid.setGrain(x,y,.8*Math.sin(x*.017+y*.04)**2);} ${variant==='exact-carrier'?`__f333MaterializeCarrier({version:'melodic-carrier-v1',durationBeats:4,notes:[{id:'g1',startBeat:.1,durationBeats:1.3,pitchHz:[123.2,198.6,131.4],gainCurve:[0,.9,.4,0],fadeInBeats:.02,fadeOutBeats:.03},{id:'g2',startBeat:.8,durationBeats:2.2,pitchHz:[401.3,319.6],gainCurve:[.7,.4]}]},__speedGrid);`:''}`);
  for(const timbre of ['fm','acid','vocal'])for(const limits of [false,true]){
   const settings=limits?`{${timbre}:{maxVoices:3,attackMs:2,releaseMs:300,glideMs:180,outputGain:1.5,vowel:3.8,formantShift:-10,breath:1,presence:1,vibratoCents:120,vibratoHz:8,humanize:1,fmDepth:4,acidColor:2}}`:'undefined';
   await compare(`${variant} ${timbre} ${limits?'limits':'default'}`,`tK({spectralData:__speedGrid,sampleRate:__speedSR,durationSec:__speedDuration,baseHz:82.41,gain:.52,timbre:${JSON.stringify(timbre)},readerSettings:${settings}})`);
  }
  await compare('Spectral '+variant,`DB({...__speedArgs(),cooperative:true,onProgress:()=>{}})`);
  await compare('HX dense '+variant,`BR({...__speedArgs(),harmonicXplore:{...wR(),detailDensity:1,detailMode:'dense'},cooperative:true,onProgress:()=>{}})`);
 }
 for(const r of runtimes)r.run(`var __speedJob={key:'speed2-cecilia-stage',sampleRate:8000,durationSec:.28,support:{plan:__speedCarrier,length:2240},recipe:{mode:'state',coupling:.64,variantRevision:'revised'},model:__speedModel,cecilia:xR('vocal',{vocal:{formantShift:4,vowel:1.7,breath:.54,presence:.9,vibratoCents:60,humanize:.6}})};var __speedMaterial={runs:[{voice:0,startSample:0,endSample:2240,sourceStart:0,sourceEnd:20000,sourceOffset:0,sourceSpeed:1,timeMode:'loop',states:[{sample:0,nodeId:0,aperiodicity:.22},{sample:2100,nodeId:5,aperiodicity:.36}]}]};`);
 for(const r of runtimes){let receipts=0;const Native=r.context.Worker;r.context.Worker=class extends Native{constructor(...args){super(...args);receipts++;}};r.context.__getWorkerReceipts=()=>receipts;}
 await compare('Cecilia pipeline CPU',`__f352RenderCecilia(__speedJob,{material:__speedMaterial})`);
 await compare('Cecilia pipeline actual thread',`__F352Worker.run('synthetic',__speedJob,{material:__speedMaterial})`);
 for(const r of runtimes)assert.equal(r.context.__getWorkerReceipts(),1,'synthetic worker must start');
 await compare('Spectrum actual thread',`__F352Worker.run('spectrum',{key:'speed2-spectrum',sampleRate:16000},{pcm:__speedSource})`);
 for(const r of runtimes)assert.equal(r.context.__getWorkerReceipts(),2,'spectrum worker must start');
 for(const r of runtimes)await assert.rejects(r.run(`__F352DSP.spectrum(__speedSource,16000,{isCancelled:()=>true})`),e=>e.name==='AbortError');
 fs.mkdirSync('results',{recursive:true});fs.writeFileSync('results/speed2-preservation.json',JSON.stringify({status:'PASS',cases:cases.length,names:cases,cancellation:'PASS',fullPCM:true,runtime:process.version},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',cases:cases.length,fullPCM:true,cancellation:'PASS'}));
}
main().catch(e=>{console.error(e.message?.slice(0,1200),e.stack?.split('\n').filter(s=>s.trim().startsWith('at ')).slice(0,5).join('\n'));process.exitCode=1;});
