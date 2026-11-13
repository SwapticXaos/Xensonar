'use strict';
// ENGINE-SMOKE-01: does the shipped index.html start and stay quiet in this browser engine?
// Start, Power on, the audio context runs, all five rooms can be entered and left, no uncaught page errors.
// Nothing about sound quality: that stays a listening test. Only Chromium is covered by the other tests; this one also runs in Firefox
// (the contract names Firefox AudioParam automation as a known risk).
// Usage: XEN_BROWSER=chromium|firefox|webkit node tests/browsers/engine_smoke.cjs [index.html]
const path=require('node:path');
const pw=require('playwright');
const engine=process.env.XEN_BROWSER||'chromium';
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));
const ROOMS=['MATERIAL FORGE','NODAL CENTER','MULTITRACK','PSY LAB','LIVE ROOM'];
const fail=[];const note=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)fail.push(msg)};
(async()=>{
  const type=pw[engine];if(!type)throw Error('unknown XEN_BROWSER '+engine);
  const opts=engine==='chromium'?{args:['--autoplay-policy=no-user-gesture-required']}
    :engine==='firefox'?{firefoxUserPrefs:{'media.autoplay.default':0,'media.autoplay.blocking_policy':0,'media.navigator.permission.disabled':true}}:{};
  const browser=await type.launch(opts);
  try{
    const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
    const pageErrors=[],consoleErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e.message||e).slice(0,200)));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,160))});
    await page.addInitScript(()=>{window.__ctx=[];const AC=window.AudioContext;if(AC)window.AudioContext=class extends AC{constructor(...a){super(...a);__ctx.push(this)}}});
    const click=t=>page.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no button '+t);b.click()},t);
    await page.goto('file://'+html);
    await page.getByRole('button',{name:'Power'}).waitFor({timeout:60000});
    note(true,engine+': app started, Power button present');
    await page.getByRole('button',{name:'Power'}).click();
    let state='none';
    for(let i=0;i<20;i++){await page.waitForTimeout(500);state=await page.evaluate(()=>__ctx[0]?.state||'none');if(state==='running')break}
    note(state==='running','audio context running after Power (state: '+state+')');
    await page.waitForTimeout(3000);
    for(const r of ROOMS){
      try{await click(r);await page.waitForTimeout(1500);note(true,'room '+r+' entered')}catch(e){note(false,'room '+r+': '+String(e.message).slice(0,100))}
    }
    const after=await page.evaluate(()=>({buttons:document.querySelectorAll('button').length,contexts:__ctx.length,states:__ctx.map(c=>c.state)}));
    note(after.buttons>50,'Live Room is back with its controls ('+after.buttons+' buttons)');
    note(after.contexts===1,'exactly one AudioContext ('+after.contexts+')');
    note(pageErrors.length===0,'no uncaught page errors'+(pageErrors.length?': '+pageErrors.slice(0,3).join(' | '):''));
    console.log('info console errors:',consoleErrors.length,[...new Set(consoleErrors)].slice(0,3));
  }finally{await browser.close()}
  if(fail.length){console.log('\nENGINE-SMOKE FAILED in '+engine+': '+fail.length+' check(s)');process.exit(1)}
  console.log('\nPASS ENGINE-SMOKE-01 in '+engine);
})().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,3).join('\n'));process.exit(1)});
