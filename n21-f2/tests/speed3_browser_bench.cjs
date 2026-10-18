const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright'),{setup,median}=require('./forge_speed2.cjs');
const probe=require('./donor_speed3_setup.cjs'),root=path.join(__dirname,'..');
const old=path.resolve(process.argv[2]),next=path.resolve(process.argv[3]);
const wav=fs.readFileSync(path.join(__dirname,'fixtures/donor_a.wav')),samples=[];for(let i=44;i<wav.length;i+=2)samples.push(wav.readInt16LE(i)/32768);
const expose=setup+probe+`
window.__speed3Browser=async real=>{
 if(real){__auditModel.samples=Float32Array.from(${JSON.stringify(samples)});__auditModel.sampleRate=${wav.readUInt32LE(24)};__auditModel.bodyStart=600;__auditModel.bodyEnd=${samples.length-600};__auditModel.sourceIndex={windows:[{id:0,startSample:600,endSample:${samples.length-600},stateDistance:0}],representativeLevel:.15,fallback:false};}
 const progress=[];const t=performance.now(),out=await __ForgeF33.renderDonorHybrid(__auditPlan,__auditModel,16000,real?.32:1.2,{workbench:__auditConfig,onProgress:p=>progress.push(p)}),ms=performance.now()-t;
 return {ms,bytes:btoa(String.fromCharCode(...new Uint8Array(out.buffer))),meta:JSON.parse(JSON.stringify(out.donorMaterialPlan)),progress};
};`;
const html=[old,next].map(f=>fs.readFileSync(f,'utf8').replace('const kEe=CEe("root");iY.createRoot(kEe).render(u.jsx(P.StrictMode,{children:u.jsx(REe,{})}));','').replace('await __ForgeF33.preloadAllMaterialIntakeStates();','').replace('</script>',expose+'</script>'));
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html[req.url.startsWith('/new')?1:0]);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const rows=[],errors=[];
  for(const real of [false,true]){const pages=await Promise.all([browser.newPage(),browser.newPage()]);for(let i=0;i<2;i++){pages[i].on('pageerror',e=>errors.push(String(e)));await pages[i].goto('http://127.0.0.1:'+server.address().port+(i?'/new':'/old'),{waitUntil:'domcontentloaded'});await pages[i].waitForFunction(()=>!!window.__speed3Browser);}
   const times=[[],[]];let reference;
   for(let rep=-2;rep<5;rep++)for(const idx of rep%2===0?[1,0]:[0,1]){await pages[idx].bringToFront();const out=await pages[idx].evaluate(real=>window.__speed3Browser(real),real);if(!reference)reference=out;else{assert.equal(out.bytes,reference.bytes);assert.deepEqual(out.meta,reference.meta);assert.deepEqual(out.progress,reference.progress);}if(rep>=0)times[idx].push(out.ms);}
   const row={case:real?'real-wav':'texture',baselineMs:median(times[0]),candidateMs:median(times[1]),times,pcmIdentical:true,metadataIdentical:true,progressIdentical:true,sha256:crypto.createHash('sha256').update(Buffer.from(reference.bytes,'base64')).digest('hex')};row.savingPercent=100*(1-row.candidateMs/row.baselineMs);rows.push(row);console.log(JSON.stringify(row));await Promise.all(pages.map(p=>p.close()));
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'results/speed3-browser-bench.json'),JSON.stringify({browser:browser.version(),runs:5,rows,errors,scope:'Actual Chromium main-thread continuous DSP; UI mount/preload suppressed to isolate computation, not click-to-first-playback latency'},null,2)+'\n');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
