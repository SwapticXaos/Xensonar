/* Probe only (not shipped): ROOM4-05 Package Station round trip of a Multitrack arrangement.
 * Context A: build an arrangement (2 clips of one imported WAV), export ONLY the category "Multitrack-Arrangement".
 * Context B (empty profile): import that .xenpack, then check arrangement, material and its audio. */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os'),crypto=require('crypto');
const target='file://'+path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const f=path.join(os.tmpdir(),'xen_pkgrt_stereo.wav');{const sr=48000,n=sr*2,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){const v=Math.round(5000*Math.sin(2*Math.PI*220*i/sr));buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(f,buf)}
const pkg=path.join(os.tmpdir(),'xen_multitrack_only.xenpack');
const goMT=async p=>{await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).endsWith('MULTITRACK'))?.click()});await p.waitForTimeout(3000)};
const proj=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('xensonar-multitrack-v1');q.onsuccess=()=>{const g=q.result.transaction('projects').objectStore('projects').get('current');g.onsuccess=()=>r(g.result)}}));
(async()=>{const b=await chromium.launch();const out={};
 {const p=await (await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true})).newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
  await p.goto(target);await p.waitForTimeout(6000);await goMT(p);
  await p.setInputFiles('.xmt input[type=file]',f);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(1500);
  await p.locator('.xmt .clip').first().click();await p.keyboard.press('Control+d');await p.waitForTimeout(1500);
  const a=await proj(p);out.A={clips:a.tracks.flatMap(t=>t.clips).length,bpm:a.bpm,material:a.tracks[0].clips[0].materialId};
  await p.evaluate(()=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/RESONANCE|MAIN|LIVE/i.test(n(b.innerText)))?.click()});await p.waitForTimeout(1500);
  await p.getByRole('button',{name:'Open Package Station',exact:true}).click();const panel=p.getByRole('complementary',{name:'Paketinhalt'});await panel.waitFor();
  await panel.getByRole('button',{name:'Alle Rubriken abwählen',exact:true}).click();
  await panel.getByRole('checkbox',{name:'Multitrack-Arrangement',exact:true}).check();
  out.A.checked=await panel.locator('[data-xen-package-category] input:checked').count();
  await p.getByRole('button',{name:'Prepare Workspace Package',exact:true}).click();const save=p.getByRole('link',{name:'Save Now',exact:true});await save.waitFor({timeout:180000});
  const [dl]=await Promise.all([p.waitForEvent('download'),save.click()]);await dl.saveAs(pkg);out.A.pkgBytes=fs.statSync(pkg).size;out.A.errors=errors}
 {const p=await (await b.newContext({viewport:{width:1600,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));
  await p.goto(target);await p.waitForTimeout(6000);
  out.B={before:await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name).filter(n=>/multitrack/.test(n)))};
  await p.getByRole('button',{name:'Open Package Station',exact:true}).click();await p.locator('input[type=file][multiple]').setInputFiles(pkg);
  await p.waitForFunction(()=>indexedDB.databases().then(d=>d.some(x=>x.name==='xensonar-multitrack-v1')),{},{timeout:120000}).catch(()=>{});await p.waitForTimeout(4000);
  const msg=await p.evaluate(()=>document.body.innerText.match(/(Workspace package[^\n]*|Paket[^\n]*|import[^\n]*)/i)?.[0]||null);out.B.message=msg;
  out.B.dbs=await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name).filter(n=>/multitrack|material/.test(n)));
  await p.reload();await p.waitForTimeout(6000);await goMT(p);for(let i=0;i<40&&!(await p.$('.xmt .clip'));i++)await p.waitForTimeout(250);await p.waitForTimeout(2500);
  const r=await proj(p);out.B.clips=r?r.tracks.flatMap(t=>t.clips).length:null;out.B.bpm=r?.bpm;out.B.sameMaterialId=r?.tracks[0]?.clips[0]?.materialId===out.A.material;
  out.B.clipElements=await p.locator('.xmt .clip').count();
  out.B.sourceInfo=await (async()=>{await p.locator('.xmt .clip').first().click().catch(()=>{});await p.waitForTimeout(1500);return p.locator('[data-clip-source-info]').first().innerText().catch(()=>null)})();
  out.B.errors=errors}
 console.log(JSON.stringify(out,null,1));await b.close()})();
