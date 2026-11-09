'use strict';
/* Real whole-HTML integration gate, kept separate from Node/Canvas/VM gates.
 * Requires Playwright + installed Chromium. NOT executed in the P37 host where
 * Chromium could not be downloaded. Never present its existence as a pass. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'xen-p37-browser-'));
const html=fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'),'utf8').replace(/(<script type="module" crossorigin>)([\s\S]*?)(<\/script>)/,(_m,start,body,end)=>start+body+'\nwindow.__P37={pe,api:__XenStampFigureAudition,atlas:__XenStampAtlas2026,raw:__PureDieter,xt};\n'+end);
fs.writeFileSync(path.join(temp,'test.html'),html);
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1360,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.join(temp,'test.html'));await page.waitForFunction(()=>window.__XenBoot?.state().ready===true,undefined,{timeout:65000});
  const result=await page.evaluate(async()=>{
   const {pe,api,atlas,raw,xt}=window.__P37,state=pe.getState(),drawing=state.spectralData,source=state.sourceAsset;
   const p=(await atlas.loadVariants([])).find(p=>p.name==='Rhythm Islands'),player=api.create(),rows=[];
   try{
    for(const machineId of ['raw-darkpsy-oscillator','harmonic-xplore-direct-carrier','spektral-synthese-body','branch-a-line-traffic','branch-b573-synth-window','branch-c-interval-body','emilia-nodal-carrier','fractalia-self-carrier']){
     pe.getState().setCarrierIntegralSelection({machineId,source:'user'});
     const start=performance.now();if(!await player.play(p))throw Error('Preview cancelled: '+machineId);
     const cold=performance.now()-start,warmStart=performance.now();if(!await player.play(p))throw Error('Warm preview cancelled');
     rows.push({machineId,coldMs:cold,warmMs:performance.now()-warmStart});
     if(pe.getState().spectralData!==drawing||pe.getState().sourceAsset!==source)throw Error('Audition mutated the figure/source');
    }
    pe.getState().setCarrierIntegralSelection({machineId:'raw-darkpsy-oscillator',source:'user'});
    const grid=api.miniature(p.stamp),primary=raw.render({grid,durationSec:.35,mode:'additive',mix:pe.getState().waveformMix,context:xt.getContext()});
    await Promise.all([primary,player.play(p)]);
    return {rows,cache:player.diagnostics(),drawingPreserved:true};
   }finally{player.dispose();}
  });
  assert.equal(errors.length,0,errors.join('\n'));assert(result.drawingPreserved);console.log('P37 WHOLE BROWSER PASS',JSON.stringify(result));
 }finally{await browser?.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
