'use strict';
// LIVE-LANE-01 (real app): Loop-Rec records what is PLAYED LIVE on the Wave Starter and the Keyboard, whatever synth plays it.
// Before: every synth had to announce itself to Loop-Rec; Psy Lab connected straight to the master and its notes were missing from the take.
// Now every live voice enters its lane through ONE lane input (__XenLiveLane.input = __XenLoopRec.route): the instrument EQ of the lane and the Loop-Rec tap.
// The synth families are read from the sound menu itself (its rubrics: Classic, Nodal, Entrophon, Psy Lab, Samples, ... and any family added later),
// one sound of each family is played on the Keyboard and the take must carry it. A take without playing stays silent (drums, bass, material loops are not recorded).
// Usage: node tests/e2e/looprec_live_lanes.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const lanePrm=lane=>lane==='Keyboard'?'keyboardHoldSoundPreset':'waveStarterHoldSoundPreset';
 /* the rubrics of the sound menu and the first sound of each (read from the real menu; "Latest" is a list of recent sounds, not a family) */
 const rubrics=async lane=>{await p.getByRole('button',{name:lane+' sound'}).first().click();await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const box=document.querySelector('[role=listbox]');const out=[];for(const g of box?.children||[]){const label=(g.firstElementChild?.textContent||'').trim(),o=g.querySelector('[role=option]');if(o)out.push({label,option:o.textContent.trim()})}return out});
  await p.getByRole('button',{name:lane+' sound'}).first().click();await p.waitForTimeout(300);return r.filter(x=>!/^Latest/i.test(x.label))};
 const choose=async(lane,rubric)=>{await p.getByRole('button',{name:lane+' sound'}).first().click();await p.waitForTimeout(300);
  await p.evaluate(label=>{const g=[...document.querySelector('[role=listbox]').children].find(x=>(x.firstElementChild?.textContent||'').trim()===label);g.querySelector('[role=option]').click()},rubric);
  await p.waitForTimeout(1200);await p.evaluate(()=>document.activeElement?.blur?.());return E(`__NodalBallGrid.params().${lanePrm(lane)}`)};
 const phase=()=>E('__XenLoopRec.snapshot().phase');
 const takes=()=>E('JSON.stringify(bs().entries.filter(e=>e.sessionTake).map(e=>e.id))').then(JSON.parse);
 /* one take: Loop-Rec on, play, Loop-Rec off at the next bar line; the peak of the stored take */
 const take=async play=>{for(let i=0;i<100&&!['idle','saved','failed'].includes(await phase());i++)await p.waitForTimeout(100);const before=await takes();await E('__XenLoopRec.toggle()');
  for(let i=0;i<80&&await phase()!=='recording';i++)await p.waitForTimeout(100);assert.equal(await phase(),'recording','Loop-Rec records (phase '+await phase()+': '+await E('__XenLoopRec.snapshot().message')+' · rows so far: '+rows.join(' | ')+')');
  await play();await E('__XenLoopRec.toggle()');
  for(let i=0;i<120;i++){if((await takes()).length>before.length)break;await p.waitForTimeout(100)}
  const id=(await takes()).find(x=>!before.includes(x));assert(id,'a take was stored');
  return p.evaluate(async id=>{const blob=window.__xenProbe.draw.evalInBundle(`__materialAudioBlob(bs().entries.find(x=>x.id===${JSON.stringify(id)}),'test')`);
   const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(await blob.arrayBuffer());let pk=0;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a}}return pk},id)};
 const holdKey=async()=>{await p.keyboard.down('q');await p.waitForTimeout(1600);await p.keyboard.up('q');await p.waitForTimeout(400)};
 const enter=async()=>{for(let i=0;i<3;i++){await p.keyboard.down('Enter');await p.waitForTimeout(350);await p.keyboard.up('Enter');await p.waitForTimeout(250)}};
 const rows=[];
 const silent=await take(async()=>{await p.waitForTimeout(1800)});
 assert(silent<1e-4,'without playing, the take is silent (drums, bass and material loops are not recorded): '+silent);
 const list=await rubrics('Keyboard');const names=list.map(x=>x.label);
 for(const must of ['Classic','Entrophon','Psy Lab'])assert(names.includes(must),'the sound menu offers '+must+': '+names.join(', '));
 for(const r of list){const id=await choose('Keyboard',r.label);const pk=await take(holdKey);rows.push(r.label+' ('+r.option+') '+pk.toFixed(3));
  assert(pk>.003,'Keyboard · '+r.label+' ('+id+'): the take carries the sound (peak '+pk+')')}
 // and the other live lane: Psy Lab on the Wave Starter (Enter)
 {const id=await choose('Wave Starter','Psy Lab');const pk=await take(enter);rows.push('Wave Starter Psy Lab '+pk.toFixed(3));assert(pk>.003,'Wave Starter · Psy Lab ('+id+'): the take carries the sound (peak '+pk+')')}
 if(errors.length)console.log('ERRORS',JSON.stringify(errors).slice(0,800));assert.deepEqual(errors,[]);
 console.log('PASS LIVE-LANE-01 Loop-Rec records every synth family of the sound menu: '+rows.join(' · ')+' · silent take '+silent.toExponential(1));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
