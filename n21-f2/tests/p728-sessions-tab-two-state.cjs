'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const css=fs.readFileSync('styles/27_meta_menu.css','utf8');
const start=src.indexOf('function __XenMetaEditor('),end=src.indexOf('/* Contextual Save in Sessions dialog',start);
assert(start>=0&&end>start);
const state={name:'Freie Session',items:[],loadedId:null,saved:[],dirty:false,error:'',canUndo:false,canRedo:false};
const store={subscribe:()=>()=>{},snapshot:()=>state,diagnostics:()=>[],itemColor:()=>({})};
const jsx=(type,props)=>({type,props});
let hooks=[],i=0;
const P={useSyncExternalStore:(sub,read)=>read(),useState:initial=>{const idx=i++;if(!(idx in hooks))hooks[idx]=initial;return[hooks[idx],next=>{hooks[idx]=typeof next==='function'?next(hooks[idx]):next}]},useRef:()=>({current:null}),useEffect:()=>{}};
const context=vm.createContext({__XenMetaSessions:store,__XenQuick:{subscribe:()=>()=>{},snapshot:()=>({items:[]}),icons:{grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'}},__XenSongKinds:['grid','material','rootFollow','drum','bass'],__xenMetaLibraryEntries:()=>[],__XenMetaLabels:{grid:'Threadboard',material:'Material',rootFollow:'RFL',drum:'Drums',bass:'Bass'},__quickProps:()=>({}),P,u:{jsx,jsxs:jsx},window:{addEventListener:()=>{},removeEventListener:()=>{}},document:{querySelector:()=>null}});
require('./sessions-test-helpers.cjs').install(context);
vm.runInContext(src.slice(start,end)+'\nthis.renderEditor=__XenMetaEditor',context);
function walk(n,all=[]){if(!n||typeof n!=='object')return all;if(n.type)all.push(n);for(const child of [n.props?.children].flat(Infinity))walk(child,all);return all}
function render(){i=0;return walk(context.renderEditor({onClose:()=>{}}))}
function get(nodes){const parent=nodes.find(n=>n.props?.className?.includes?.('xen-meta-tab-assembly'));const supertab=nodes.find(n=>n.type==='button'&&n.props?.className==='xen-meta-session-backtab');const sub=nodes.filter(n=>n.type==='button'&&n.props?.role==='tab');return {parent,supertab,sub}}
let nodes=render(),v=get(nodes);assert.equal(v.sub.length,5);
assert.equal(v.parent.props['data-xen-meta-tab-mode'],'libraries','library mode must mark tab assembly for CSS');
assert.equal(v.supertab.props['aria-pressed'],false);
v.supertab.props.onClick();nodes=render();v=get(nodes);
assert.equal(v.parent.props['data-xen-meta-tab-mode'],'sessions','session manager must activate both layout and visual style');
assert.equal(v.supertab.props['aria-pressed'],true);
assert(v.sub.every(n=>n.props['aria-selected']===false),'all five tabs inactive in Sessions');
const grid=v.sub.find(n=>n.props.children?.[1]?.props?.children==='Thread');assert(grid);grid.props.onClick();nodes=render();v=get(nodes);
assert.equal(v.parent.props['data-xen-meta-tab-mode'],'libraries');
assert.equal(grid.props['aria-pressed'],undefined);
assert(/\[data-xen-meta-tab-mode="sessions"\]\s*\.xen-meta-session-backtab\s*\{[^}]*top\s*:\s*-/s.test(css),'Sessions supertab must rise when active');
assert(/\[data-xen-meta-tab-mode="sessions"\]\s*\.xen-meta-tabs\s*>\s*button\s*\{[^}]*margin-inline/s.test(css),'inactive five tabs must narrow with visible gaps');
assert(/\[data-xen-meta-tab-mode="sessions"\]\s*\.xen-meta-tabs\s*>\s*button\s*\{[^}]*background/s.test(css),'inactive five tabs must dim');
assert(/prefers-reduced-motion/s.test(css),'visual animation must be disableable');
console.log('PASS two-state 🎧 Sessions supertab behavior and tab width/color rules');
