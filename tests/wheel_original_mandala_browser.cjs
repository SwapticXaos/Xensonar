const fs=require('fs'),path=require('path'),assert=require('assert'),root=path.resolve(__dirname,'..'),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{const browser=await chromium.launch({...(process.env.XEN_CHROMIUM?{executablePath:process.env.XEN_CHROMIUM}:{}),headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('file://'+root+'/dist/XenSonar_Standalone.html');await page.waitForTimeout(700);
 const current=page.locator('[data-xen-wheel] svg');await current.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
 const geometry=svg=>[...svg.querySelectorAll('ellipse,circle,polygon')].map(el=>({tag:el.tagName,attrs:Object.fromEntries(['cx','cy','rx','ry','r','points','transform','fill','stroke','stroke-width'].map(k=>[k,(el.getAttribute(k)||'').replace(/\s/g,'')]))}));
 const a=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/wheel_restore_p1_geometry.json'),'utf8')),b=await current.evaluate(geometry);assert.deepStrictEqual(b,a,'original SVG geometry and resting colors');
 await page.evaluate(()=>window.__stableMandala=document.querySelector('[data-xen-wheel] svg'));
 await page.getByRole('button',{name:'Roll a Random Meta-Preset',exact:true}).count().then(count=>assert.equal(count,0));
 const center=page.locator('[data-xen-wheel] svg > g').last().locator(':scope > g').last();await center.click();await page.waitForTimeout(1200);
 assert(await page.evaluate(()=>window.__stableMandala===document.querySelector('[data-xen-wheel] svg')),'SVG must not be remounted');
 assert(await page.locator('[data-xen-wheel] svg circle').evaluateAll(els=>els.some(e=>e.style.animation.includes('mandalaCenterPulse'))),'original center pulse');
 
 await page.waitForFunction(()=>!!document.querySelector('[data-xen-wheel] input[aria-label="Discovery name"]')||!![...document.querySelectorAll('[data-xen-wheel] button')].find(e=>e.textContent==='↶ Return'),{},{timeout:20000});
 assert.deepStrictEqual(errors,[]);console.log('PASS exact original wheel geometry/colors; original pulse; fixed SVG nodes during roulette; no startup clone/chase');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
