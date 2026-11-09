'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let state=null;const mountedEffects=[];const active=new Map(),events=new Map(),timers=new Map();let next=1,clicks=0;
const P={createElement:(tag,props,...children)=>({tag,props:props||{},children}),
 useRef:()=>ref,useState:()=>[state,v=>{state=typeof v==='function'?v(state):v}],useEffect:fn=>{mountedEffects.push(fn)}};
const ref={current:{getBoundingClientRect:()=>({left:700,top:235,width:64,height:64,bottom:299})}};
const topSvg={getBoundingClientRect:()=>({left:680,top:110,width:44,height:23,bottom:133})};
const fakeDocument={body:{},querySelector:q=>q==='[data-forge-rack-import-audio] svg'?topSvg:q==='[data-forge-rack-import-audio]'?{}:null};
const fakeWindow={innerWidth:1200,innerHeight:800,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)};
const ctx={P,ao:{createPortal:node=>node},document:fakeDocument,window:fakeWindow,innerHeight:800,Math,Number,JSON,
 requestAnimationFrame:fn=>{const id=next++;active.set(id,fn);return id},cancelAnimationFrame:id=>active.delete(id),
 setTimeout:fn=>{const id=next++;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/rooms/00_forge_rack_presentation.js','utf8')+'\n'+fs.readFileSync('src/rooms/00_empty_audio_p32.js','utf8'),ctx);
const render=()=>vm.runInContext('__XenForgeNoAudioP32({onImport:()=>globalClick(),disabled:false})',ctx);
ctx.globalClick=()=>clicks++;
const walk=(n,out=[])=>{if(!n||typeof n!=='object')return out;out.push(n);for(const c of n.children||[])walk(c,out);return out};
let tree=render();const mirror=walk(tree).find(x=>x.props?.['data-p32-import-mirror-triangle']);
assert(mirror,'mirror triangle component missing');
const button=walk(tree).find(x=>x.props?.className==='xen-p32-mirror-button');button.props.onClick();assert.equal(clicks,1);
const cleanup=mountedEffects[0]();assert(active.size>0,'geometry update must be scheduled');
for(const [id,fn] of [...active]){active.delete(id);fn()}
tree=render();const overlay=walk(tree).find(x=>x.props?.['data-p32-connector']==='three-corners');
assert(overlay,'connector not generated when both triangles are visible');
const filaments=walk(overlay).filter(x=>x.props?.className==='xen-p32-filament');assert.equal(filaments.length,3);
assert(overlay.props.style.pointerEvents==='none','connector must not block imports');
cleanup();assert.equal(events.size,0,'scroll/resize listeners not cleaned up');
console.log('P32 CONNECTOR PASS: import click, three corner paths, pointer-safe overlay, unmount cleanup');
