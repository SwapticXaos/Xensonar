/* Probe only (not shipped): ROOM4-05 Package Station Eye shows the Multitrack arrangement as its own category
 * and 'Used in: Multitrack · N Clips' on the Material. Read-only. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const f=path.join(os.tmpdir(),'xen_pkg_stereo.wav');{const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(5000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
await p.goto('file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html')));await p.waitForTimeout(6000);
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000);
await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
await p.locator('.xmt .clip').first().click();await p.keyboard.press('Control+d');await p.waitForTimeout(800);
// leave the room, open the Package Station and its inventory (the Eye)
await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/RESONANCE|MAIN|LIVE/i.test(n(b.innerText)))?.click()});await p.waitForTimeout(1500);
await p.locator('button[aria-label="Open Package Station"]').first().click();await p.waitForTimeout(500);
await p.locator('button[aria-label="Open Archive Inventory"]').first().click();
await p.waitForSelector('dialog.xen-archive-inventory article',{timeout:60000});await p.waitForTimeout(1500);
const rows=await p.$$eval('dialog.xen-archive-inventory article',a=>a.map(x=>x.innerText.replace(/\s+/g,' ').slice(0,160)));
const closure=await p.evaluate(async()=>{const ps=window.__XenPackageStation4;if(!ps)return {error:'no station'};
 const brief=r=>r.map(x=>({n:String(x.name).slice(0,30),cat:x.category,inPackage:x.inPackage})).filter(x=>/Arrangement|inbox|xen_pkg/.test(x.n));
 return {onlyMultitrack:brief(await ps.catalogue({multitrack:true})),onlyMaterials:brief(await ps.catalogue({materials:true}))}});
console.log(JSON.stringify({total:rows.length,multitrackRows:rows.filter(r=>/Multitrack/.test(r)),closure,errors},null,1));await b.close()})();
