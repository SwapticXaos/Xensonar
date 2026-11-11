/* Probe only (not shipped): the Hold Pattern Memory owner is a lazy function island:
 * absent at boot, evaluated when the Pattern Memory control first mounts, and it still saves/lists. */
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(7000);
const out={};const idbBefore=await p.evaluate(async()=>(await indexedDB.databases()).some(d=>d.name==='xensonar-thunder-hold-patterns-v1'));out.dbOpenedAtBoot=idbBefore;
out.atBoot=await p.evaluate(()=>({owner:typeof globalThis.__XenHoldPatternMemory,deferred:window.__XenDeferredFunctionStatus().includes('__xenHoldPatternMemoryFactory'),scriptStillThere:!!document.getElementById('xen-function-__xenHoldPatternMemoryFactory')}));
out.panelsMounted=await p.locator('[data-xen-hpm01]').count();
if(out.panelsMounted){
 out.panel=out.panelsMounted;
 out.beforeTouch=await p.evaluate(()=>({owner:typeof globalThis.__XenHoldPatternMemory,deferred:window.__XenDeferredFunctionStatus().includes('__xenHoldPatternMemoryFactory')}));
 const name='lazy-probe-'+Date.now();const panel=p.locator('[data-xen-hpm01]').first();await panel.hover();await p.waitForTimeout(800);out.afterHover=await p.evaluate(()=>({owner:typeof globalThis.__XenHoldPatternMemory,deferred:window.__XenDeferredFunctionStatus().includes('__xenHoldPatternMemoryFactory')}));
 await panel.locator('input[type=text]').fill(name);await panel.getByRole('button',{name:'Save As'}).click();await p.waitForTimeout(1200);
 out.message=await panel.locator('.xen-hpm01-message').innerText().catch(()=>null);
 out.listed=await p.evaluate(async n=>(await globalThis.__XenHoldPatternMemory.list()).some(x=>x.name===n),name);}
console.log(JSON.stringify({...out,errors},null,1));await b.close()})();
