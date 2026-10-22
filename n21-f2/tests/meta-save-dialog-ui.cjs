'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const mod=fs.readFileSync(path.join(__dirname,'..','src/mix/03_meta_menu.js'),'utf8');
const component=mod.slice(mod.indexOf('function __XenQuickSaveDialog('));
assert(component.startsWith('function __XenQuickSaveDialog('));
let persistent=[],offset=0,closeCount=0;
const storeState={name:'Freie Session',loadedId:null,saved:[],error:''};
const calls=[];
const store={snapshot:()=>storeState,subscribe:()=>()=>{},saveFromQuickAsNew:(name,include)=>{calls.push(['new',name,include]);storeState.saved.push({id:'demo-1',name});return true},updateSavedFromQuick:(id,name,include)=>{calls.push(['update',id,name,include]);return id==='demo-1'}};
const context=vm.createContext({
 P:{useSyncExternalStore:(_subscribe,snapshot)=>snapshot(),useState:init=>{let i=offset++;if(!(i in persistent))persistent[i]=init;return[persistent[i],x=>{persistent[i]=x}]},useRef:()=>({current:null}),useEffect:()=>{}},
 u:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
 ao:{createPortal:(node)=>node},document:{body:{}},__XenMetaSessions:store
});
vm.runInContext(component+'\nthis.make=__XenQuickSaveDialog;',context);
function render(){offset=0;return context.make({onClose:()=>closeCount++})}
function walk(n,out=[]){if(n&&typeof n==='object'&&n.props){out.push(n);for(const ch of [n.props.children].flat(Infinity))walk(ch,out)}return out}
let tree=render();
let buttons=walk(tree).filter(n=>n.type==='button');
assert(buttons.some(n=>n.props.children==='Save as New Session'));
assert(buttons.some(n=>n.props.children==='Update Session'));
assert(buttons.find(n=>n.props.children==='Update Session').props.disabled,'no accidental update without chosen target');
const check=walk(tree).find(n=>n.type==='input'&&n.props.type==='checkbox');
assert(check,'dialog needs an optional checkbox for Main Room settings');
assert.equal(check.props.checked,false,'do not include Main Room settings unless explicitly opted in');
assert.equal(walk(tree).filter(n=>n.type==='input'&&n.props.type==='text').length,1);
assert.equal(walk(tree).find(n=>n.props?.role==='dialog').props['aria-label'],'Save in Sessions (Meta-Menu)');
buttons.find(n=>n.props.children==='Save as New Session').props.onClick();
assert.deepEqual(calls[0],['new','New Session',false]);assert.equal(closeCount,1);
const selection=walk(tree).find(n=>n.type==='select');selection.props.onChange({target:{value:'demo-1'}});
tree=render();buttons=walk(tree).filter(n=>n.type==='button');
assert.equal(buttons.find(n=>n.props.children==='Update Session').props.disabled,false);
buttons.find(n=>n.props.children==='Update Session').props.onClick();
assert.deepEqual(calls[1],['update','demo-1','New Session',false]);assert.equal(closeCount,2);
check.props.onChange({target:{checked:true}});
tree=render();
const checked=walk(tree).find(n=>n.type==='input'&&n.props.type==='checkbox');
assert.equal(checked.props.checked,true,'checkbox selection must persist across renders');
buttons=walk(tree).filter(n=>n.type==='button');
buttons.find(n=>n.props.children==='Update Session').props.onClick();
assert.deepEqual(calls.at(-1),['update','demo-1','New Session',true]);
buttons.find(n=>n.props.children==='Save as New Session').props.onClick();
assert.deepEqual(calls.at(-1),['new','New Session',true]);
console.log('PASS meta-save-dialog-ui: unchecked by default, checked opt-in for create/update, modal');
