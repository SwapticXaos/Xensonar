'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const snippet=src.slice(src.indexOf('function __XenMetaEditor('),src.indexOf('/* Contextual Save in Sessions dialog'));
assert(snippet.startsWith('function __XenMetaEditor'));
const calls=[],entry={kind:'grid',id:'17edo',name:'17 EDO'};
const state={name:'Freie Session',items:[entry],colors:{},loadedId:null,saved:[],dirty:true,canUndo:true,canRedo:false,error:''};
const store={subscribe:()=>()=>{},snapshot:()=>state,diagnostics:()=>[],itemColor:()=>({}),setName:n=>{calls.push(['title',n]);state.name=n},undo:()=>calls.push(['undo']),redo:()=>calls.push(['redo'])};
const jsx=(type,props)=>({type,props});
const ctx=vm.createContext({__XenMetaSessions:store,__XenQuick:{subscribe:()=>()=>{},snapshot:()=>({items:[]}),icons:{grid:'🪜',material:'📀',rootFollow:'🎼',drum:'🥁',bass:'🎸'}},
 __XenSongKinds:['grid','material','rootFollow','drum','bass'],__xenMetaLibraryEntries:()=>[],__xenMetaLabels:{grid:'Threadboard'},__XenMetaLabels:{grid:'Threadboard'},
 __quickProps:()=>({}),P:{useSyncExternalStore:(sub,get)=>get(),useState:n=>[n,()=>{}],useRef:()=>({current:null}),useEffect:()=>{}},
 u:{jsx,jsxs:jsx},window:{confirm:()=>false},document:{querySelector:()=>null}});
require('./sessions-test-helpers.cjs').install(ctx);
vm.runInContext(snippet+'\nthis.renderEditor=__XenMetaEditor',ctx);
function nodes(node,all=[]){if(node?.type)all.push(node);for(const item of [node?.props?.children].flat(Infinity)){if(item&&typeof item==='object')nodes(item,all)}return all}
let tree=ctx.renderEditor({onClose:()=>{}}),all=nodes(tree);
const title=all.find(x=>x.type==='input'&&x.props['aria-label']==='Session name');
assert(title);title.props.onChange({target:{value:''}});assert.deepEqual(calls.pop(),['title','']);
const und=all.find(x=>x.type==='button'&&x.props.children==='↶ Undo');const red=all.find(x=>x.type==='button'&&x.props.children==='Redo ↷');
assert(und&&!und.props.disabled);assert(red&&red.props.disabled);
und.props.onClick();assert.deepEqual(calls.pop(),['undo']);
state.canUndo=false;state.canRedo=true;
all=nodes(ctx.renderEditor({onClose:()=>{}}));
const redNow=all.find(x=>x.type==='button'&&x.props.children==='Redo ↷');assert(!redNow.props.disabled);redNow.props.onClick();assert.deepEqual(calls.pop(),['redo']);
console.log('PASS P7.26 Meta editor: blank title input, Undo/Redo present, correct enabled state and handlers');
