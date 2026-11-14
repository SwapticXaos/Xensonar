'use strict';
/* Coverage recorder for existing Playwright tests (analysis only).
 *   XEN_COV_DIR=dist/coverage NODE_OPTIONS="--require $PWD/tools/slim/cov_preload.cjs" ./tools/run_e2e.sh
 * Every Chromium page gets V8 precise coverage (function granularity). Before a page navigates away or closes, the result is
 * merged into one JSON file per test process. Scripts are identified by their source length (see cov_report.cjs). */
const fs=require('fs'),path=require('path');
const DIR=process.env.XEN_COV_DIR;if(!DIR)return;
let pw;try{pw=require('playwright')}catch{return}
fs.mkdirSync(DIR,{recursive:true});
const FILE=path.join(DIR,'cov_'+process.pid+'.json');
const acc=new Map(); // scriptLength|kind -> Map("start:end" -> covered)
function merge(result){
 for(const s of result){if(!s.functions.length)continue;const top=s.functions[0].ranges[0];const key=(s.url?'doc':'eval')+':'+top.endOffset;
  let m=acc.get(key);if(!m)acc.set(key,m=new Map());
  for(const f of s.functions){const r=f.ranges[0],k=r.startOffset+':'+r.endOffset;if(r.count>0)m.set(k,1);else if(!m.has(k))m.set(k,0)}}
}
function flush(){const o={};for(const [k,m] of acc)o[k]=[...m].map(([r,c])=>r+':'+c);try{fs.writeFileSync(FILE,JSON.stringify(o))}catch{}}
async function take(page){const cdp=page.__xenCov;if(!cdp)return;try{const r=await cdp.send('Profiler.takePreciseCoverage');merge(r.result);flush()}catch{}}
async function setup(page){
 try{const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.startPreciseCoverage',{callCount:false,detailed:false});page.__xenCov=cdp;
  for(const name of ['goto','reload','close']){const orig=page[name].bind(page);page[name]=async(...a)=>{await take(page);return orig(...a)}}
 }catch{}
}
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...a)=>{
 const browser=await launch(...a);const pages=new Set();
 const wrapContext=ctx=>{const np=ctx.newPage.bind(ctx);ctx.newPage=async(...b)=>{const p=await np(...b);await setup(p);pages.add(p);return p};
  const cc=ctx.close.bind(ctx);ctx.close=async(...b)=>{for(const p of ctx.pages())await take(p);return cc(...b)};return ctx};
 const nc=browser.newContext.bind(browser);browser.newContext=async(...b)=>wrapContext(await nc(...b));
 browser.newPage=async(...b)=>{const ctx=await browser.newContext(...b);return ctx.newPage()};
 const bc=browser.close.bind(browser);browser.close=async(...b)=>{for(const p of pages){if(!p.isClosed())await take(p)}return bc(...b)};
 return browser;
};
