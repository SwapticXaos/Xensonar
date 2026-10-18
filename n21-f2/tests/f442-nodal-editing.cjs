'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),report={checks:[]};
const pass=s=>{report.checks.push(s);console.log('PASS',s)};
function harness(legacy=false){
 const slots=[],effects=[],storage=new Map(),timeouts=new Map();let index=0,id=0,tree,fn,dirty=false;
 const node=()=>({style:{},getBoundingClientRect:()=>({left:0,top:0,x:0,y:0,width:360,height:360}),getScreenCTM:()=>({inverse:()=>({})}),setPointerCapture(){},querySelector:()=>({focus(){}}),querySelectorAll:()=>[],focus(){},contains:()=>false});
 const P={createElement:(type,props,...children)=>{if(props?.ref&&!props.ref.current)props.ref.current=node();return{type,props:props??{},children:children.flat(Infinity)}},Fragment:'fragment',
  useRef:value=>{const i=index++;return slots[i]??(slots[i]={current:value})},
  useState:value=>{const i=index++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;dirty=true}]},
  useMemo:(f,deps)=>{index++;return f()},
  useEffect:effect,useLayoutEffect:effect};
 function effect(f,deps){const i=index++,old=slots[i];if(!old||deps.some((d,k)=>!Object.is(d,old.deps[k])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:f()}});}
 const context=vm.createContext({console,P,performance,Math,Map,Set,Float32Array,Float64Array,Uint32Array,
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:(f)=>{timeouts.set(++id,f);return id},clearTimeout:i=>timeouts.delete(i),clearInterval(){},
  document:{body:{dataset:{}},visibilityState:'visible',addEventListener(){},removeEventListener(){}},window:{addEventListener(){},removeEventListener(){}},
  G$:'EnvelopeEditor',__XenNodalInstallation:{current:{capture:()=>null,stop(){}}},__XenNodalLibrary:{list:()=>[]},__XenNodalModel:null,
  DOMPoint:class{constructor(x,y){this.x=x;this.y=y}matrixTransform(){return this}}});
 const model=fs.readFileSync(path.join(root,'src/nodal/01_instrument_model.js'),'utf8');
 // The old implementation is frozen directly from the delivered merge source.
 const designer=fs.readFileSync(path.join(root,legacy?'tests/fixtures/f441_sound_designer.js':'src/nodal/07_sound_designer.js'),'utf8');
 vm.runInContext(model+'\n'+fs.readFileSync(path.join(root,'src/nodal/11_editing_session.js'),'utf8')+'\n'+designer+'\nglobalThis.component=NodalSoundDesigner;globalThis.editing=__XenNodalEditing;',context);
 fn=context.component;
 function render(){let loops=0;do{dirty=false;index=0;tree=fn({});while(effects.length)effects.shift()();assert(++loops<10)}while(dirty);return tree}
 function all(t=tree){return[t,...(t.children??[]).filter(x=>x&&typeof x==='object').flatMap(all)]}
 function by(test){const match=all().find(test);assert(match,'Missing element '+test);return match}
 const find=(label)=>by(n=>n.props['aria-label']===label);
 const content=n=>typeof n==='string'?n:(n?.children??[]).map(content).join('');
 const button=(label)=>by(n=>n.type==='button'&&content(n)===label);
 function act(f){f();render()}
 function unmount(){for(const slot of slots)slot?.cleanup?.()}
 function settle(){for(const [i,f]of timeouts){timeouts.delete(i);f()}render()}
 render();
 return{context,render,act,find,button,by,all,storage,unmount,settle,draft:()=>JSON.parse(storage.get('xensonar.nodal.sounddesigner.v1')??'null')};
}
// Test the audit's exact failure on the untouched F4.4.1 component, then the fix.
for(const legacy of [true,false]){
 const h=harness(legacy);h.settle();h.act(()=>h.button('Saw').props.onClick());h.unmount();
 assert.equal(h.draft().instrument.material.wave,legacy?'sine':'saw');
 if(legacy)pass('frozen F4.4.1 reproduces immediate-unmount draft loss');else pass('latest change flushes at unmount without waiting for debounce');
}
for(const legacy of [true,false]){
 const h=harness(legacy);const node=h.all().filter(n=>n.props['data-node-id'])[1];
 h.act(()=>node.props.onPointerDown({button:0,preventDefault(){},clientX:680,clientY:570,pointerId:1}));
 assert.equal(h.button('↶ Undo').props.disabled,!legacy);
 if(legacy)pass('frozen F4.4.1 reproduces selection-only undo');else pass('node selection creates no history entry and does not stop preview');
}
{
 const h=harness();h.act(()=>h.button('Saw').props.onClick());h.act(()=>h.button('↶ Undo').props.onClick());h.settle();assert.equal(h.draft().instrument.material.wave,'sine');
 h.act(()=>h.button('↷ Redo').props.onClick());h.settle();assert.equal(h.draft().instrument.material.wave,'saw');
 h.act(()=>h.button('↶ Undo').props.onClick());h.act(()=>h.button('Triangle').props.onClick());assert(h.button('↷ Redo').props.disabled);
 pass('undo/redo restores sound; a new edit invalidates redo');
}
{
 const h=harness(),slider=h.find('Material richness');
 h.act(()=>slider.props.onPointerDown());for(const value of [.8,.7,.6])h.act(()=>h.find('Material richness').props.onChange({target:{value}}));h.act(()=>h.find('Material richness').props.onPointerUp());
 h.act(()=>h.button('↶ Undo').props.onClick());h.settle();assert.equal(h.draft().instrument.material.richness,.85);assert(h.button('↶ Undo').props.disabled);
 pass('three range changes form one undo transaction');
}
{
 const h=harness(),node=h.all().find(n=>n.props['data-node-id']);
 const event={button:2,clientX:200,clientY:200,preventDefault(){},stopPropagation(){},currentTarget:{getBoundingClientRect:()=>({x:0,y:0,width:10,height:10})}};
 h.act(()=>node.props.onPointerDown(event));h.act(()=>node.props.onContextMenu(event));assert(h.button('↶ Undo').props.disabled);
 h.act(()=>h.button('Duplicate node').props.onClick());h.settle();assert.equal(h.draft().instrument.nodes.length,4);
 h.act(()=>h.find('Remove selected node').props.onClick());h.settle();assert.equal(h.draft().instrument.nodes.length,3);
 h.act(()=>h.button('↶ Undo').props.onClick());h.settle();assert.equal(h.draft().instrument.nodes.length,4);
 pass('context opening is inert; duplicate/remove are reversible structural edits');
}
{
 const h=harness();let svg=h.by(n=>n.type==='svg'&&n.props.role==='application'),node=h.all().find(n=>n.props['data-node-id']);
 h.act(()=>node.props.onPointerDown({button:0,preventDefault(){},clientX:250,clientY:320,pointerId:1}));
 h.act(()=>svg.props.onPointerMove({clientX:350,clientY:400}));h.act(()=>h.by(n=>n.type==='svg'&&n.props.role==='application').props.onPointerUp());h.settle();assert.equal(h.draft().instrument.nodes[0].x,.35);
 h.act(()=>h.button('↶ Undo').props.onClick());h.settle();assert.equal(h.draft().instrument.nodes[0].x,.25);assert(h.button('↶ Undo').props.disabled);
 h.act(()=>h.find('Nodal configuration: drag nodes or use arrow keys').props.onKeyDown({key:'Delete',preventDefault(){}}));h.settle();assert.equal(h.draft().instrument.nodes.length,2);
 pass('drag commits once, preserves original geometry until commit; Delete removes selected node');
}
{
 const h=harness();h.act(()=>h.button('Envelopes').props.onClick());
 const editor=h.by(n=>n.type==='EnvelopeEditor');const before=h.draft();h.act(()=>editor.props.onCommit(null));
 h.act(()=>h.find('Attack').props.onPointerDown());h.act(()=>h.find('Attack').props.onChange({target:{value:.1}}));h.act(()=>h.find('Attack').props.onPointerUp());h.act(()=>h.button('↶ Undo').props.onClick());h.settle();assert.equal(h.draft().instrument.articulation.attackSec,.006);
 pass('articulation is covered by the same transaction history');
 assert(editor.props.historyController,'shared contour editor must use the Nodal history owner');
 const panel=h.by(n=>n.props.className==='nd-envelope-panel');
 h.act(()=>panel.props.onPointerDownCapture({button:0,target:{tagName:'CANVAS'}}));
 for(const value of [.11,.12,.13])h.act(()=>h.find('Attack').props.onChange({target:{value}}));
 h.act(()=>h.by(n=>n.props.className==='nd-envelope-panel').props.onPointerUp());
 h.act(()=>h.by(n=>n.type==='EnvelopeEditor').props.historyController.undo());h.settle();assert.equal(h.draft().instrument.articulation.attackSec,.006);assert(h.button('↶ Undo').props.disabled);
 pass('envelope canvas gesture shares one undo owner across its intermediate commits');
}
{
 const api=harness().context.editing, h=api.createHistory(2),a={x:1},b={x:2},c={x:3};
 h.record(a,b);h.undo(b);h.begin(a);assert.equal(h.record(a,{x:1}),false);h.end();assert(h.canRedo);
 const store=new Map(),jobs=new Map();let serial=0,errors=0,fail=true;const draft=api.createDraftStore({setItem:(k,v)=>{if(fail)throw Error('quota');store.set(k,v)}},'draft',()=>errors++,{setTimeout:f=>{jobs.set(++serial,f);return serial},clearTimeout:i=>jobs.delete(i)});
 draft.update(a);draft.update(b);assert.equal(jobs.size,1);assert.equal(draft.flush(),false);assert.equal(errors,1);fail=false;assert(draft.flush());assert.equal(JSON.parse(store.get('draft')).x,2);assert.equal(jobs.size,0);
 h.begin(a);h.record(a,b);h.record(b,a);h.end(a);assert(h.canRedo);assert(!h.canUndo);
 pass('no-op and return-to-start gestures retain redo; draft retries after storage error');
}
fs.writeFileSync(path.join(root,'results/f442-nodal-editing.json'),JSON.stringify(report,null,2)+'\n');
