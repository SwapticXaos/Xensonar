const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require('typescript'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');
const ownership=fs.readFileSync(path.join(root,'src/audio/01_voice_and_rfl_ownership.js'),'utf8');
const melodic=fs.readFileSync(path.join(root,'src/forge_and_melodic/04_render_cache_and_stems.js'),'utf8');
function decl(source,name){const ast=ts.createSourceFile('source.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node,name);return node.getText(ast)}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
const page=await browser.newPage();page.on('console',m=>console.log('PAGE',m.text()));page.on('pageerror',e=>console.log('PAGE ERROR',e.message));console.log('BROWSER READY');await page.route('http://nodal-forensics.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Nodal durability forensics</title>'}));await page.goto('http://nodal-forensics.test/');
console.log('PAGE READY');const source=['qhe','DS','Qhe','NS','em','Uhe','bg','OS','Khe','KT','bu'].map(name=>decl(ownership,name)).join('\n');
await page.addScriptTag({content:source+'\nwindow.api={bg,em,Uhe,NS,bu,B9e};'+decl(melodic,'B9e')});
console.log('FUNCTIONS READY');const report=await page.evaluate(async()=>{
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.QT={dbName:'nodal-forensics-'+Date.now(),storeName:'materials'};
window.Ei={entries:[]};window.Ww=new Set();window.trace=[];
window.uh=()=>{};window.n0e=()=>[];window.a0e=e=>e;window.UT=e=>e;
window.GS=entries=>{Ei={entries};trace.push({stage:'publish',ids:entries.map(e=>e.id)})};window.Vw=(kind,item)=>trace.push({stage:'event',kind,id:item.id});
const nativePut=IDBObjectStore.prototype.put;let abortNext=false,quotaNext=false;
IDBObjectStore.prototype.put=function(...args){if(quotaNext){quotaNext=false;throw new DOMException('Injected quota exceeded','QuotaExceededError')}const request=nativePut.apply(this,args);if(abortNext){abortNext=false;request.addEventListener('success',()=>{trace.push({stage:'request-success-abort'});request.transaction.abort()})}return request};
const rows=[];
console.log('NATIVE CASE');abortNext=true;let result;
try{await api.bg(QT,{id:'native-abort',blob:new Blob(['pcm'])},'write failed');result='resolved'}catch(e){result=e.name}
console.log('NATIVE RESULT',result);await delay(30);rows.push({case:'native request success followed by transaction.abort',writePromise:result,stored:await api.Uhe(QT,'native-abort','read failed')});
window.ULe=()=>{};window.VR=async()=>({blob:new Blob([new Uint8Array(128)])});window.I9e=()=>({});window.Ly=(_,blob)=>({id:'export-abort',blob,role:'loop',name:'Nodal'});window.$M=(_,e)=>e;
window.ri=(type,payload)=>trace.push({stage:'membership',type,payload});window.__mlNodalRflConfig=()=>({sourceKind:'material',renderMode:'flowing'});window.__mlContainsNodalTracks=()=>true;
abortNext=true;const statuses=[];try{await api.B9e({loopComposer:{},materialExport:{adapterId:'test',rootFollowPreferred:true},setStatus:s=>statuses.push(s)});result='resolved'}catch(e){result=e.name+': '+e.message}
await delay(30);rows.push({case:'B9e native midcommit abort',result,statuses,materialGhost:Ei.entries.some(e=>e.id==='export-abort'),membership:trace.some(e=>e.stage==='membership'),stored:await api.Uhe(QT,'export-abort','read failed'),trace:[...trace]});
trace.length=0;Ei={entries:[]};quotaNext=true;window.Ly=(_,blob)=>({id:'export-quota',blob,role:'loop',name:'Nodal'});
try{await api.B9e({loopComposer:{},materialExport:{adapterId:'test',rootFollowPreferred:true},setStatus:s=>statuses.push(s)});result='resolved'}catch(e){result=e.name+': '+e.message}
await delay(30);rows.push({case:'B9e injected QuotaExceededError on real store',result,materialGhost:Ei.entries.some(e=>e.id==='export-quota'),membership:trace.some(e=>e.stage==='membership'),stored:await api.Uhe(QT,'export-quota','read failed'),trace:[...trace]});
return {rows};
});
fs.writeFileSync(path.join(__dirname,'before-durability.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
assert.equal(report.rows[0].writePromise,'resolved');assert.equal(report.rows[0].stored,null);assert(report.rows[1].materialGhost);assert(!report.rows[1].membership);assert(report.rows[2].materialGhost);assert(!report.rows[2].membership);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
