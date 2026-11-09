'use strict';
// PKG-BOOT-TDZ-01 (real app): export a workspace package, import it into an empty profile, the app must
// finish starting after the restore reload and the restored data must be byte-identical (digest).
// Regression (05.11.–09.11.2026): boot-time restore hit `const __XMEM_MR03_ROOT_PILOT` before initialization
// and the app hung on "Startup is taking longer than expected".
// Usage: node tests/e2e/package_import_roundtrip.cjs <html>   (uses the Oct-28 P4 helpers)
const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const pw=require('playwright');
const helpers=require(path.resolve(__dirname,'../test_package_station_browser_p4.cjs'));
(async()=>{
  const html=path.resolve(process.argv[2]||'index.html'),dist=path.resolve(__dirname,'../../dist/XenSonar_Standalone.html');
  if(html!==dist){fs.mkdirSync(path.dirname(dist),{recursive:true});fs.copyFileSync(html,dist)}
  const br=await pw.chromium.launch();
  try{
    const a=await helpers.go(br);await helpers.seed(a.page,4);const expected=await helpers.digest(a.page);
    const file=path.join(os.tmpdir(),`xen_roundtrip_${process.pid}.xenpack`);await helpers.download(a.page,file);
    const b=await helpers.go(br);const errors=[];b.page.on('pageerror',e=>errors.push(e.message));
    await b.page.evaluate(()=>localStorage.setItem('other-application-key','target-only'));
    await b.page.getByRole('button',{name:'Open Package Station',exact:true}).click();
    await b.page.locator('input[type=file][multiple]').setInputFiles(file);
    await b.page.waitForFunction(()=>localStorage.getItem('xensonar.p4.fixture')!==null&&window.__XenBoot?.state().ready,{},{timeout:60000});
    assert.deepEqual(await helpers.digest(b.page),expected,'restored workspace must be identical');
    assert.equal(await b.page.evaluate(()=>localStorage.getItem('other-application-key')),'target-only','foreign keys untouched');
    assert.deepEqual(errors,[],'no page errors during restore boot');
    fs.rmSync(file,{force:true});
    console.log('PASS package import roundtrip: export → import into empty profile → app ready, data identical');
  }finally{await br.close()}
})().catch(e=>{console.error(e.message.split('\n')[0]);process.exit(1)});
