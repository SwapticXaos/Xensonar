'use strict';
// SCALA-01 (real app): Grid Workbench → "Import .scl" puts a Scala tuning into the Grid library as a custom grid (selected, saved,
// survives a reload); "Export .scl" downloads the selected grid as a Scala file that reads back to the same steps.
// Usage: node tests/e2e/scala_import_export.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-scala-'));const scl=path.join(dir,'meanquar.scl');
  fs.writeFileSync(scl,"! meanquar.scl\n!\n1/4-comma meantone scale. Pietro Aaron's temperament (1523)\n 12\n!\n 76.04900\n 193.15686\n 310.26471\n 5/4\n 503.42157\n 579.47057\n 696.57843\n 25/16\n 889.73529\n 1006.84314\n 1082.89214\n 2/1\n");
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const openWorkbench=async()=>{await p.locator('[title^="Click: Open Grid Workbench"]').first().click();await p.waitForSelector('[data-xen-header-menu="grid"] [data-xen-scala-import]',{timeout:15000});await p.waitForTimeout(300)};
  const custom=()=>p.evaluate(()=>window.__xenProbe.draw.evalInBundle('JSON.stringify(FJ().map(t=>({label:t.label,steps:t.stepCents.length,period:t.periodCents,c4:t.stepCents[4]})))')).then(JSON.parse);
  await p.goto('file://'+html);await p.waitForTimeout(3500);await openWorkbench();
  const before=await custom();
  const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.locator('[data-xen-scala-import]').click()]);await chooser.setFiles(scl);await p.waitForTimeout(800);
  const after=await custom();const mq=after.find(t=>t.label==='meanquar');
  assert.equal(after.length,before.length+1,'one new custom grid');assert.ok(mq,'named after the file: '+JSON.stringify(after));
  assert.equal(mq.steps,12);assert.equal(mq.period,1200);assert.ok(Math.abs(mq.c4-386.3)<.06,'5/4 = 386.3 c, got '+mq.c4);
  assert.match(await p.locator('[data-xen-header-menu="grid"]').innerText(),/meanquar imported from Scala: 12 steps, period 1200\.0 c/,'the status says what happened');
  // export the selected (imported) grid and read it back
  const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('[data-xen-scala-export]').click()]);const out=path.join(dir,dl.suggestedFilename());await dl.saveAs(out);
  const txt=fs.readFileSync(out,'utf8');assert.equal(dl.suggestedFilename(),'meanquar.scl');assert.match(txt,/\n 12\n!\n/);assert.match(txt,/\n 386\.30000\n/);assert.match(txt,/\n 2\/1\n$/);
  // reload: the grid is in the library
  await p.reload();await p.waitForTimeout(3500);assert.ok((await custom()).some(t=>t.label==='meanquar'),'kept after reload');
  // a broken file: clear message, nothing saved
  const bad=path.join(dir,'bad.scl');fs.writeFileSync(bad,'just a line\n');await openWorkbench();const n0=(await custom()).length;
  const [c2]=await Promise.all([p.waitForEvent('filechooser'),p.locator('[data-xen-scala-import]').click()]);await c2.setFiles(bad);await p.waitForTimeout(600);
  assert.equal((await custom()).length,n0,'nothing saved from a broken file');assert.match(await p.locator('[data-xen-header-menu="grid"]').innerText(),/Scala file could not be loaded: Not a Scala file/,'the reason is shown');
  assert.deepEqual(errors,[]);console.log('PASS SCALA-01 import .scl (meantone, 12 steps, 5/4 = 386.3 c), export .scl, reload, broken file refused');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
