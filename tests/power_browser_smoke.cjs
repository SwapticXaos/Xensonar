'use strict';
// Real Chromium + full standalone. Requires Playwright and a Chromium binary.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),out=process.env.XEN_BROWSER_EVIDENCE_DIR;
const html=fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'));
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader']});
  for(const width of [1360,700]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',error=>errors.push(error.stack));
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
   const offline=page.getByText('[ OFFLINE - ENABLE FOR AUDIO & DRIFT ]',{exact:true});await offline.waitFor({state:'visible'});
   if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`${width}-before-power.png`)});}
   const power=()=>page.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/});
   for(let cycle=0;cycle<3;cycle++){
    await power().click();await page.waitForTimeout(1200);
    assert.deepEqual(errors,[],`Power ON at ${width}px must not throw`);
    assert((await page.locator('body').innerText()).length>1000,'workspace must remain mounted');
    await offline.waitFor({state:'hidden'});await page.locator('canvas[data-xen-play-area]').waitFor({state:'visible'});
    if(out&&cycle===0)await page.screenshot({path:path.join(out,`${width}-after-power.png`)});
    await power().click();await offline.waitFor({state:'visible'});assert.deepEqual(errors,[]);
   }
   console.log(`PASS full standalone Power ON/OFF ×3 at ${width}px, workspace remains mounted, no page errors`);await page.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
