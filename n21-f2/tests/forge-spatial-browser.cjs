'use strict';
const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),manifest=require('../source-manifest.json');
const entry=process.env.XEN_BASELINE_HTML||manifest.entry;
const html=fs.readFileSync(entry,'utf8').replace('const kEe=CEe("root");',`window.__sp=()=>({state:()=>pe.getState(),nav:__ForgeNavigatorSample,materials:bs,ready:()=>__f333CachedPreviewReady(pe.getState()),commit:()=>__f334CommitCarrier({name:'Spatial audit figure',bars:1,beatsPerBar:4,bpm:240,carrier:{version:'melodic-carrier-v1',durationBeats:4,tracks:[{id:'t',enabled:true}],notes:[{id:'n',trackId:'t',startBeat:0,durationBeats:4,pitchHz:[220],gainCurve:[.6]}]}},{neutral:true})});const kEe=CEe("root");`);
const out=process.env.XEN_SPATIAL_RESULTS||'results/forge-spatial';fs.mkdirSync(out,{recursive:true});
const rect=value=>({x:value.x,y:value.y,width:value.width,height:value.height});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={entry,sha256:manifest.sha256,errors:[],geometry:[],checks:[]};
 try{
  for(const width of [1490,720]){
   const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(60000);
   page.on('pageerror',error=>report.errors.push(error.message));
   await page.route('https://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
   await page.goto('https://xensonar.test/spatial');
   await page.getByRole('button',{name:'II. MATERIAL FORGE',exact:true}).click();
   await page.getByRole('button',{name:/SpectralForge/}).click();
   await page.locator('[data-forge-shared-listening-picker]').selectOption('bert');
   const nav=page.locator('[data-forge-navigator="full-drawing"]'),canvas=nav.locator('canvas');
   await nav.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('[data-forge-navigator] canvas')?.width>0);
   const geometry=()=>canvas.evaluate(c=>c.__navigatorViewport);
   const hover=async(ratio,alt=false)=>{
    const box=await nav.boundingBox();if(alt)await page.keyboard.down('Alt');
    await page.mouse.move(box.x+box.width*ratio,box.y+box.height/2);
    const cursor=await nav.evaluate(e=>getComputedStyle(e).cursor);if(alt)await page.keyboard.up('Alt');return cursor;
   };
   assert.equal(await hover(.001),'ew-resize','left handle must advertise resizing');
   assert.equal(await hover(.999),'ew-resize','right handle must advertise resizing');
   assert.equal(await hover(.5),'crosshair');assert.equal(await hover(.5,true),'grab');
   const drag=async(from,to,alt=false)=>{
    const box=await nav.boundingBox();if(alt)await page.keyboard.down('Alt');
    await page.mouse.move(box.x+box.width*from,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width*to,box.y+box.height/2,{steps:10});await page.mouse.up();
    if(alt)await page.keyboard.up('Alt');await page.waitForTimeout(100);
   };
   const whole=await geometry();await drag(.999,.67);
   const right=await geometry();assert.ok(right.widthPx<whole.widthPx*.8,'right handle changes zoom');
   assert.equal(await page.evaluate(()=>__sp().nav.current()),null,'resize does not create a sample selection');
   await drag(right.leftPx/(await nav.boundingBox()).width+.002,.12);
   const left=await geometry();assert.ok(left.leftPx>right.leftPx+10,'left handle changes start');
   assert.ok(Math.abs(left.rightPx-right.rightPx)<3,'left resize retains right edge');
   const box=await nav.boundingBox(),middle=(left.leftPx+left.widthPx/2)/box.width;
   await drag(middle,middle+.08,true);assert.equal(await page.evaluate(()=>__sp().nav.current()),null);
   const moved=await geometry();assert.ok(moved.leftPx>left.leftPx+5,'Alt drag still moves viewport');
   await page.locator('[data-forge-fit-drawing]').click();await page.waitForTimeout(100);
   await drag(.2,.6);const selection=await page.evaluate(()=>__sp().nav.current());assert.ok(selection&&Math.abs(selection.start-.2)<.01&&Math.abs(selection.end-.6)<.01);
   const save=page.locator('[data-forge-navigator-save-sample]'),root=page.locator('[data-f318-export-target="root"]');
   await save.scrollIntoViewIfNeeded();
   const sr=await save.boundingBox(),rr=await root.boundingBox();
   assert.ok(sr.y+sr.height+2<=rr.y,'Save as Sample must be north of Root Follow, with a gap');
   assert.ok(sr.height>=22&&sr.height<=30,'retain compact button height');
   for(const button of [save,root]){
    const hit=await button.evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));});
    assert.equal(hit,true,'each action must receive its own pointer click');
   }
   assert.equal(await save.count(),1,'one save owner');
   report.geometry.push({width,save:rect(sr),root:rect(rr),whole,right,left,moved});
   await page.locator('[data-forge-play-rack]').screenshot({path:out+'/rack-'+width+'.png'});
   if(width===1490){
    const input=page.locator('[data-material-intake-gateway] input[type=file]');
    await input.setInputFiles({name:'metadata.ogg',mimeType:'audio/ogg',buffer:fs.readFileSync('tests/fixtures/integrated-patches/tone-220.ogg')});
    const metadata=page.locator('[data-forge-material-metadata]');await metadata.waitFor();
    assert.equal(await metadata.locator('select').count(),0,'destination roles are not source categories');
    // Loading old role values must not rewrite the project; new loop exports
    // independently follow the explicit destination instead of that old role.
    await page.evaluate(()=>__sp().state().updateMaterialExport({role:'particleExciter'}));
    await metadata.getByRole('spinbutton',{name:'Number of Bars',exact:true}).fill('3');
    await metadata.getByRole('spinbutton',{name:'Material Frequency Anchor (Hz)',exact:true}).fill('110');
    await metadata.locator('summary').click();await metadata.getByRole('spinbutton',{name:'Melodic Loop Bar Segments',exact:true}).fill('7');
    assert.equal(await page.evaluate(()=>__sp().state().materialExport.role),'particleExciter','old project role remains intact');
    const intake=page.locator('[data-material-intake-gateway]');
    await intake.getByRole('button',{name:'Use as Root Follow Loop',exact:true}).click();
    await page.waitForFunction(()=>__sp().materials().entries.some(e=>e.renderMode==='raw-root-follow-loop-selection'));
    const raw=await page.evaluate(()=>{const e=__sp().materials().entries.find(e=>e.renderMode==='raw-root-follow-loop-selection');return {id:e.id,bars:e.bars,rootHz:e.rootHz,role:e.role,guideSegments:e.guideSegments,rootFollowPreferred:e.rootFollowPreferred}});
    assert.deepEqual({bars:raw.bars,rootHz:raw.rootHz,role:raw.role,guideSegments:raw.guideSegments,rootFollowPreferred:raw.rootFollowPreferred},{bars:3,rootHz:110,role:'loop',guideSegments:7,rootFollowPreferred:true});
    await intake.getByRole('button',{name:'Send raw as a loop to Material Track (Main Room)',exact:true}).click();
    await page.waitForFunction(()=>__sp().materials().entries.some(e=>e.renderMode==='raw-loop-selection'));
    const track=await page.evaluate(()=>{const e=__sp().materials().entries.find(e=>e.renderMode==='raw-loop-selection');return {bars:e.bars,rootHz:e.rootHz,role:e.role}});
    assert.deepEqual(track,{bars:3,rootHz:110,role:'loop'});
    await page.evaluate(()=>__sp().commit());await page.waitForFunction(()=>__sp().ready());
    await root.click();await page.waitForFunction(()=>__sp().materials().entries.some(e=>e.rootFollowPreferred&&e.renderMode!=='raw-root-follow-loop-selection'));
    const rendered=await page.evaluate(()=>{const e=__sp().materials().entries.find(e=>e.rootFollowPreferred&&e.renderMode!=='raw-root-follow-loop-selection');return {rootHz:e.rootHz,role:e.role,bars:e.bars,mode:e.renderMode}});
    assert.equal(rendered.rootHz,110);assert.equal(rendered.role,'loop');
    const restored=await page.evaluate(()=>{const s=__sp().state(),saved=s.createProjectSnapshot();s.updateMaterialExport({rootHz:220});s.loadProjectSnapshot(saved);const project=__sp().state().materialExport.rootHz;__sp().state().pushUndo();__sp().state().updateMaterialExport({rootHz:330});__sp().state().undo();const undo=__sp().state().materialExport.rootHz;__sp().state().redo();const redo=__sp().state().materialExport.rootHz;__sp().state().undo();return {project,undo,redo}});
    assert.deepEqual(restored,{project:110,undo:110,redo:330});report.persistence=restored;
    await metadata.getByRole('spinbutton',{name:'Material Frequency Anchor (Hz)',exact:true}).fill('');
    assert.equal(await page.evaluate(()=>__sp().state().materialExport.rootHz),null,'empty anchor restores automatic/default contract');
    report.metadata={raw,track,rendered};
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.checks=['1490/720 px: separate north-positioned Save/Root actions with independent hit targets','Navigator: both resize cursors and real edge gestures, middle selection, Alt move and Whole Drawing reset','raw metadata: no destination Role selector, legacy project role retained','110 Hz anchor and bar count survive actual raw Material/Root and rendered Root transfers; new loops use the loop contract','bar segments remain optional editor guides; empty anchor retains fallback','frequency anchor survives full project snapshot restore and Undo/Redo'];
  fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Forge geometry, navigator cursor/gesture contracts and actual metadata transfers');
 }catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({...report,error:String(error.stack)},null,2)+'\n');throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
