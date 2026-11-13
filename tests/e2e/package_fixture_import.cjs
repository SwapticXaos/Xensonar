'use strict';
// PKG-FIXTURE-01 (real app): a .xenpack exported by an EARLIER build must still import into the current one.
// tests/fixtures/xenpack/xensonar_2026-11-13.xenpack was exported from the build of 13.11.2026 (two named sessions with Bass timbre and
// Drone settings). The import checks the storage schema of every database; the day a database gets a new version this test goes red and says
// that an import migration is needed before the change ships (CLAUDE.md: no migration without specific tests).
// Usage: node tests/e2e/package_fixture_import.cjs dist/XenSonar_PROBE.html              (test)
//        XEN_WRITE_FIXTURE=1 node tests/e2e/package_fixture_import.cjs dist/XenSonar_PROBE.html   (create a NEW fixture next to the old one; never overwrites)
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),crypto=require('node:crypto');
const pw=require('playwright');
const helpers=require(path.resolve(__dirname,'../test_package_station_browser_p4.cjs'));
const dir=path.resolve(__dirname,'../fixtures/xenpack');
const FIXTURE=path.join(dir,'xensonar_2026-11-13.xenpack'),SIDE=FIXTURE.replace(/\.xenpack$/,'.expect.json');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
const rows=p=>p.evaluate(()=>__xenProbe.meta.snapshot().saved.map(r=>({name:r.name,bass:r.songPerformance?.sources?.bass?.timbre?.bassVoice,droneHz:r.songPerformance?.sources?.drone?.params?.droneFixedHz})));
(async()=>{
  const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dist=path.resolve(__dirname,'../../dist/XenSonar_Standalone.html');
  // the package helpers drive dist/XenSonar_Standalone.html; the probe build is a superset of it
  fs.mkdirSync(path.dirname(dist),{recursive:true});fs.copyFileSync(html,dist);
  const br=await pw.chromium.launch();
  try{
    if(process.env.XEN_WRITE_FIXTURE==='1'){
      const stamp=new Date().toISOString().slice(0,10),file=path.join(dir,`xensonar_${stamp}.new.xenpack`);
      assert(!fs.existsSync(file),'refusing to overwrite '+file);fs.mkdirSync(dir,{recursive:true});
      const a=await helpers.go(br);await ready(a.page);await a.page.waitForTimeout(1500);
      for(const [name,voice,hz] of [['FIXTURE A','hollow',55],['FIXTURE B','sub',110]]){
        await a.page.evaluate(([v,h])=>__xenProbe.bridge.patch({bassVoice:v,bassResonance:.5,droneFixedHz:h}),[voice,hz]);
        await a.page.waitForTimeout(300);
        assert.equal(await a.page.evaluate(n=>__xenProbe.meta.saveFromQuickAsNew(n,false),name),true,'save '+name);
      }
      await a.page.waitForTimeout(1800);
      await helpers.download(a.page,file);
      const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      fs.writeFileSync(file.replace(/\.xenpack$/,'.expect.json'),JSON.stringify({sha256:sha,bytes:fs.statSync(file).size,sessions:(await rows(a.page)).filter(r=>/^FIXTURE/.test(r.name))},null,1)+'\n');
      console.log('WROTE',file,fs.statSync(file).size,'bytes. Rename it (drop ".new") and update FIXTURE in this test to freeze it.');return;
    }
    const exp=JSON.parse(fs.readFileSync(SIDE,'utf8'));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex'),exp.sha256,'fixture file was modified');
    const b=await helpers.go(br);const errors=[];b.page.on('pageerror',e=>errors.push(e.message));
    await ready(b.page);await b.page.waitForTimeout(1500);
    assert.equal((await rows(b.page)).filter(r=>/^FIXTURE/.test(r.name)).length,0,'target profile starts without the fixture sessions');
    await b.page.getByRole('button',{name:'Open Package Station',exact:true}).click();
    const alerts=[];b.page.on('dialog',d=>{if(d.type()==='alert')alerts.push(d.message())}); // helpers.go already accepts every dialog
    await b.page.locator('input[type=file][multiple]').setInputFiles(FIXTURE);
    // success = the app reloads and comes back with the sessions; a refused import ends in an alert and the previous state is restored
    let outcome='timeout after 90 s';
    for(let i=0;i<90&&outcome.startsWith('timeout');i++){
      if(alerts.length){outcome='refused: '+alerts.join(' | ');break}
      try{if(await b.page.evaluate(()=>!!(window.__XenBoot?.state().ready&&window.__xenProbe&&__xenProbe.meta.snapshot().saved.some(r=>/^FIXTURE/.test(r.name)))))outcome='ok'}catch{/* page is reloading */}
      if(outcome==='ok')break;await new Promise(r=>setTimeout(r,1000));
    }
    assert.equal(outcome,'ok','the frozen package no longer imports: '+outcome+'  -> an import migration is needed before this storage change ships');
    await ready(b.page);
    const got=(await rows(b.page)).filter(r=>/^FIXTURE/.test(r.name));
    assert.deepEqual(got,exp.sessions,'restored sessions equal the exported ones (names, Bass timbre, Drone)');
    assert.deepEqual(errors,[],'no page errors during restore');
    console.log('PASS PKG-FIXTURE-01: package of 13.11.2026 imports into an empty profile; '+got.length+' sessions restored with Bass timbre and Drone');
  }finally{await br.close()}
})().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,5).join('\n'));process.exit(1)});
