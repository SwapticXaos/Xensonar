#!/usr/bin/env node
// Computed-style snapshot for CSS refactors. Visits a fixed set of views and records, for every visible
// element, a hash of all computed style properties plus its rounded box. Two snapshots with zero
// differences prove a CSS change has no visible effect in those views.
//   node tools/style_snapshot.cjs <html> <out.json> [--only file.css]   take snapshot (optionally only elements
//     matched by any selector of file.css: targeted proof for one CSS block)
//   node tools/style_snapshot.cjs --diff <a.json> <b.json> [noise.json ...]  compare (exit 1 on differences);
//     noise.json = further snapshots of the SAME build as a.json: elements that differ between a and noise
//     (animations, time-dependent displays) are masked
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
if(process.argv[2]==='--diff'){
  const a=JSON.parse(fs.readFileSync(process.argv[3])),b=JSON.parse(fs.readFileSync(process.argv[4]));let diffs=0,masked=0;
  const noises=process.argv.slice(5).map(f=>JSON.parse(fs.readFileSync(f)));
  for(const view of Object.keys(a)){const A=a[view],B=b[view]||{};const keys=new Set([...Object.keys(A),...Object.keys(B)]);
    for(const k of keys)if(A[k]!==B[k]){if(noises.some(n=>n[view]?.[k]!==A[k])){masked++;continue}if(diffs<20)console.log(`DIFF [${view}] ${k}: ${A[k]?.slice(0,60)} -> ${B[k]?.slice(0,60)}`);diffs++}}
  console.log(diffs?`${diffs} differences (${masked} masked as noise)`:`IDENTICAL, ${masked} noisy elements masked (${Object.keys(a).length} views, ${Object.values(a).reduce((n,v)=>n+Object.keys(v).length,0)} elements)`);process.exit(diffs?1:0);
}
const {chromium}=require('playwright');
const VIEWS=[['main-off',[]],['main-on',['Power']],['drum-manager',['Broken Lilt']],['bass-workshop',['×','RhythmForg']],['meta-menu',['Meta-Menu']],
  ['forge',['Meta-Menu','MATERIAL FORGE']],['nodal',['NODAL CENTER']],['main-again',['LIVE ROOM']],['melodic',['event:xensonar:open-canonical-melodic-loop']]];
// 'event:<name>' dispatches a window CustomEvent instead of clicking (rooms without a visible button).
const onlyIdx=process.argv.indexOf('--only');
const onlySelectors=onlyIdx>0?[...new Set(fs.readFileSync(process.argv[onlyIdx+1],'utf8').replace(/\/\*[\s\S]*?\*\//g,'').match(/[^{}]+(?=\{)/g).flatMap(x=>x.split(',')).map(x=>x.trim().replace(/::?[a-z-]+(\([^)]*\))?/g,'').trim()).filter(x=>x&&!x.startsWith('@')&&!/^(from|to|\d+%)$/.test(x)))]:null;
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const out={};
  for(const width of [1440,390]){
    const p=await b.newPage({viewport:{width,height:900}});await p.goto('file://'+path.resolve(process.argv[2]));await p.waitForTimeout(3500);
    for(const [name,clicks] of VIEWS){
      for(const t of clicks){await p.evaluate(t=>{if(t.startsWith('event:')){window.dispatchEvent(new CustomEvent(t.slice(6),{detail:{reason:'style-snapshot'}}));return}const x=[...document.querySelectorAll('button,summary')].filter(b=>b.offsetParent).find(b=>(b.innerText||b.getAttribute('aria-label')||'').replace(/\s+/g,' ').includes(t));x?.click()},t);await p.waitForTimeout(1200)}
      await p.evaluate(()=>{for(const a of document.getAnimations())try{a.pause();a.currentTime=0}catch{}});
      const snap=await p.evaluate((only)=>{const r={};const pick=only?new Set(only.flatMap(sel=>{try{return [...document.querySelectorAll(sel)]}catch{return []}})):null;const path=e=>{const o=[];for(let n=e;n&&n!==document.body&&o.length<8;n=n.parentElement){const i=n.parentElement?[...n.parentElement.children].indexOf(n):0;o.unshift(n.tagName.toLowerCase()+(n.id?'#'+n.id:'')+':'+i)}return o.join('>')};
        for(const e of document.body.querySelectorAll('*')){if(e.closest('canvas'))continue;if(pick&&!pick.has(e))continue;const bx=e.getBoundingClientRect();if(!bx.width&&!bx.height)continue;
          const cs=getComputedStyle(e);let s='';for(let i=0;i<cs.length;i++){const k=cs[i];s+=k+':'+cs.getPropertyValue(k)+';'}
          r[path(e)]=Math.round(bx.x)+','+Math.round(bx.y)+','+Math.round(bx.width)+','+Math.round(bx.height)+'|'+s}return r},onlySelectors);
      out[`${width}:${name}`]=Object.fromEntries(Object.entries(snap).map(([k,v])=>[k,crypto.createHash('sha1').update(v).digest('hex').slice(0,16)+' '+v.slice(0,40)]));
    }
    await p.close();
  }
  fs.writeFileSync(process.argv[3],JSON.stringify(out));console.log('snapshot',Object.keys(out).length,'views');await b.close()})();
