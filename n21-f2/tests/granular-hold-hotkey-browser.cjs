'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));
const boot='const kEe=CEe("root");iY.createRoot(kEe).render(u.jsx(P.StrictMode,{children:u.jsx(REe,{})}));';
let html=fs.readFileSync(manifest.entry,'utf8');
const call='MPe({resonanceInputActive:bl';assert(html.includes(call));
// Capture real app refs/actions in the test copy; keyboard events still travel
// through the production browser listener, hold action and release handler.
html=html.replace(call,'(window.__holdInput={context:Lr,tones:eo,setActive:xc,active:bl}),'+call);
html=html.replace(boot,'window.__holdAPI={play:dAe,state:__xenSampleHoldState,cache:Cee,generation:OP};'+boot);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage(),errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://xensonar.test/hotkeys.html');
  await page.waitForFunction(()=>!!window.__holdInput);
  await page.evaluate(async()=>{
   const ctx=new AudioContext();await ctx.resume();window.__holdInput.context.current=ctx;
   window.__holdInput.setActive(true);
  });
  await page.waitForFunction(()=>window.__holdInput.active);
  for(const key of ["'",'Equal']){
   await page.evaluate(async()=>{
    const ctx=window.__holdInput.context.current,api=window.__holdAPI;
    const buffer=ctx.createBuffer(1,Math.floor(.7*ctx.sampleRate),ctx.sampleRate),pcm=buffer.getChannelData(0);
    for(let i=0;i<pcm.length;i++)pcm[i]=.3*Math.sin(2*Math.PI*220*i/ctx.sampleRate);
    api.cache('hotkey',api.generation('hotkey'),{buffer,baseHz:220,tempoPitchLinked:true});
    const analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.connect(ctx.destination);
    const meter=()=>{const p=new Float32Array(2048);analyser.getFloatTimeDomainData(p);return Math.sqrt(p.reduce((s,x)=>s+x*x,0)/p.length)};
    window.__hotkeyResult={returned:0,meter};
    if(!await api.play({ctx,sampleId:'hotkey',baseFreq:220,volume:.2,output:analyser,activeScheduledTonesRef:window.__holdInput.tones,
     acquireVoice:()=>({release(){window.__hotkeyResult.returned++}})}))throw Error('hotkey fixture could not start sample');
   });
   await page.waitForTimeout(100);await page.keyboard.down(key);await page.waitForTimeout(1000);
   const held=await page.evaluate(()=>({rms:window.__hotkeyResult.meter(),active:window.__holdAPI.state(window.__holdInput.context.current).active.size}));
   assert(held.rms>.005);assert.equal(held.active,1);
   await page.keyboard.up(key);await page.waitForTimeout(120);
   const released=await page.evaluate(()=>({rms:window.__hotkeyResult.meter(),returned:window.__hotkeyResult.returned,tracked:window.__holdInput.tones.current.length}));
   assert.equal(released.rms,0);assert.equal(released.returned,1);assert.equal(released.tracked,0);
   rows.push({key,held,released});console.log('PASS real app hotkey',JSON.stringify(rows.at(-1)));
  }
  await page.evaluate(async()=>{window.__holdInput.setActive(false);await window.__holdInput.context.current.close()});
  assert.deepEqual(errors,[]);fs.writeFileSync('results/granular-hold/hotkeys.json',JSON.stringify({rows,errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
