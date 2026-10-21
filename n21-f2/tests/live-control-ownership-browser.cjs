'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const manifest=require('../source-manifest.json'),fixes=require('../docs/live-control-ownership/corrections.json');
const crypto=require('node:crypto'),prior=require('../docs/live-control-ownership/baseline.json');
const changes=Object.values(fixes).flat(),out='results/live-control-ownership';
let baseline=fs.readFileSync(manifest.entry,'utf8');
for(const change of [...changes].reverse())if(baseline.includes(change.new))baseline=baseline.replace(change.new,change.old);
assert.equal(crypto.createHash('sha256').update(baseline).digest('hex'),prior.htmlSha256,'comparison restores the exact previous HTML');
function variant(stages){let html=baseline;for(const change of changes)if(stages.includes(change.stage)){assert.equal(html.split(change.old).length-1,1);html=html.replace(change.old,change.new)}
 assert(html.includes('l=kke(),'));return html.replace('l=kke(),','l=(window.__liveControl=kke()),').replace('function REe(){','function REe(){window.__ownerRenders=(window.__ownerRenders||0)+1;').replace('function __f350RestoreRhythm(defaults){','function __f350RestoreRhythm(defaults){window.__settingsRestores=(window.__settingsRestores||0)+1;');}
const metric=(data,name)=>data.metrics.find(m=>m.name===name).value;
async function run(browser,stages,live=false){
 const context=await browser.newContext({viewport:{width:1490,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));const html=variant(stages);
 await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
 try{
  await page.goto('https://xensonar.test/owned-control');await page.getByRole('button',{name:'Power',exact:true}).waitFor();await page.waitForTimeout(300);
  if(live){await page.getByRole('button',{name:'Power',exact:true}).click();await page.waitForTimeout(300);await page.locator('canvas').first().scrollIntoViewIfNeeded()}
  const session=await context.newCDPSession(page);await session.send('Performance.enable');
  await page.evaluate(()=>{__ownerRenders=0;__settingsRestores=0});const before=await session.send('Performance.getMetrics');
  let snapshots;
  if(!live)snapshots=await page.evaluate(async()=>{
   let delivered=0;const channels=[__liveControl.audioEventIntakeMonitorChannel,__liveControl.audioTapMonitorChannel].filter(Boolean),unsubscribe=channels.map(c=>c.subscribe(()=>delivered++));
   for(let i=0;i<40;i++){
    __liveControl.setAudioEventIntakeMonitor({pendingIntents:[{id:i,source:'wave'}],latestDecisions:[],latestTapSnapshots:[]});
    __liveControl.setAudioTapMonitor({taps:{pre_fx:{rms:.1,peak:.2}},diagnosis:'Diagnostic '+i,hottestTap:'pre_fx'});
    await new Promise(requestAnimationFrame);
   }
   await new Promise(requestAnimationFrame);for(const stop of unsubscribe)stop();
   return {intakeId:__liveControl.audioEventIntakeMonitor.pendingIntents[0]?.id,tap:__liveControl.audioTapMonitor.diagnosis,channels:channels.length,delivered};
  });
  else{
   const b=await page.locator('canvas').first().boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();
   for(let i=0;i<100;i++){await page.mouse.move(b.x+b.width*(.1+.8*(i%40)/39),b.y+b.height*(.15+.7*(1+Math.sin(i*.15))/2));await page.waitForTimeout(16)}
   await page.mouse.up();await page.waitForTimeout(150);
  }
  const after=await session.send('Performance.getMetrics'),counts=await page.evaluate(()=>({renders:__ownerRenders,restores:__settingsRestores}));
  if(!live)snapshots.ownerStable=await page.evaluate(async()=>{
   const before=__liveControl,channel=before.audioTapMonitorChannel,tap=before.audioTapMonitor,intake=before.audioEventIntakeMonitor;
   before.setLiveMasteringStrength(.731);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   return __liveControl.liveMasteringStrength===.731&&__liveControl.audioTapMonitorChannel===channel&&__liveControl.audioTapMonitor===tap&&__liveControl.audioEventIntakeMonitor===intake;
  });assert.deepEqual(errors,[]);
  return {stages,live,...counts,scriptMs:(metric(after,'ScriptDuration')-metric(before,'ScriptDuration'))*1000,taskMs:(metric(after,'TaskDuration')-metric(before,'TaskDuration'))*1000,snapshots};
 }finally{await context.close()}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const isolated=[];for(const stages of [[],['telemetry']])isolated.push(await run(browser,stages));
  const live=[];for(let rep=0;rep<(process.argv.includes('--quick')?0:3);rep++)for(const stages of rep%2?[['telemetry'],[]]:[[],['telemetry']])live.push({rep,...await run(browser,stages,true)});
  const report={entry:manifest.entry,sha256:manifest.sha256,isolated,live,scope:process.argv.includes('--quick')?'Actual Chromium/React contract run: 40 paired diagnostic publications and owner stability; live gesture benchmark omitted.':'Actual Chromium/React, 40 controlled paired diagnostic publications; separate powered playfield gesture runs. ScriptDuration is main-thread JavaScript, not DSP throughput.'};
  fs.writeFileSync(out+(process.argv.includes('--quick')?'/browser-control-contract.json':'/browser-performance.json'),JSON.stringify(report,null,2)+'\n');
  for(const row of isolated){assert.equal(row.snapshots.intakeId,39);assert.equal(row.snapshots.tap,'Diagnostic 39');assert.equal(row.snapshots.ownerStable,true,'controls rerender normally without replacing telemetry ownership');if(row.stages.includes('telemetry')){assert(row.renders<=2,'telemetry must not rerender the instrument owner');assert.equal(row.snapshots.channels,2);assert.equal(row.snapshots.delivered,80)}else assert(row.renders>=35,'baseline exercises actual React updates');}
  const median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)],old=live.filter(r=>!r.stages.length),next=live.filter(r=>r.stages.length);
  const summary={isolated:isolated.map(r=>({stages:r.stages,renders:r.renders,restores:r.restores,scriptMs:r.scriptMs})),live:{baselineRenders:median(old.map(r=>r.renders)),currentRenders:median(next.map(r=>r.renders)),baselineScriptMs:median(old.map(r=>r.scriptMs)),currentScriptMs:median(next.map(r=>r.scriptMs))}};
  console.log(JSON.stringify(summary));console.log('PASS telemetry snapshots stay current without app rerenders; unchanged payloads and owner stability'+(process.argv.includes('--quick')?'':' with alternating native live measurements'));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
