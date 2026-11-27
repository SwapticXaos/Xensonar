'use strict';
// DJ-PERSIST-01 (real app): the Mixing Desk keeps routing, crossfader, curve, fade options, fader bases, mute and the
// Mix Scenes across a reload, and a saved song carries the desk mix (captured, validated to the song's material IDs,
// applied back). Songs with up to 5 extra decks validate (the desk plays up to 6).
// Usage: node tests/e2e/dj_persist.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:1600,height:1100}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{if(!sessionStorage.getItem('dj-persist-seeded')){localStorage.setItem('xensonar.djStage.expanded.v1','1');localStorage.removeItem('xensonar.djStage.desk.v1');sessionStorage.setItem('dj-persist-seeded','1')}}catch{}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
 const E=x=>p.evaluate(s=>window.__xenProbe.draw.evalInBundle(s),x);
 const id=await E(`(async()=>{const sr=48000,n=sr*8,L=new Float32Array(n);for(let i=0;i<n;i++)L[i]=0.2*Math.sin(i/7);
  const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'dj-persist-tone',origin:'probe',bpm:120,bars:4,enqueue:false});return d.entry.id})()`);
 // decks come from the Quick Rack, i.e. they belong to the working session (which also restores the desk on boot)
 await E(`__XenQuick.add({kind:'material',id:'${id}',name:'dj-persist-tone'})`);
 await E(`__NodalBallGrid.update({materialLoopActive:true,materialLoopId:'${id}',materialLoopVolume:0.7})`);
 await p.waitForSelector(`[data-xen-loop-ruler="${id}"].is-playing`,{timeout:15000});await p.waitForTimeout(400);
 const strip=`[data-xen-dj-deck="${id}"]`;
 await p.click(strip+' .xen-dj-bus-switch .is-a');
 await p.evaluate(()=>{const b=[...document.querySelectorAll('.xen-dj-xfade-btn')].find(x=>x.textContent.trim()==='Linear');b.click()});
 await p.click('.xen-dj-scenes-group button:has-text("Takt-Start")');
 await p.click('.xen-dj-segmented button:has-text("Zyklus")');
 await p.focus('.xen-dj-xfade-plate');for(let i=0;i<5;i++)await p.keyboard.press('ArrowLeft');
 await p.click(strip+' .xen-dj-cue >> nth=2');
 await p.click('.xen-dj-scene-btn >> nth=1');await p.waitForTimeout(900);
 const before=await E(`JSON.stringify(__XenDjStage.snapshot())`).then(JSON.parse);
 assert.equal(before.buses[id],'A');assert.equal(before.curve,'linear');assert.equal(before.quantizeFade,true);assert.equal(before.fadeUnit,'cycle');
 assert.ok(before.scenes[1]&&!before.scenes[0],'scene S2 stored');
 // reload
 await p.reload();await p.waitForTimeout(3500);
 const after=await E(`JSON.stringify(__XenDjStage.snapshot())`).then(JSON.parse);
 for(const k of ['curve','quantizeFade','fadeUnit','linkEqMorph'])assert.deepEqual(after[k],before[k],k+' survives the reload');
 assert.ok(Math.abs(after.crossfade-before.crossfade)<1e-9,'crossfader survives the reload');
 assert.equal(after.buses[id],'A','routing survives the reload');
 assert.ok(after.scenes[1]&&after.scenes[1].eqSnapshots&&Math.abs(after.scenes[1].crossfade-before.scenes[1].crossfade)<1e-9,'scene S2 survives the reload');
 assert.equal(after.scenes[0],null);
 assert.ok(Number.isFinite(after.cues[id][2])&&after.cues[id][2]===before.cues[id][2],'hot cue 3 survives the reload');
 assert.ok(Math.abs(after.baseVolumes[id]-before.baseVolumes[id])<1e-6,'fader base survives the reload');
 // song payload: capture → validate → restore (desk limited to the song's material IDs)
 const song=await E(`(()=>{const own=__XenDjStage.captureForSong(['${id}']);const other=__XenDjStage.captureForSong([]);
   const dirty={...own,buses:{...own.buses,'foreign':'B'},curve:'bogus',crossfade:7,scenes:[null,{...own.scenes[1],eqSnapshots:{'${id}':{a:[1,2],b:[]}}}]};
   const clean=__XenDjStage.cleanDesk(dirty,new Set(['${id}']));
   return JSON.stringify({own,other,clean})})()`).then(JSON.parse);
 assert.equal(song.own.buses[id],'A');assert.deepEqual(song.other.buses,{},'other songs do not carry this deck');
 assert.equal(song.clean.buses.foreign,undefined,'foreign IDs are dropped');assert.equal(song.clean.curve,'smooth');assert.equal(song.clean.crossfade,1);
 assert.deepEqual(song.clean.scenes[1].eqSnapshots,{},'broken EQ snapshots are dropped');
 await E(`__XenDjStage.restoreFromSong({...__XenDjStage.captureForSong(['${id}']),crossfade:0.9,curve:'cut',buses:{'${id}':'B'}},['${id}'])`);
 const r=await E(`JSON.stringify(__XenDjStage.snapshot())`).then(JSON.parse);
 assert.equal(r.crossfade,0.9);assert.equal(r.curve,'cut');assert.equal(r.buses[id],'B');
 // the song validator keeps the desk and accepts up to 5 extra decks
 const v=await E(`(()=>{const items=[{kind:'material',id:'m0'},{kind:'material',id:'m1'},{kind:'material',id:'m2'},{kind:'material',id:'m3'},{kind:'material',id:'m4'},{kind:'material',id:'m5'}];
   const raw={version:2,entries:items.map(e=>({...e,mix:{volume:1,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'}})),materialPlacement:{primaryId:'m0',secondaryIds:['m1','m2','m3','m4','m5'],primaryMuted:false,enabled:true},
    mixer:{bass:{volume:.1,pan:0,pitch:0,att:0},rootFollow:{volume:.2,pan:0,pitch:0,att:0},drum:{volume:.5,pan:0}},
    desk:{crossfade:.25,curve:'linear',buses:{m0:'A',m5:'B',zz:'A'},scenes:[]}};
   try{const out=__xenSongPerformanceSafe(raw,items);return JSON.stringify({ok:true,desk:out.desk,n:out.materialPlacement.secondaryIds.length})}catch(e){return JSON.stringify({ok:false,err:String(e.message||e)})}})()`).then(JSON.parse);
 assert.ok(v.ok,'5 extra decks validate: '+v.err);assert.equal(v.n,5);
 assert.deepEqual(v.desk.buses,{m0:'A',m5:'B'});assert.equal(v.desk.crossfade,.25);
 // the real song capture path carries the desk
 const cap=await E(`(()=>{try{const items=__XenQuick.snapshot().items.filter(e=>['material','bass','drum','rootFollow'].includes(e.kind));const out=__xenSongPerformanceCapture(items);return JSON.stringify({ok:true,buses:out.desk&&out.desk.buses})}catch(e){return JSON.stringify({ok:false,err:String(e.message||e)})}})()`).then(JSON.parse);
 assert.ok(cap.ok,'song capture: '+cap.err);assert.equal(cap.buses[id],'B','song capture carries the desk routing');
 assert.deepEqual(errs,[]);
 console.log('PASS DJ-PERSIST-01 desk mix + scenes survive a reload; song payload captured, validated (IDs, values, EQ), restored; 6-deck songs validate');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
