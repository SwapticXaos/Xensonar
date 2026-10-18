// Real offline DSP kernels in V8. DOM/audio allocation stubs are not browser latency measurements.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),inspector=require('node:inspector');
const {load}=require('./offline_runtime.cjs');
const setup=`
var __speedGrid=new ph(128,150);
for(let x=0;x<128;x++)for(let y=0;y<150;y++){
 const line=40+12*Math.sin(x*.028),line2=82+9*Math.sin(x*.043);
 const amp=(x>9&&x<115)?(.45*Math.exp(-(((y-line)/1.4)**2))+.32*Math.exp(-(((y-line2)/1.8)**2)))*(.7+.3*Math.sin(x*.11)**2):0;
 __speedGrid.set(x,y,amp);__speedGrid.setGrain(x,y,.25+.45*Math.sin(x*.017+y*.04)**2);
}
var __speedSR=16000,__speedDuration=1.2;
var __speedRaw=new o5e(()=>({sampleRate:__speedSR,createBuffer:(c,n,s)=>new AudioBuffer({numberOfChannels:c,length:n,sampleRate:s})}));
var __speedArgs=()=>({spectralData:__speedGrid,sampleRate:__speedSR,durationSec:__speedDuration,previewDurationSec:__speedDuration,rootHz:110,gain:.48,harmonicXplore:wR(),synthLab:TB({})});
var __speedSource=Float32Array.from({length:32000},(_,i)=>.17*Math.sin(i*2*Math.PI*173/16000)+.055*Math.sin(i*2*Math.PI*347/16000)+.024*Math.sin(i*2*Math.PI*977/16000));
var __speedAtlas={hop:200,nodes:Array.from({length:160},(_,i)=>({center:i*200,rms:.13,level:.72,relativeLevel:.72,aperiodicity:.22,pitchConfidence:.88,f0Hz:173,centroidHz:620+i*3,formantEnvelope:Array.from({length:24},(_,j)=>Math.exp(-j*.08)),spectralPeaks:[{hz:173,magnitude:.17},{hz:347,magnitude:.055}]})),attacks:[{start:200,end:500,strength:.7}]};
var __speedModel={samples:__speedSource,sampleRate:16000,version:'speed2-fixed-donor',atlas:__speedAtlas};
var __speedCarrier={rootReferenceHz:220,bands:[{gainCurve:Float32Array.from({length:121},(_,i)=>i>=5&&i<=112?(i<12?(i-4)/8:i>101?(113-i)/12:.88):0),centerRatioCurve:Float32Array.from({length:121},(_,i)=>1.04+.48*Math.sin(i*.020)),supportSigmaCurve:Float32Array.from({length:121},(_,i)=>.05+.02*Math.sin(i*.15))}]};
var __speedWorkbench=__F341Workbench.make({preset:'material-flow',params:__F341Workbench.getPresets().find(p=>p.id==='material-flow').values});
function __speedSeed(){let state=123456789;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
var __speedCalls={
 'Pure Dieter':()=>__speedRaw.renderToBuffer(__speedGrid,'additive',{sine:.6,triangle:.2,sawtooth:.15,square:.05},()=>{},{durationSec:__speedDuration}),
 'HarmonicXplorE':async()=> (await BR({...__speedArgs(),cooperative:true,onProgress:()=>{}})).buffer,
 'Spektralsynthese':async()=> (await DB({...__speedArgs(),cooperative:true,onProgress:()=>{}})).buffer,
 'Antonia':()=>tK({spectralData:__speedGrid,sampleRate:__speedSR,durationSec:__speedDuration,baseHz:110,gain:.46,maxVoices:12,timbre:'fm'}).buffer,
 'Bert':()=>tK({spectralData:__speedGrid,sampleRate:__speedSR,durationSec:__speedDuration,baseHz:110,gain:.52,maxVoices:14,timbre:'acid'}).buffer,
 'Cecilia':()=>tK({spectralData:__speedGrid,sampleRate:__speedSR,durationSec:__speedDuration,baseHz:110,gain:.48,maxVoices:16,timbre:'vocal'}).buffer,
 'Donor':()=>__F356Material.render(__speedCarrier,__speedModel,__speedSR,__speedDuration,{workbench:__speedWorkbench})
};`;
function pcmBytes(pcm){const channels=pcm.getChannelData?Array.from({length:pcm.numberOfChannels},(_,i)=>pcm.getChannelData(i)):[pcm];return Buffer.concat(channels.map(c=>Buffer.from(c.buffer,c.byteOffset,c.byteLength)));}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
async function main(){
 const base=process.argv[2]||'@speed1',next=path.resolve(process.argv[3]||'.'),runs=+(process.env.SPEED_RUNS||5);
 const runtimes=[base==='@speed1'?load(next,{speed1:true}):load(path.resolve(base)),load(next)];for(const r of runtimes)r.run(setup);
 if(process.env.SPEED_SR)for(const r of runtimes)r.run(`__speedSR=${+process.env.SPEED_SR};__speedDuration=${+(process.env.SPEED_DURATION||4)};`);
 const names=process.env.SPEED_CASES?process.env.SPEED_CASES.split(','):runtimes[0].run('Object.keys(__speedCalls)'),report=[];
 const session=new inspector.Session();session.connect();const post=(method,args={})=>new Promise((resolve,reject)=>session.post(method,args,(err,data)=>err?reject(err):resolve(data)));
 for(const name of names){
  const times=[[],[]];let reference;
  for(let rep=-1;rep<runs;rep++)for(const index of rep%2===0?[1,0]:[0,1]){
   const runtime=runtimes[index];runtime.run('__speedSeed()');
   if(rep===0&&index===0&&process.env.SPEED_PROFILE){await post('Profiler.enable');await post('Profiler.start');}
   const start=performance.now(),out=await runtime.run(`__speedCalls[${JSON.stringify(name)}]()`),elapsed=performance.now()-start,bytes=pcmBytes(out);
   if(rep===0&&index===0&&process.env.SPEED_PROFILE){const {profile}=await post('Profiler.stop');fs.mkdirSync('results/speed2-profiles',{recursive:true});fs.writeFileSync(`results/speed2-profiles/${name}.cpuprofile`,JSON.stringify(profile));}
   if(!reference)reference=bytes;else assert.deepEqual(bytes,reference,`${name}: PCM differs at run ${rep} variant ${index}`);
   if(rep>=0)times[index].push(elapsed);
  }
  const old=median(times[0]),newTime=median(times[1]),row={name,baselineMs:old,speed2Ms:newTime,savingPercent:100*(1-newTime/old),bytes:reference.length,times};report.push(row);console.log(JSON.stringify(row));
 }
 session.disconnect();fs.mkdirSync('results',{recursive:true});fs.writeFileSync(process.env.SPEED_OUT||'results/speed2-kernels.json',JSON.stringify({runtime:process.version,sampleRate:+process.env.SPEED_SR||16000,duration:+process.env.SPEED_DURATION||1.2,runs,report},null,2)+'\n');
}
if(require.main===module)main().catch(e=>{console.error(e.stack?.slice(0,1500)||e);process.exitCode=1;});
module.exports={setup,pcmBytes,median};
