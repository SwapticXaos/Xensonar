'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),probeFile=path.join(__dirname,'_merge_eq_gesture_probe.html');
const htmlFile=process.argv[2]||path.join(root,'dist/XenSonar_Standalone.html');
let html=fs.readFileSync(htmlFile,'utf8');
// Inspection hook exists only in this temporary test build, never in release.
const anchor='diagnostics:()=>({version,audioPriority:';
assert.equal(html.split(anchor).length,2,'EQ diagnostics inspection anchor missing');
html=html.replace(anchor,'diagnostics:()=>({activeGestures:[...activeGestures],version,audioPriority:');
const hook=`
 window.__mountEqGestureProbe=()=>{
  const el=document.createElement('div');el.id='merge-eq-gesture-probe';
  Object.assign(el.style,{position:'fixed',left:'20px',top:'20px',width:'720px',zIndex:'2147483647'});document.body.append(el);
  const r=iY.createRoot(el),key='material:close-probe';
  __XenEQ.set(key,{mode:'raster',a:Array.from({length:360},(_,i)=>Math.sin(i/40)*.35)});
  r.render(u.jsx(__XenEQPanel,{sourceKey:key,owner:'Close Probe',onClose:()=>r.unmount(),expanded:true,setExpanded:()=>{}}));
  return key;
 };
`;
html=html.replace(/(<script type="module" crossorigin>)([\s\S]*?)(<\/script>)/,(m,a,body,c)=>a+body+'\n'+hook+c);
fs.writeFileSync(probeFile,html);
(async()=>{
 const executablePath=process.env.XEN_CHROMIUM||path.resolve(root,'../../browser-runtime/chromium');
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file://'+probeFile,{timeout:85000});
  await page.waitForFunction('window.__XenBoot?.state().ready&&window.__mountEqGestureProbe',{timeout:65000});
  const key=await page.evaluate(()=>window.__mountEqGestureProbe());
  const slider=page.getByRole('slider',{name:'EQ A B Morph'});await slider.waitFor();
  const box=await slider.boundingBox();assert(box,'morph slider missing');
  await page.mouse.move(box.x+box.width*.4,box.y+box.height/2);await page.mouse.down();
  assert((await page.evaluate(()=>XenSonarEQ.diagnostics().activeGestures)).includes(key),'pointerdown did not start the actual gesture');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>XenSonarEQ.diagnostics().activeGestures);
  await page.mouse.up();
  assert(!after.includes(key),'closing the EQ during a held morph leaked its gesture ownership');
  assert.deepEqual(errors,[],'browser reported a runtime error');
  console.log('PASS real EQ close during held morph releases gesture ownership');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{fs.rmSync(probeFile,{force:true})});
