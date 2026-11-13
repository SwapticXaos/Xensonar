'use strict';
// STORAGE-PERSIST-01 (real app): opening the Package Station inventory asks the browser for persistent storage and
// shows whether the data is protected. The browser's answers are simulated (navigator.storage), the UI is the real one.
// Usage: node tests/e2e/storage_persistence.cjs <html>
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const html=path.resolve(process.argv[2]||'index.html');
const stub=mode=>`(()=>{window.__persistCalls=0;
 const mode=${JSON.stringify(mode)};
 if(mode==='none'){Object.defineProperty(navigator,'storage',{value:undefined,configurable:true});return}
 let granted=mode==='already';
 const est=async()=>({usage:5*1048576,quota:4*1073741824});
 Object.defineProperty(navigator,'storage',{configurable:true,value:{
  persisted:async()=>granted,estimate:est,
  persist:async()=>{__persistCalls++;if(mode==='grant')granted=true;return granted}}});})();`;
async function run(browser,mode,expect){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(stub(mode));
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);
  await p.getByRole('button',{name:'Open Package Station',exact:true}).waitFor({timeout:30000});
  assert.equal(await p.evaluate(()=>__persistCalls),0,mode+': nothing is asked before the user opens anything');
  await p.getByRole('button',{name:'Open Package Station',exact:true}).click();
  await p.getByRole('button',{name:'Open Archive Inventory',exact:true}).click();
  const line=p.locator('[data-xen-storage-safety]');
  await line.waitFor({timeout:10000});
  assert.equal(await line.getAttribute('data-xen-storage-safety'),expect.kind,mode+': status line kind');
  const text=await line.innerText();
  for(const re of expect.text)assert.match(text,re,mode+': text '+re);
  assert.equal(await p.evaluate(()=>__persistCalls),expect.calls,mode+': persist() calls after opening');
  if(expect.retry){
    await line.getByRole('button',{name:/Ask the browser/}).click();
    await p.waitForFunction(n=>__persistCalls===n,expect.calls+1,{timeout:5000});
  }
  // closing and reopening in the same page must not ask again on its own
  const before=await p.evaluate(()=>__persistCalls);
  await p.getByRole('button',{name:'Close archive inventory'}).click();
  await p.getByRole('button',{name:'Open Archive Inventory',exact:true}).click();
  await p.locator('[data-xen-storage-safety]').waitFor({timeout:10000});
  assert.equal(await p.evaluate(()=>__persistCalls),before,mode+': reopening does not ask again');
  assert.deepEqual(errors,[],mode+': no page errors');
  await ctx.close();
}
(async()=>{
  const browser=await chromium.launch();
  try{
    await run(browser,'already',{kind:'persistent',text:[/protected/,/5 MB of 4\.0 GB/],calls:0});
    await run(browser,'grant',{kind:'persistent',text:[/protected/],calls:1});
    await run(browser,'deny',{kind:'temporary',text:[/not protected/,/Export a Workspace Package/],calls:1,retry:true});
    await run(browser,'none',{kind:'unsupported',text:[/cannot protect/],calls:0});
    console.log('PASS STORAGE-PERSIST-01: already protected (no request), granted, denied (hint + retry), unsupported browser');
  }finally{await browser.close()}
})().catch(e=>{console.error(e.message.split('\n').slice(0,4).join('\n'));process.exit(1)});
