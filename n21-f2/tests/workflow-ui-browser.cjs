'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{entry}=require('../source-manifest.json');
const source=fs.readFileSync(entry,'utf8');
const expose=`window.__workflow={get api(){return{session:EQ,quick:__XenQuick,materials:bs,register:$T,root:id=>ri('rootFollowBankMembership',{entryId:id,enabled:true}),wav:lg,customList:__mlCustomList,nodalLibrary:__XenNodalLibrary,transport:b9e,stop:hS}}};`;
const live='window.__workflowLive={params:()=>Tt.current,cursor:()=>xn.current.cursorY,commit:mi,lines:Xn};';
assert.equal(source.split('const{setParticleSystem:Nr').length,2);
const html=source.replace('const kEe=CEe("root");',expose+'const kEe=CEe("root");')
 .replace('const{setParticleSystem:Nr',live+'const{setParticleSystem:Nr')
 .replace('const params=p?.nParamsUI??{},waveId=','window.__panel=p;const params=p?.nParamsUI??{},waveId=');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 fs.mkdirSync('results/workflow-integrity',{recursive:true});
 const report={errors:[],checks:[]};let p;
 try{
  p=await browser.newPage({viewport:{width:1740,height:1000}});p.setDefaultTimeout(20000);p.on('pageerror',error=>report.errors.push(error.message));
  await p.route('https://xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await p.goto('https://xensonar.test/workflow');await p.waitForFunction(()=>!!window.__workflowLive);
  await p.evaluate(()=>__panel.updateNParams({gridOn:true,lockCursorToGrid:true,quantizeOn:true,gridTuning:'19edo',manualGridMutedSteps:Array(19).fill(true),manualGridStepOffsets:Array(19).fill(17)}));
  const grid=p.locator('[data-quick-mute="grid"]');await grid.click();
  const bypass=await p.evaluate(()=>{const r=__workflowLive;r.commit(123.7,{syncHud:false,previewWave:false});return{cursor:r.cursor(),lines:r.lines().length,authored:JSON.parse(JSON.stringify(r.params()))};});
  assert(Math.abs(bypass.cursor-123.7)<.001);assert.equal(bypass.lines,0);assert.equal(bypass.authored.lockCursorToGrid,true);assert.equal(bypass.authored.quantizeOn,true);assert.equal(bypass.authored.gridTuning,'19edo');
  await grid.click();assert((await p.evaluate(()=>__workflowLive.lines().length))>0);
  report.checks.push('actual master switch bypasses the production Wave Starter cursor handler and grid lines without rewriting stored settings');

  // Register valid audio through the real material library, then use the actual
  // keyboard dispatcher and quick-access adapters, including a bank switch.
  await p.evaluate(()=>{
   const a=__workflow.api,buffer=new AudioBuffer({numberOfChannels:1,length:2400,sampleRate:24000});buffer.getChannelData(0).set(Float32Array.from({length:2400},(_,i)=>.04*Math.sin(i*.07)));const wav=a.wav(buffer);
   for(const [id,root] of [['wf-material',false],['wf-root',true]]){
    a.register({stableId:id,name:id,role:'loop',bpm:120,bars:1,loopStartSec:0,loopEndSec:.1,durationSec:.1,rootHz:220,sourceVersion:'workflow-test',renderMode:root?'direct-root-follow-loop-upload':'microtonal-logic',rootFollowPreferred:root},wav);
    if(root)a.root(id);
    a.quick.add({kind:root?'rootFollow':'material',id,name:id});
   }
   __panel.updateNParams({resonanceHotkeyMode:'material',manualGridMutedSteps:[],manualGridStepOffsets:[],lockCursorToGrid:false});
  });
  await p.waitForFunction(()=>__workflow.api.quick.snapshot().hotkeys.material.includes('wf-material')&&__workflow.api.quick.snapshot().hotkeys.rootFollow.includes('wf-root'));
  const material=p.locator('[data-xen-shortcut-id="wf-material"]'),root=p.locator('[data-xen-shortcut-id="wf-root"]');
  const materialKey=(await material.locator('.xen-quick-hotkey').textContent()).trim(),rootKey=(await root.locator('.xen-quick-hotkey').textContent()).trim();
  assert.equal(await material.locator('.is-active').count(),1);assert.equal(await root.locator('.is-active').count(),0);
  const icon=await material.evaluate(element=>{const first=element.firstElementChild,b=first.getBoundingClientRect();element.querySelector('.xen-quick-hotkey').style.display='none';const hidden=first.getBoundingClientRect();element.querySelector('.xen-quick-hotkey').style.display='';return{before:b.x,after:hidden.x};});assert.equal(icon.before,icon.after,'the new letter must not move the icon');
  await p.evaluate(()=>{window.__hotkeyFlashes=[];new MutationObserver(records=>{for(const record of records){const e=record.target;if(e.matches?.('.xen-quick-tile.is-key-pulse'))__hotkeyFlashes.push(e.dataset.xenShortcutId);}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});});
  // Power enables the existing live-input scope; no test-only keyboard path.
  await p.getByRole('button',{name:'Power',exact:true}).click();await p.locator('body').click({position:{x:900,y:95}});
  await p.keyboard.press(materialKey.toLowerCase());await p.waitForFunction(()=>__panel.nParamsUI.materialLoopId==='wf-material');
  await p.waitForFunction(()=>__hotkeyFlashes.includes('wf-material'));
  await p.keyboard.press('Backquote');await p.waitForFunction(()=>__panel.nParamsUI.resonanceHotkeyMode==='root-follow');
  assert.equal(await material.locator('.is-active').count(),0);assert.equal(await root.locator('.is-active').count(),1);
  await p.keyboard.press(rootKey.toLowerCase());await p.waitForFunction(()=>__panel.nParamsUI.rootFollowLoopId==='wf-root');await p.waitForFunction(()=>__hotkeyFlashes.includes('wf-root'));
  await p.waitForTimeout(300);assert.equal(await p.locator('.xen-quick-tile.is-key-pulse').count(),0);
  report.hotkeys={materialKey,rootKey,flashes:await p.evaluate(()=>__hotkeyFlashes)};
  assert.deepEqual(report.hotkeys.flashes,['wf-material','wf-root']);report.checks.push('canonical bank hotkeys, Backquote switching, green/grey letters, stable icons and one transient green tile flash per real keypress');
  await p.screenshot({path:'results/workflow-integrity/quick-access.png'});
  await p.evaluate(()=>__panel.updateNParams({materialLoopActive:false,rootFollowLoopActive:false,drumActive:false,bassActive:false,quantizeOn:false}));

  await p.getByRole('button',{name:'III. NODAL INSTALLATION',exact:true}).click();
  const name=p.getByRole('textbox',{name:'Instrument name',exact:true});assert.equal(await name.count(),1);
  assert.equal(await name.locator('xpath=ancestor::div[contains(@class,"nd-export")]').count(),1);
  await name.fill('Workflow Named Body');await p.getByRole('button',{name:'Save Instrument',exact:true}).click();
  assert(await p.evaluate(()=>__workflow.api.nodalLibrary.list().some(entry=>entry.instrument.name==='Workflow Named Body')));
  assert.equal(await p.locator('.nd-current-name strong').textContent(),'Workflow Named Body');
  report.checks.push('one Nodal naming input beside Save Instrument, actual saved name, read-only name above');
  await p.getByRole('button',{name:'Send to Melodic Loop',exact:true}).click();await p.getByRole('button',{name:'Open Loop ↗',exact:true}).click();
  await p.locator('[data-ml-instrument-card]').first().waitFor();await p.getByRole('button',{name:'Load into Editor',exact:true}).click();
  assert.equal(await p.locator('[data-ml-transport]').count(),2);
  const primary=p.locator('[data-ml-transport="primary"]'),editor=p.locator('[data-ml-transport="editor"]');
  const primaryDrums=primary.getByRole('button',{name:'+ Drums',exact:true}),editorDrums=editor.getByRole('button',{name:'+ Drums',exact:true});
  const drumsBefore=await primaryDrums.getAttribute('aria-pressed');await editorDrums.click();assert.notEqual(await primaryDrums.getAttribute('aria-pressed'),drumsBefore);assert.equal(await primaryDrums.getAttribute('aria-pressed'),await editorDrums.getAttribute('aria-pressed'));
  await primaryDrums.click();assert.equal(await editorDrums.getAttribute('aria-pressed'),drumsBefore);
  for(const viewport of [{width:1740,height:1000},{width:1100,height:900},{width:760,height:900}]){
   await p.setViewportSize(viewport);
   const geometry=await p.locator('[data-ml-instrument-card]').first().evaluate(card=>{const volume=card.querySelector('.melodic-track-volume input'),pan=card.querySelector('.melodic-track-pan input'),v=volume.getBoundingClientRect(),r=pan.getBoundingClientRect();return{width:v.width,panWidth:r.width,x:v.x,panX:r.x,background:getComputedStyle(volume).backgroundImage,color:getComputedStyle(volume).color,source:volume.parentElement.style.getPropertyValue('--xen-instrument-color'),overflow:document.documentElement.scrollWidth>innerWidth+1};});
   assert.equal(geometry.background,'none');assert.equal(geometry.width,geometry.panWidth);assert.equal(geometry.x,geometry.panX);assert(!geometry.overflow);report.checks.push({viewport,geometry});
  }
  await p.setViewportSize({width:1600,height:1000});
  const noteBefore=await p.evaluate(()=>JSON.stringify(__workflow.api.session().loopComposer.notes));
  await p.getByRole('button',{name:'Save as Custom Synth Instrument',exact:true}).click();await p.getByRole('textbox',{name:'Custom instrument name',exact:true}).fill('Workflow Reusable');await p.getByRole('button',{name:'Save Instrument',exact:true}).click();
  assert.equal(await p.evaluate(()=>JSON.stringify(__workflow.api.session().loopComposer.notes)),noteBefore);
  const custom=await p.evaluate(()=>__workflow.api.customList().find(entry=>entry.instrument.name==='Workflow Reusable'));assert(custom);
  const selectedId=await p.evaluate(()=>__workflow.api.session().loopComposer.selectedTrackId),card=p.locator('[data-ml-instrument-card="'+selectedId+'"]');
  await card.locator('[aria-haspopup="listbox"]').click();await p.getByRole('option',{name:/Workflow Reusable/}).click();
  await p.waitForFunction(({id,custom})=>__workflow.api.session().loopComposer.tracks.find(track=>track.id===id).instrumentPreset===custom,{id:selectedId,custom:custom.id});
  await p.evaluate(()=>__workflow.api.stop());
  // Source selection may close the editor; reopen its one shared controller.
  if(await p.getByRole('button',{name:'Load into Editor',exact:true}).count())await p.getByRole('button',{name:'Load into Editor',exact:true}).click();
  await editor.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).click();await primary.getByRole('button',{name:'Loop stoppen',exact:true}).waitFor();
  const owner=await p.evaluate(()=>{const playing=__workflow.api.transport();window.__workflowOwner=playing;return{token:playing.token,start:playing.startTime};});
  assert.equal(await editor.getByRole('button',{name:'Loop stoppen',exact:true}).count(),1);await primary.getByRole('button',{name:'Loop stoppen',exact:true}).click();await editor.getByRole('button',{name:'Aktive Instrumente als Loop abspielen',exact:true}).waitFor();
  report.transport={owner,oneOwner:true,editorStartsPrimaryStops:true};report.checks.push('real custom save and library selection; duplicate transport views share one playing owner and stop state');
  await p.screenshot({path:'results/workflow-integrity/editor.png'});
  assert.deepEqual(report.errors,[]);fs.writeFileSync('results/workflow-integrity/ui-browser.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS workflow browser: global grid, real hotkeys/flash, thin aligned controls, Nodal naming, custom save/select and one shared transport');
 }catch(error){console.error('Browser errors:',report.errors);if(p){await p.screenshot({path:'/tmp/xen-workflow-ui-failure.png',fullPage:true});console.log((await p.locator('body').innerText()).slice(-9000));}throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
