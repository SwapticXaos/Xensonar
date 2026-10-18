const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).entry));
const fixture=path.join(__dirname,'fixtures/clean3_weave_worker.json');
const expose='window.__weaveTest={wb:__F341Workbench,dsp:__F356Gestalt,worker:__F356GestaltWorker};';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.evaluate(()=>{const rows=new Map,storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage})});
  await page.setContent(fs.readFileSync(file,'utf8').replace('</script>',expose+'</script>'),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__weaveTest);
  const result=await page.evaluate(async()=>{
   const {wb,dsp,worker}=__weaveTest,sr=8000,donorRate=24000;
   const model={sampleRate:donorRate,version:'weave-worker-v1',samples:Float32Array.from({length:donorRate},(_,i)=>.19*Math.sin(i*2*Math.PI*173/donorRate)+.07*Math.sin(i*2*Math.PI*347/donorRate)),atlas:{hop:33,nodes:Array.from({length:720},(_,i)=>({center:i*33,rms:.12+.06*Math.sin(i*.17),level:.5+.35*Math.sin(i*.11),relativeLevel:.5,pitchConfidence:.75,aperiodicity:.5+.4*Math.sin(i*.073),f0Hz:173,centroidHz:500+4000*(1+Math.sin(i*.019))/2,formantEnvelope:Array.from({length:24},(_,j)=>.15+Math.abs(Math.sin(i*.035+j*.31))),spectralPeaks:[{hz:173,magnitude:.19},{hz:347,magnitude:.07}]})),attacks:[{start:600,end:1500,strength:.8}]}};
   const carrier={rootReferenceHz:220,bands:[{gainCurve:Float32Array.from({length:33},(_,i)=>i>=2&&i<=28?.7:0),centerRatioCurve:Float32Array.from({length:33},(_,i)=>Math.pow(2,i/72)),supportSigmaCurve:Float32Array.from({length:33},(_,i)=>.04+.025*Math.sin(i*.15))}]};
   const summarize=pcm=>({frames:pcm.length,pcmBase64:btoa(String.fromCharCode(...new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength))),metadata:JSON.parse(JSON.stringify(pcm.donorMaterialPlan,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v))});
   const NativeWorker=globalThis.Worker,receipts={created:0,ready:0,pcm:0};
   globalThis.Worker=class extends NativeWorker{constructor(...args){super(...args);receipts.created++;this.addEventListener('message',e=>{if(e.data?.ready)receipts.ready++;if(e.data?.pcm instanceof Float32Array)receipts.pcm++})}};
   const cases=[];
   for(const regions of [[],[{id:'keep',role:'include',start:.1,end:.9},{id:'cut',role:'exclude',start:.45,end:.55}]]){
    const config=wb.make({params:{materialPilot:true,gestaltPilot:true,gestaltMode:'weave',variantRevision:'revised',materialTime:'loop',position:.23,gestaltGesture:.7,gestaltMotion:.6},regions});
    const direct=summarize(await dsp.render(carrier,model,sr,.24,{workbench:config}));
    const threaded=summarize(await worker.render(carrier,model,sr,.24,{workbench:config}));
    if(JSON.stringify(direct)!==JSON.stringify(threaded))throw Error('Weave worker and direct renderer differ');
    cases.push({regions,pcm:threaded});
   }
   globalThis.Worker=NativeWorker;
   if(receipts.created!==2||receipts.ready!==2||receipts.pcm!==2)throw Error('Real worker execution required: '+JSON.stringify(receipts));
   return {cases,receipts};
  });
  assert.deepEqual(errors,[]);
  if(process.argv.includes('--capture'))fs.writeFileSync(fixture,JSON.stringify(result,null,2)+'\n');
  assert.deepEqual(result,JSON.parse(fs.readFileSync(fixture)),'CLEAN3 weave PCM or metadata changed');
  const report={status:'PASS',weaveCases:result.cases.length,workerReceipts:result.receipts,directWorkerIdentical:true,sha256:crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex')};
  fs.writeFileSync(path.join(root,'results/weave_worker_characterization.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
