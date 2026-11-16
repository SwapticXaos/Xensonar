'use strict';
// LOOP-TRIM-PERSIST: a bar trim on a starter/demo material survives a page reload (the PCM override is rebuilt;
// before, hydrate found no audio for lazily rendered starter materials). MORE-CHOICES: the single "More choices here" link (next to Resident System)
// in the Main Room opens the Nodal Center. Usage: node tests/e2e/loop_trim_and_more_choices.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(),'xen-trim-')),{args:['--autoplay-policy=no-user-gesture-required'],viewport:{width:1600,height:1000}});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  await p.goto('file://'+html);await p.waitForTimeout(5000);
  const id=JSON.parse(await E(`JSON.stringify(__XenQuick.getItems().filter(i=>i.kind==='material').map(i=>i.id))`))[0];
  assert.ok(id,'a material is in the session');
  assert.equal(await E(`__XenRackLiveBarEdits.setIntent('${id}',-1,0)`),true);
  await p.waitForTimeout(4500);
  await p.reload();await p.waitForTimeout(12000);
  const after=JSON.parse(await E(`JSON.stringify({intent:!!__XenRackLiveBarEdits.intentFor('${id}'),override:!!__XenRackLiveBarEdits.get('${id}')})`));
  assert.ok(after.intent,'trim intent restored after reload');
  assert.ok(after.override,'trimmed PCM rebuilt after reload (starter material)');
  // "More choices here": the green label and the link both lead to the Nodal Center
  await ctx.close();
  for(const which of [0]){
    const br=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await br.newPage({viewport:{width:1600,height:1000}});p.on('pageerror',e=>errors.push(e.message));
    await p.goto('file://'+html);await p.waitForTimeout(5000);
    await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
    const b=p.getByRole('button',{name:/More choices here/});
    assert.equal(await b.count(),1,'exactly one "More choices here" link (no duplicate at the bottom)');
    await b.nth(which).scrollIntoViewIfNeeded();await b.nth(which).click();await p.waitForTimeout(2500);
    assert.ok(await p.locator('[data-installation-resident-controls]').count(),'Nodal Center resident controls shown (entry '+which+')');
    await br.close();
  }
  assert.deepEqual(errors,[]);
  console.log('OK loop_trim_and_more_choices');
})().catch(e=>{console.error(e);process.exit(1)});
