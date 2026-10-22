'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const css=fs.readFileSync('styles/27_meta_menu.css','utf8');
const frag=js.slice(js.indexOf('function __XenMetaEditor('),js.indexOf('/* Contextual Save in Sessions dialog'));
const jsx=(type,props)=>({type,props});
const opened=[];
const state={name:'Test',items:[],colors:{},roomSettings:null,saved:[],loadedId:null,dirty:true,error:'',canUndo:false,canRedo:false};
const ctx=vm.createContext({__XenMetaSessions:{subscribe:()=>()=>{},snapshot:()=>state,diagnostics:()=>[]},__XenQuick:{subscribe:()=>()=>{},snapshot:()=>({active:{kind:'meta'}}),icons:{grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'}},__XenSongKinds:['grid','material','rootFollow','drum','bass'],__XenMetaLabels:{grid:'Threadboard',material:'Material Track',rootFollow:'Root Follow Loop',drum:'Drums',bass:'Bass'},__xenMetaLibraryEntries:()=>[],__xenOpenOriginalLibrary:k=>(opened.push(k),true),__quickProps:()=>({}),P:{useSyncExternalStore:(a,b)=>b(),useState:v=>[v,()=>{}],useRef:()=>({current:null}),useEffect:()=>{}},u:{jsx,jsxs:jsx},window:{confirm:()=>true},document:{querySelector:()=>null}});
require('./sessions-test-helpers.cjs').install(ctx);
vm.runInContext(frag+'\nglobalThis.render=__XenMetaEditor',ctx);
function walk(node,out=[]){if(node?.type)out.push(node);for(const sub of [node?.props?.children].flat(Infinity))if(sub&&typeof sub==='object')walk(sub,out);return out;}
const nodes=walk(ctx.render({onClose:()=>{}}));
const links=nodes.filter(n=>n.type==='button'&&n.props.className==='xen-meta-library-open-manager');
assert.equal(links.length,1,'Active Library heading must expose its own original manager link');
assert(links[0].props.children.toString().includes('Threadboard'),'Full library name on the primary link');
links[0].props.onClick();assert.equal(opened[0],'grid');
const corners=nodes.filter(n=>n.type==='button'&&n.props.className==='xen-meta-source-menu');
assert.equal(corners.length,5,'One subtle triangular link per Session Collection column');
for(const b of corners){const nested=walk(b);assert(nested.some(x=>x.type==='svg'),'Corner must be vector-drawn, not a dropdown glyph');assert(nested.some(x=>x.type==='path'),'Corner shape must have an isosceles right triangle path');}
assert(/\.xen-meta-source-menu svg path/.test(css),'CSS styles actual triangle surface, not a square button');
assert(/stroke-width:\s*1(?:px)?/.test(css),'Triangle border should match 1px Session Collection tiles');
assert(css.includes('.xen-meta-browser-heading input:focus-visible'),'Library filter top focus ring must remain unobscured');
console.log('PASS P7.33 primary library link, five half-square corner links, and filter focus geometry');
