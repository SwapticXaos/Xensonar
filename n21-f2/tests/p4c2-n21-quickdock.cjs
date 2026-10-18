'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv.includes('--baseline')?'tests/fixtures/p4c2-n21/quick-menu-n20.js':'src/mix/03_quick_menu.js','utf8');
const events={},frames=new Map(),timers=new Map();let serial=0;const root={style:{setProperty(){},removeProperty(){}},toggleAttribute(){},removeAttribute(){}};
const pan={getBoundingClientRect:()=>({bottom:650})},marker={getBoundingClientRect:()=>({width:240,right:1728})};
const document={documentElement:root,body:{},querySelector:q=>q.includes('Place a marker')?marker:q.includes('Keyboard')?pan:q==='.xen-performance'?pan:null,addEventListener(){}};
const window={innerWidth:1740,innerHeight:950,addEventListener:(name,fn)=>(events[name]??=[]).push(fn),removeEventListener(){}};
const requestAnimationFrame=fn=>{const id=++serial;frames.set(id,fn);return id},cancelAnimationFrame=id=>frames.delete(id),setTimeout=fn=>{const id=++serial;timers.set(id,fn);return id},clearTimeout=id=>timers.delete(id);
const u={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},ao={createPortal:children=>({type:'portal',props:{children}})};
let current;
const depsEqual=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
const P={Fragment:'fragment',useSyncExternalStore:(sub,get)=>get(),useState:init=>{const h=current,i=h.index++;if(!(i in h.slots))h.slots[i]=typeof init==='function'?init():init;return[h.slots[i],v=>{const next=typeof v==='function'?v(h.slots[i]):v;if(next!==h.slots[i]){h.slots[i]=next;h.dirty=true}}]},useRef:value=>{const h=current,i=h.index++;return h.slots[i]??(h.slots[i]={current:value})},useMemo:(fn,deps)=>{const h=current,i=h.index++;if(!depsEqual(h.slots[i]?.deps,deps))h.slots[i]={deps,value:fn()};return h.slots[i].value},useEffect:(fn,deps)=>effect(fn,deps),useLayoutEffect:(fn,deps)=>effect(fn,deps)};
function effect(fn,deps){const h=current,i=h.index++;if(!depsEqual(h.slots[i]?.deps,deps)){h.effects.push(()=>{h.slots[i]?.cleanup?.();h.slots[i]={deps,cleanup:fn()}})}}
const entries=Array.from({length:7},(_,i)=>({kind:'material',id:'id'+i,name:'Sound '+i}));
const localStorage={getItem:key=>key==='xensonar.quick-menu.v1'?JSON.stringify(entries):null,setItem(){}};
const api=new Function('P','u','ao','window','document','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','setTimeout','clearTimeout','localStorage',source+';return {component:__QuickDock,quick:__XenQuick};')(P,u,ao,window,document,requestAnimationFrame,cancelAnimationFrame,class{observe(){}disconnect(){}},setTimeout,clearTimeout,localStorage);
function mount(){return {slots:[],index:0,effects:[],dirty:true,tree:null}}
function settle(h){for(let pass=0;pass<20;pass++){if(h.dirty){h.dirty=false;h.index=0;current=h;h.tree=api.component();const effects=h.effects.splice(0);effects.forEach(fn=>fn());}if(frames.size){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());}if(!h.dirty&&!frames.size)return h.tree;}throw Error('Unstable layout/effect loop')}
function nodes(n){return !n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)]}
const has=(n,cls)=>n.props?.className?.split(' ').includes(cls),find=(h,cls)=>nodes(h.tree).filter(n=>has(n,cls));
const h=mount();settle(h);assert.equal(find(h,'xen-quick-dock')[0].props.style.height,220,'Full area below Keyboard Pan remains the target with seven migrated entries');assert.equal(find(h,'xen-quick-dock')[0].props.style.top,658);
assert.equal(find(h,'xen-quick-signal').length,0,'Cold mount must not blink');assert(find(h,'xen-quick-collection')[0].props.className.includes('is-migrated'));assert.equal(find(h,'xen-quick-collection')[0].props.style.maxHeight,undefined,'No internal height cap/scrollbar');
api.quick.signal();h.dirty=true;settle(h);assert.equal(find(h,'xen-quick-signal').length,1,'Only one landing signal');
assert(!nodes(find(h,'xen-quick-collection')[0]).some(n=>has(n,'xen-quick-signal')),'Never blink the stored list on the right');
const again=mount();settle(again);assert.equal(find(again,'xen-quick-signal').length,0,'Re-entering the room cannot replay a prior click');
for(const fn of [...timers.values()])fn();timers.clear();settle(h);assert.equal(find(h,'xen-quick-signal').length,0);
console.log('PASS N21 dock: full stable target, seven-item migration, one left pulse, no right pulse, no remount replay or nested height cap');
