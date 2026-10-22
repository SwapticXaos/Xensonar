'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/mix/03_quick_menu.js','utf8');
const snippet=source.slice(source.indexOf('function __QuickDock('),source.indexOf('\nif(typeof document!==\'undefined\'){',source.indexOf('function __QuickDock(')));
const cols=['grid','material','rootFollow','drum','bass'];
const items=Array.from({length:50},(_,i)=>({kind:cols[i%5],id:'id'+i,name:'Name'+i}));
const hooks=[],effects=[];const states=[];let hook=0,frame=null;
const jsx=(type,props)=>({type,props});
const pan={getBoundingClientRect:()=>({bottom:200})},performance={getBoundingClientRect:()=>({bottom:245})},marker={getBoundingClientRect:()=>({width:240})},dock={getBoundingClientRect:()=>({width:210})};
const styleCalls=[];
const doc={querySelector:selector=>selector.startsWith('.xen-performance [')?pan:selector==='.xen-performance'?performance:selector.startsWith('[aria-label="Place')?marker:selector==='.xen-quick-dock'?dock:null,
 documentElement:{style:{setProperty:(k,v)=>styleCalls.push([k,v]),removeProperty:()=>{}},toggleAttribute:()=>{},removeAttribute:()=>{}},body:{}};
const ctx=vm.createContext({document:doc,window:{innerWidth:1920,innerHeight:700,addEventListener:()=>{},removeEventListener:()=>{}},requestAnimationFrame:cb=>(frame=cb,1),cancelAnimationFrame:()=>{},ResizeObserver:class{observe(){}disconnect(){}},
 __XenQuick:{subscribe:()=>()=>{},snapshot:()=>({items,hotkeys:{},pulse:0})},__XenMetaSessions:{subscribe:()=>()=>{},snapshot:()=>({}),liveSessionLabel:()=>'',liveItemColor:()=>({})},__QuickMuteRow:()=>{},__QuickColumns:()=>{},__QuickHotkey:()=>{},__XenQuickSaveDialog:()=>{},__XenQuickHelpText:'help',P:{Fragment:'fragment',useSyncExternalStore:(subscribe,snap)=>snap(),useState:init=>{const i=hook++;if(!(i in states))states[i]=init;return [states[i],updater=>{states[i]=typeof updater==='function'?updater(states[i]):updater}]},useRef:init=>({current:init}),useEffect:cb=>effects.push(cb),useLayoutEffect:cb=>hooks.push(cb),useMemo:cb=>cb()},u:{jsx,jsxs:jsx},ao:{createPortal:v=>v}});
vm.runInContext(snippet+'\nglobalThis.Render=__QuickDock',ctx);
function nodes(n,out=[]){if(n?.type)out.push(n);for(const child of [n?.props?.children].flat(Infinity))if(child&&typeof child==='object')nodes(child,out);return out}
function render(){hook=0;hooks.length=0;effects.length=0;return ctx.Render({params:{},update:()=>{}})}
let tree=render(),root=nodes(tree).find(n=>n?.type==='section'&&n.props.className.includes('xen-quick-dock'));
assert.equal(root.props.style.visibility,'hidden','before layout measurement, dock must be completely invisible');
assert.equal(root.props.style.pointerEvents,'none','before layout measurement, dock must not intercept input');
for(const effect of hooks)effect(); assert.equal(typeof frame,'function');
frame();assert.equal(typeof frame,'function','first provisional measurement schedules settlement');frame();tree=render();root=nodes(tree).find(n=>n?.type==='section'&&n.props.className.includes('xen-quick-dock'));
assert.equal(root.props.style.visibility,'visible');assert.equal(root.props.style.pointerEvents,'auto');
assert(root.props.className.includes('is-migrated'),'geometry must select the right dock on first visible frame');
assert.equal(root.props.style.top,253);
const hasPortal=nodes(tree).some(n=>n?.type==='div'&&n?.props?.className?.includes('xen-quick-collection'));
assert(hasPortal,'collection must remain mounted');
console.log('PASS QuickDock initial paint hidden, measured right-side presentation, live docking retained');
