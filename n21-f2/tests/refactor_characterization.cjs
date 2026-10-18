const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const file=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const fixture=path.join(__dirname,'fixtures/clean2_refactor_characterization.json');
const expose=`window.__refactor={wb:__F341Workbench,material:__F356Material,originalMaterial:__F356MaterialOriginal,gestalt:__F356Gestalt,originalGestalt:__F356GestaltOriginal,workers:[__F356WorkerOriginal,__F356GestaltWorkerOriginal,__F356Worker,__F356GestaltWorker]};`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.evaluate(()=>{const m=new Map;const s={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})});
  await page.setContent(fs.readFileSync(file,'utf8').replace('</script>',expose+'</script>'),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__refactor);
  const result=await page.evaluate(async()=>{
   const {wb,material,originalMaterial,gestalt,originalGestalt,workers}=__refactor;
   const normalize=v=>JSON.parse(JSON.stringify(v,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
   // setContent has no secure origin: use deterministic full-byte FNV as the
   // browser transport value; Node hashes the resulting characterization below.
   const pcmHash=pcm=>{let h=2166136261;for(const b of new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength))h=Math.imul(h^b,16777619)>>>0;return h.toString(16).padStart(8,'0')};
   const sr=8000,samples=Float32Array.from({length:8000},(_,i)=>.19*Math.sin(i*2*Math.PI*173/sr)+.07*Math.sin(i*2*Math.PI*347/sr)+.025*Math.sin(i*2*Math.PI*971/sr));
   const atlas={hop:200,nodes:Array.from({length:40},(_,i)=>({center:i*200,rms:.17,level:.7,relativeLevel:.7,aperiodicity:.24,pitchConfidence:.86,f0Hz:173,centroidHz:760+i*7,formantEnvelope:Array.from({length:24},(_,j)=>Math.exp(-j*.1)),spectralPeaks:[{hz:173,magnitude:.19},{hz:347,magnitude:.07}]})),attacks:[{start:200,end:520,strength:.8}]};
   const model={samples,sampleRate:sr,version:'characterization-v1',atlas};
   const gains=Float32Array.from({length:33},(_,i)=>i>=2&&i<=28?(i<7?(i-1)/6:i>23?(29-i)/6:.82):0);
   const carrier={rootReferenceHz:220,bands:[{gainCurve:gains,centerRatioCurve:Float32Array.from({length:33},(_,i)=>Math.pow(2,i/72)),supportSigmaCurve:Float32Array.from({length:33},(_,i)=>.04+.025*Math.sin(i*.15))},{gainCurve:Float32Array.from(gains,(v,i)=>i>=15?v*.4:0),centerRatioCurve:Float32Array.from({length:33},()=>1.5),supportSigmaCurve:Float32Array.from({length:33},()=>.055)}]};
   const summarize=pcm=>({frames:pcm.length,pcmHash:pcmHash(pcm),pcmBase64:btoa(String.fromCharCode(...new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength))),peak:pcm.reduce((n,v)=>Math.max(n,Math.abs(v)),0),metadata:normalize(pcm.donorMaterialPlan)});
   const audio=[];for(const preset of wb.getPresets()){
    const cfg=wb.make({preset:preset.id,params:preset.values});
    const original=cfg.params.variantRevision==='original',dsp=cfg.params.gestaltPilot?(original?originalGestalt:gestalt):(original?originalMaterial:material);
    const pcm=await dsp.render(carrier,model,sr,.24,{workbench:cfg});audio.push({id:preset.id,...summarize(pcm)});
   }
   const higherRate=24000;
   const higherModel={...model,sampleRate:higherRate,samples:Float32Array.from({length:higherRate},(_,i)=>.19*Math.sin(i*2*Math.PI*173/higherRate)+.07*Math.sin(i*2*Math.PI*347/higherRate)+.025*Math.sin(i*2*Math.PI*971/higherRate)),atlas:{...atlas,hop:600,nodes:atlas.nodes.map(n=>({...n,center:n.center*3})),attacks:atlas.attacks.map(a=>({...a,start:a.start*3,end:a.end*3}))}};
   const downsampled=[];
   for(const id of ['material-flow-original','material-flow','gestalt-imprint-original','gestalt-imprint']){
    const preset=wb.getPresets().find(p=>p.id===id),cfg=wb.make({preset:id,params:{...preset.values,materialTime:'loop'},regions:[{id:'keep',role:'include',start:.1,end:.9},{id:'cut',role:'exclude',start:.45,end:.55}]});
    const dsp=cfg.params.gestaltPilot?(cfg.params.variantRevision==='original'?originalGestalt:gestalt):(cfg.params.variantRevision==='original'?originalMaterial:material);
    const pcm=await dsp.render(carrier,higherModel,sr,.32,{workbench:cfg});downsampled.push({id,...summarize(pcm)});
   }
   const NativeWorker=globalThis.Worker;
   const workerReceipts={created:0,ready:0,pcm:0};
   globalThis.Worker=class extends NativeWorker {
    constructor(...args){super(...args);workerReceipts.created++;this.addEventListener('message',event=>{if(event.data?.ready)workerReceipts.ready++;if(event.data?.pcm instanceof Float32Array)workerReceipts.pcm++})}
   };
   const workerResults=[];for(let i=0;i<workers.length;i++){
    const cfg=wb.make({params:{materialPilot:true,gestaltPilot:i%2===1,gestaltMode:'imprint',variantRevision:i<2?'original':'revised',materialTime:'loop',position:.23}});
    const pcm=await workers[i].render(carrier,i===0?model:higherModel,sr,.24,{workbench:cfg});workerResults.push({index:i,...summarize(pcm)});
   }
   globalThis.Worker=NativeWorker;
   if(workerReceipts.created!==4||workerReceipts.ready!==4||workerReceipts.pcm!==4)throw Error('Expected 4 actual worker results; a silent main-thread fallback is not accepted: '+JSON.stringify(workerReceipts));
   const recipes=[];for(const input of [{},{preset:'source-held',params:{engine:'source-grains'},regions:[{start:.7,end:.3,role:'include'}]},{preset:'film',params:{motion:99,formant:-99,mapping:null},regions:[{id:'a',role:'include',start:-1,end:.6},{role:'exclude',start:.4,end:.5}]},{params:{variantRevision:'original',signaturePilot:true,planning:'reference',referenceStart:.8,referenceEnd:.2}}])recipes.push(normalize(wb.make(input)));
   const events=[];const detach=wb.attach({loadPresets:()=>[],beforeChange:()=>events.push('before'),afterChange:()=>events.push('after')});let notices=0;const un=wb.subscribe(()=>notices++);
   wb.restore({sourceKey:'s',params:{motion:.6},regions:[]});wb.patch({motion:1.2});wb.storeA();wb.patch({noise:.7});wb.toggleAB();wb.toggleAB();wb.undo();wb.redo();
   const state=normalize({config:wb.export(),session:wb.exportSession(),snapshot:wb.getSnapshot(),events,notices});un();detach();
   return {audio,downsampled,workers:workerResults,workerReceipts,recipes,state};
  });
  assert.deepEqual(errors,[]);const serialized=JSON.stringify(result),hash=crypto.createHash('sha256').update(serialized).digest('hex');
  if(process.argv.includes('--capture'))fs.writeFileSync(fixture,JSON.stringify(result,null,2)+'\n');
  else assert.deepEqual(result,JSON.parse(fs.readFileSync(fixture)),'CLEAN2 behavior/PCM characterization drift');
  const summary={status:'PASS',presets:result.audio.length,downsampleAndRegionCases:result.downsampled.length,actualWorkers:result.workers.length,workerReceipts:result.workerReceipts,recipeBoundaryCases:result.recipes.length,sha256:hash};
  fs.writeFileSync(path.join(root,'results/refactor_characterization.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
