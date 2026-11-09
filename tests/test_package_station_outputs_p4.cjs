'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {go,seed,digest,download,executable}=require('./test_package_station_browser_p4.cjs');
const dir=path.join(__dirname,'../test-results-p4');
(async()=>{const browser=await pw.chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});let server;try{
 // file:// OPFS denied: large output is really downloaded as bounded parts.
 const a=await go(browser);await seed(a.page,8);await download(a.page,path.join(dir,'outputs-baseline.xenpack'));await seed(a.page,40);const expected=await digest(a.page);
 await a.page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).click();const parts=[];
 for(let i=1;i<=2;i++){const link=a.page.getByRole('link',{name:'Save part '+i+' and continue',exact:true});await link.waitFor({timeout:120000});const [dl]=await Promise.all([a.page.waitForEvent('download'),link.click()]);const target=path.join(dir,dl.suggestedFilename());await dl.saveAs(target);assert(fs.statSync(target).size<=32*1024*1024);parts.push(target)}
 await a.page.getByText(/Workspace package saved/).waitFor();console.log("P4 OUTPUT multipart download complete");const b=await go(browser);await b.page.getByRole('button',{name:'Open Package Station',exact:true}).click();await b.page.locator('input[type=file][multiple]').setInputFiles(parts.reverse());await b.page.waitForFunction(()=>localStorage.getItem('xensonar.p4.fixture')!==null,{},{timeout:120000});await b.page.waitForFunction(()=>window.__XenBoot?.state().ready);assert.deepEqual(await digest(b.page),expected);console.log("P4 OUTPUT multipart restore complete");
 // Secure localhost: native OPFS one-file path and direct writable-file handle.
 const html=fs.readFileSync(path.join(__dirname,'../dist/XenSonar_Standalone.html'));
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const c=await go(browser);await c.page.goto('http://127.0.0.1:'+server.address().port);await c.page.waitForFunction(()=>window.__XenBoot?.state().ready);await seed(c.page,8);await download(c.page,path.join(dir,'opfs.xenpack'));console.log('P4 OUTPUT OPFS download complete');assert(await c.page.evaluate(()=>window.__XenPackageStation4.diagnostics().events.some(x=>x.stage==='archive-written-opfs')));
 await c.page.evaluate(()=>{window.showSaveFilePicker=async()=>{window.__pickerActive=navigator.userActivation.isActive;return (await navigator.storage.getDirectory()).getFileHandle('native-direct.xenpack',{create:true})}});
 await c.page.getByRole('button',{name:'Prepare Workspace Package',exact:true}).click();await c.page.getByText(/Workspace package saved/).waitFor({timeout:120000});assert(await c.page.evaluate(()=>window.__pickerActive));
 console.log('P4 OUTPUT direct save complete');const direct=await c.page.evaluate(async()=>{const d=await navigator.storage.getDirectory(),f=await (await d.getFileHandle('native-direct.xenpack')).getFile();return {size:f.size,info:await window.__XenPackageStation4.inspect(f)}});assert(direct.info.records>0);
 const report={multipart:{parts:parts.length,maxPartBytes:32*1024*1024,roundtrip:'passed'},opfs:'passed',direct:{size:direct.size,records:direct.info.records,userActivation:true}};
 fs.writeFileSync(path.join(dir,'outputs-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 await a.context.close();await b.context.close();await c.context.close();
 }finally{await browser.close();if(server)await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
