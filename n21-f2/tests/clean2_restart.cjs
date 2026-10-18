const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
const expose=`window.__restart={wb:__F341Workbench,combo:__F352Session,store:__F35636DualStore,forge:pe,mount(){const h=document.createElement('section');h.id='restart-audit';h.style='position:fixed;inset:0;z-index:999999;background:#101b2c;overflow:auto';document.body.appendChild(h);const r=iY.createRoot(h);r.render(u.jsx(__F341WorkbenchDialog,{onClose:()=>{r.unmount();h.remove()}}));}};`;
const html=fs.readFileSync(path.join(root,manifest.entry),'utf8').replace('</script>',expose+'</script>');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xensonar-clean2-restart-'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});
const report={status:'PASS',checks:[],errors:[]};
async function digestStored(page){return page.evaluate(async()=>{const s=await __restart.store.read();if(!s)throw Error('No IndexedDB session');const payload=JSON.stringify([s.plan,s.sources,s.settings,s.result,s.carrier,s.workbench,s.combination,s.renderContext],(k,v)=>ArrayBuffer.isView(v)?{type:v.constructor.name,values:Array.from(v)}:v);const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));return {sha256:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join(''),sourceFrames:Object.fromEntries(Object.entries(s.sources).map(([k,v])=>[k,v?.samples?.length])),resultFrames:s.result?.pcm?.length??s.result?.samples?.length??s.result?.left?.length??0,bpm:s.carrier?.materialExport?.bpm};})}
(async()=>{
 let context;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const launch=()=>chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1490,height:1000},executablePath:process.env.XENSONAR_CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  async function open(){context=await launch();const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.__restart);return p}
  let page=await open();await page.evaluate(()=>__restart.mount());
  await page.getByRole('tab',{name:'Dual Donor · Assembly · Experimental'}).click();
  const panel=page.locator('#f35634-dual-panel'),files=panel.locator('input[type=file]');
  await files.nth(1).setInputFiles(path.join(__dirname,'fixtures/donor_a.wav'));await files.nth(2).setInputFiles(path.join(__dirname,'fixtures/donor_b.wav'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.f35634-state')].every(e=>e.textContent==='Spectrum ready'));
  await panel.locator('.f35637-primary').first().click();await panel.getByRole('button',{name:'Save hybrid to Donor Library',exact:true}).waitFor({timeout:60000});
  await page.evaluate(()=>{__restart.wb.preset('film');__restart.combo.patch({enabled:true,mode:'spectral',color:.83,amount:.61});const s=__restart.forge.getState(),data=s.spectralData.cloneData();data.fill(0);for(let i=100;i<Math.min(data.length,220);i++)data[i]=.47;s.spectralData.restoreData(data);__restart.forge.setState({materialExport:{...s.materialExport,bpm:137},renderVersion:s.renderVersion+1})});
  await page.waitForTimeout(850);const before=await digestStored(page);assert.equal(before.bpm,137);assert(before.sourceFrames.A>0&&before.sourceFrames.B>0);
  const live=await page.evaluate(()=>({wb:__restart.wb.export(),combo:__restart.combo.export(),carrier:Array.from(__restart.forge.getState().spectralData.cloneData())}));
  await context.close();context=null;
  page=await open();const after=await digestStored(page);assert.deepEqual(after,before,'Stored project changed across full Chromium process restart');
  report.checks.push('IndexedDB raw sources, render result, carrier and recipes survive complete browser process restart');
  await page.evaluate(()=>__restart.mount());await page.getByRole('tab',{name:'Dual Donor · Assembly · Experimental'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.f35634-state')].every(e=>e.textContent==='Spectrum ready'));
  const restored=await page.evaluate(()=>({wb:__restart.wb.export(),combo:__restart.combo.export(),carrier:Array.from(__restart.forge.getState().spectralData.cloneData()),bpm:__restart.forge.getState().materialExport.bpm}));
  assert.deepEqual(restored.wb,live.wb,'Live hearing settings did not restore');assert.deepEqual(restored.combo,live.combo,'Cecilia settings did not restore');assert.deepEqual(restored.carrier,live.carrier,'Authored carrier did not restore');assert.equal(restored.bpm,137);
  report.checks.push('Restored live hearing/Cecilia settings, nonempty authored carrier and 137 BPM match before restart');
  assert.deepEqual(report.errors,[]);report.snapshot=before;console.log(JSON.stringify(report));
 }catch(e){report.status='FAIL';report.failure=String(e.stack);throw e}
 finally{if(context)await context.close();server.close();fs.rmSync(profile,{recursive:true,force:true});fs.writeFileSync(path.join(root,'results/clean2_restart.json'),JSON.stringify(report,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
