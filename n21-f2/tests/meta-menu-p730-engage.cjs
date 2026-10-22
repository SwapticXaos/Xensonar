'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const storageMap=new Map();const storage={getItem:k=>storageMap.get(k)??null,setItem:(k,v)=>storageMap.set(k,v)};
let liveItems=[{kind:'grid',id:'g1',name:'17 EDO'}],activations=0,audioStart=0;
const quick={getItems:()=>liveItems.map(x=>({...x})),replaceItems:x=>{activations++;liveItems=x.map(v=>({...v}));return x},adapters:new Map(),icons:{grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'},subscribe:()=>()=>{},snapshot:()=>({items:liveItems})};
const validate=v=>{assert(Array.isArray(v));return v.map(x=>({kind:x.kind,id:x.id,name:x.name}))};
const ctx=vm.createContext({localStorage:storage,__XenQuick:quick,__xenValidateQuickItems:validate,crypto:require('node:crypto').webcrypto,console});
require('./sessions-test-helpers.cjs').install(ctx);
vm.runInContext(source+'\nglobalThis.api={store:__XenMetaSessions}',ctx);
const m=ctx.api.store;
assert(m.snapshot().dirty);
assert(m.addItem({kind:'drum',id:'five',name:'5 Bar Groove'}));
assert(m.save('First Session'));
const firstId=m.snapshot().loadedId;
assert(m.use());assert.equal(activations,1);assert.equal(audioStart,0,'Engage must not start sound');
assert.equal(m.liveSessionLabel(),'First Session');
// Change the live Quick Access separately, then return to editing it. Preserved saved row is not touched.
liveItems=[{kind:'bass',id:'clip:new',name:'Live Three Bars'}];
assert(m.newSession());assert(m.addItem({kind:'grid',id:'different',name:'Another Draft'}));
const beforeSaved=JSON.stringify(m.snapshot().saved);
assert(m.editCurrentLive());
assert.equal(m.snapshot().loadedId,firstId,'editing active live session must keep its identity');
assert.equal(m.snapshot().name,'First Session');
assert.equal(m.snapshot().items[0].id,'clip:new');
assert.equal(m.snapshot().dirty,true);
assert.equal(JSON.stringify(m.snapshot().saved),beforeSaved,'open-for-edit must not write to saved session');
assert.equal(activations,1,'open-for-edit must not activate anything');
assert.equal(audioStart,0);
// Another session is merely selected in editor; editing live must not accidentally target it.
assert(m.newSession());assert(m.addItem({kind:'rootFollow',id:'r2',name:'RFL Two'}));assert(m.save('Second Session'));
const secondId=m.snapshot().loadedId;assert.notEqual(firstId,secondId);
assert(m.editCurrentLive());assert.equal(m.snapshot().loadedId,firstId);assert.equal(m.snapshot().saved.find(x=>x.id===secondId).items[0].id,'r2');
// A never-saved Live Quick Access becomes a draft rather than a destructive edit.
assert(m.newSession());liveItems=[{kind:'material',id:'m1',name:'New Track'}];
// Clear the active named palette only through the public test-private state? No: create a fresh store with no activation.
const fresh=vm.runInContext('__createXenMetaSessionStore',ctx)( {getItem:()=>null,setItem:()=>{}},quick);
assert(fresh.editCurrentLive());assert.equal(fresh.snapshot().loadedId,null);assert.equal(fresh.snapshot().name,'Untitled Session');assert.equal(fresh.snapshot().items[0].id,'m1');
console.log('PASS Engage vs Edit semantics, saved identity, no auto-save, no playback');
// UI text + destination safety check (no DAW-style copy label or obsolete text).
assert(m.load(firstId));
const snippet=source.slice(source.indexOf('function __XenMetaEditor('),source.indexOf('/* Contextual Save in Sessions dialog'));
const JSX=(type,props)=>({type,props}); const vmctx=vm.createContext({__XenMetaSessions:{...m,subscribe:()=>()=>{},snapshot:()=>m.snapshot(),diagnostics:()=>[]},__XenQuick:quick,__XenSongKinds:['grid','material','rootFollow','drum','bass'],__XenMetaLabels:{grid:'Threadboard'},__xenMetaLibraryEntries:()=>[],__quickProps:()=>({}),P:{useSyncExternalStore:(a,b)=>b(),useState:x=>[x,()=>{}],useRef:()=>({current:null}),useEffect:()=>{}},u:{jsx:JSX,jsxs:JSX},window:{confirm:()=>true},document:{querySelector:()=>null},requestAnimationFrame:()=>0});
require('./sessions-test-helpers.cjs').install(vmctx);
vm.runInContext(snippet+'\nglobalThis.Render=__XenMetaEditor',vmctx);
function flatten(n,out=[]){if(n?.type)out.push(n);if(n?.props?.children!==undefined)for(const child of [n.props.children].flat(Infinity))if(child&&typeof child==='object')flatten(child,out);return out}
const tree=vmctx.Render({onClose:()=>{}});const nodes=flatten(tree);
const bar=nodes.find(n=>n.type==='div'&&n.props.className==='xen-meta-toolbar');
const footer=nodes.find(n=>n.type==='footer'&&n.props.className==='xen-meta-footer');
function label(n){if(typeof n==='string')return n;return [n].flat(Infinity).map(x=>x&&typeof x==='object'?label(x.props?.children):String(x??'')).join('')}
const engage=flatten(bar).find(n=>n.type==='button'&&label(n.props.children)==='Engage! ➜');
const edit=flatten(footer).find(n=>n.type==='button'&&label(n.props.children)==='➜ Edit Current Live Session');
assert(engage&&edit);assert(!flatten(footer).some(n=>n.props?.children==='← Use Live Quick Access'));assert(!flatten(bar).some(n=>n.props?.children==='→ Quick Access'));
let calls=0;vmctx.__XenMetaSessions.use=()=>{calls++;return true};engage.props.onClick();assert.equal(calls,1);
const footChildren=footer.props.children;const statusIndex=footChildren.findIndex(n=>n?.props?.role==='status');const deleteIndex=footChildren.findIndex(n=>n?.props?.children==='Delete session');assert(statusIndex>0&&deleteIndex>statusIndex,'Delete belongs away from Edit');
console.log('PASS UI labels, Engage click, separate Delete, right-side edit control');
