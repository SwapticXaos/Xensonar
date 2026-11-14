'use strict';
/* CPU profile of the shipped page (analysis only): where does main-thread time go at start and while playing?
 *   node tools/slim/profile.cjs [index.html] start|play [seconds]
 * Prints self time by function with source file (mapped through tools/slim/page.cjs) and by source file. */
const path=require('path'),fs=require('fs');const {chromium}=require('playwright');
const {out,blocks,fileAt}=require('./page.cjs').load();
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));const mode=process.argv[3]||'start';const secs=Number(process.argv[4]||20);
const lineStarts=[0];for(let i=0;i<out.length;i++)if(out.charCodeAt(i)===10)lineStarts.push(i+1);
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
 const c=await p.context().newCDPSession(p);await c.send('Profiler.enable');await c.send('Profiler.setSamplingInterval',{interval:200});
 const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 let prof;
 if(mode==='start'){await c.send('Profiler.start');const t0=Date.now();await p.goto('file://'+html);await p.getByRole('button',{name:'Power'}).waitFor();await p.waitForTimeout(2500);prof=(await c.send('Profiler.stop')).profile;console.log('wall ms until Power button + 2.5 s:',Date.now()-t0)}
 else{await p.goto('file://'+html);await p.getByRole('button',{name:'Power'}).waitFor();await p.waitForTimeout(2500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
  await c.send('Profiler.start');const box={x:270,y:370,w:900,h:470};const end=Date.now()+secs*1000;let i=0;
  while(Date.now()<end){await p.mouse.move(box.x+box.w*(.5+.4*Math.sin(i/17)),box.y+box.h*(.5+.4*Math.cos(i/11)));await p.waitForTimeout(100);if(i%40===20)await p.mouse.click(box.x+box.w*(.5+.3*Math.sin(i/7)),box.y+box.h*.5);i++}
  prof=(await c.send('Profiler.stop')).profile}
 await b.close();
 const dt=prof.timeDeltas,self=new Map();const total=(prof.endTime-prof.startTime)/1000;
 const byId=new Map(prof.nodes.map(n=>[n.id,n]));const t=new Map();for(let i=0;i<prof.samples.length;i++)t.set(prof.samples[i],(t.get(prof.samples[i])||0)+dt[i]/1000);
 const rows=[],byFile=new Map();let scriptMs=0,idle=0,gc=0,prog=0;
 for(const [id,ms] of t){const n=byId.get(id),cf=n.callFrame;
  if(cf.functionName==='(idle)'){idle+=ms;continue}if(cf.functionName==='(garbage collector)'){gc+=ms}if(cf.functionName==='(program)'){prog+=ms;continue}
  let file='(native/'+(cf.functionName||'anonymous')+')';
  if(cf.url&&cf.url.startsWith('file://')&&cf.lineNumber>=0){const pos=(lineStarts[cf.lineNumber]||0)+cf.columnNumber;file=fileAt(Math.min(pos,out.length-1)).file||'(template)'}
  else if(cf.url==='')file=cf.scriptId?'(eval/'+(cf.functionName||'anon')+')':file;
  scriptMs+=ms;const key=(cf.functionName||'(anonymous)')+' @ '+file+':'+cf.lineNumber;rows.push([ms,key]);byFile.set(file,(byFile.get(file)||0)+ms)}
 const agg=new Map();for(const [ms,k] of rows)agg.set(k,(agg.get(k)||0)+ms);
 console.log('profile',mode,'total ms',total.toFixed(0),'| script+native self ms',scriptMs.toFixed(0),'('+(100*scriptMs/total).toFixed(1)+'%) | (program)',prog.toFixed(0),'| gc',gc.toFixed(0),'| idle',idle.toFixed(0),'| pageerrors',errs.length);
 console.log('\nself time by source file:');for(const [f,ms] of [...byFile].sort((a,b)=>b[1]-a[1]).slice(0,22))console.log(ms.toFixed(0).padStart(7),'ms',f);
 console.log('\nself time by function:');for(const [k,ms] of [...agg].sort((a,b)=>b[1]-a[1]).slice(0,32))console.log(ms.toFixed(1).padStart(8),'ms',k.slice(0,130));
})().catch(e=>{console.error(e);process.exit(1)});
