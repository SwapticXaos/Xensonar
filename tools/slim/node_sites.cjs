'use strict';
/* Where are audio nodes created while the Live Room plays? (analysis only)
 *   node tools/slim/node_sites.cjs [index.html] [seconds] [scenario]
 * scenario: default (standard session) | drums (drums only) | full (mouse moves + clicks)
 * Wraps BaseAudioContext.create* and AudioNode.connect/disconnect in the page, records the calling source line,
 * maps it to the source file through tools/slim/page.cjs and prints creations and graph changes per second by site. */
const path=require('path');const {chromium}=require('playwright');
const {out,fileAt}=require('./page.cjs').load();
const html=path.resolve(process.argv[2]||path.join(__dirname,'../../index.html'));const secs=Number(process.argv[3]||20);const scenario=process.argv[4]||'full';
const lineStarts=[0];for(let i=0;i<out.length;i++)if(out.charCodeAt(i)===10)lineStarts.push(i+1);
const where=(l,c)=>{const pos=(lineStarts[l-1]||0)+c-1;const p=fileAt(Math.min(pos,out.length-1));const fn=(()=>{const s=out.lastIndexOf('function ',pos);const m=out.slice(s,s+60).match(/function\s+([\w$]+)/);return m?m[1]:'?'})();return (p.file||'(template)')+'  ['+fn+']'};
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
 await p.addInitScript(()=>{
  const S=window.__ns={on:false,create:new Map(),connect:new Map(),disconnect:new Map(),kinds:new Map()};
  const site=()=>{const st=new Error().stack.split('\n');for(let i=3;i<st.length;i++){const m=st[i].match(/\.html:(\d+):(\d+)/);if(m)return m[1]+':'+m[2]}return '?'};
  const bump=(m,k)=>m.set(k,(m.get(k)||0)+1);
  const B=BaseAudioContext.prototype;
  for(const k of Object.getOwnPropertyNames(B))if(k.startsWith('create')&&typeof B[k]==='function'&&k!=='createBuffer'&&k!=='createPeriodicWave'){const o=B[k];B[k]=function(...a){if(S.on&&!(this instanceof OfflineAudioContext)){const s=site();bump(S.create,s);bump(S.kinds,k+'@'+s)}return o.apply(this,a)}}
  const W=window.AudioWorkletNode;if(W)window.AudioWorkletNode=class extends W{constructor(c,...a){super(c,...a);if(S.on&&!(c instanceof OfflineAudioContext)){const s=site();bump(S.create,s);bump(S.kinds,'AudioWorkletNode@'+s)}}};
  const N=AudioNode.prototype,co=N.connect,dc=N.disconnect;
  N.connect=function(...a){if(S.on&&!(this.context instanceof OfflineAudioContext))bump(S.connect,site());return co.apply(this,a)};
  N.disconnect=function(...a){if(S.on&&!(this.context instanceof OfflineAudioContext))bump(S.disconnect,site());return dc.apply(this,a)};
 });
 await p.goto('file://'+html);await p.getByRole('button',{name:'Power'}).waitFor();await p.waitForTimeout(2500);
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
 await p.evaluate(()=>{__ns.on=true});const t0=Date.now();
 const box={x:270,y:370,w:900,h:470};let i=0;
 while(Date.now()-t0<secs*1000){if(scenario==='full'){await p.mouse.move(box.x+box.w*(.5+.4*Math.sin(i/17)),box.y+box.h*(.5+.4*Math.cos(i/11)));if(i%40===20)await p.mouse.click(box.x+box.w*(.5+.3*Math.sin(i/7)),box.y+box.h*.5)}await p.waitForTimeout(100);i++}
 const sec=(Date.now()-t0)/1000;
 const r=await p.evaluate(()=>({create:[...__ns.create],connect:[...__ns.connect],disconnect:[...__ns.disconnect],kinds:[...__ns.kinds]}));await b.close();
 const agg=list=>{const m=new Map();for(const [s,n] of list){const [l,c]=s.split(':').map(Number);const k=s==='?'?'?':where(l,c);m.set(k,(m.get(k)||0)+n)}return [...m].sort((a,b)=>b[1]-a[1])};
 const tot=l=>l.reduce((a,[,n])=>a+n,0);
 console.log(`scenario ${scenario}, ${sec.toFixed(1)} s: nodes created ${(tot(r.create)/sec).toFixed(1)}/s, connect ${(tot(r.connect)/sec).toFixed(1)}/s, disconnect ${(tot(r.disconnect)/sec).toFixed(1)}/s`);
 for(const [k,list] of [['created',r.create],['connect',r.connect],['disconnect',r.disconnect]]){console.log('\n'+k+' per second by site:');for(const [s,n] of agg(list).slice(0,14))console.log((n/sec).toFixed(1).padStart(7),s)}
 const kinds=new Map();for(const [s,n] of r.kinds){const [k,loc]=s.split('@');const [l,c]=loc.split(':').map(Number);const key=k+'  '+(loc==='?'?'?':where(l,c));kinds.set(key,(kinds.get(key)||0)+n)}
 console.log('\nnode kinds by site:');for(const [s,n] of [...kinds].sort((a,b)=>b[1]-a[1]).slice(0,24))console.log((n/sec).toFixed(1).padStart(7),s);
})().catch(e=>{console.error(e);process.exit(1)});
