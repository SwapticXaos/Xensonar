'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('src/forge/emilia/02_lab_ui.js','utf8');
const css=fs.readFileSync('styles/22_emilia3.css','utf8');
assert.match(code,/function notifyPreviewSettled\(state\)/);
assert.match(code,/if\(waitForPreview\)afterAudioRelease/);
assert.match(css,/\.emilia-b-ripple-wave\{[^\n]*animation:emilia-b-ripple-flow/);
assert.match(css,/@keyframes emilia-b-ripple-flow/);
assert(!code.includes('setRipples')&&!code.includes("h('circle',{key:p.id"), 'waves not managed by React or SVG');
assert(!css.includes('100%{r:510px}'), 'avoid SVG radius painting');
let idx=0,playing=false,previewCallback,recipe={model:{nodes:[{id:'a',x:.25,y:.4,role:'tone',ratio:1,radius:.4,strength:1,muted:false},{id:'b',x:.75,y:.55,role:'tone',ratio:1.5,radius:.4,strength:1,muted:false}]}};
let changes=0,rafId=0,timerId=0;
let rafQueue=new Map(),timers=new Map(),effects=[];const hooks=[];
const P={
 createElement:(type,props,...kids)=>({type,props:props||{},children:kids.flat(Infinity)}),
 useState:init=>{const k=idx++;if(!(k in hooks))hooks[k]=typeof init==='function'?init():init;return[hooks[k],fn=>hooks[k]=typeof fn==='function'?fn(hooks[k]):fn]},
 useRef:init=>{const k=idx++;if(!(k in hooks))hooks[k]={current:init};return hooks[k]},
 useMemo:fn=>fn(),useEffect:fn=>effects.push(fn)
};
function el(){return{className:'',style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(){},remove(){this.parent?.removeChild(this)}}}
const host={children:[],get childElementCount(){return this.children.length},get firstElementChild(){return this.children[0]},appendChild(w){w.parent=this;this.children.push(w)},removeChild(w){this.children=this.children.filter(x=>x!==w)},replaceChildren(){this.children=[]}};
const ctx={P,Math,console,document:{createElement:el},
 __XenNodalModel:{roles:['tone'],compile:m=>({nodes:m.nodes.map(n=>({id:n.id})),edges:[{a:0,b:1,weight:.5}]})},
 __NodalOrgans:{tone:{label:'Tone',color:'#abc',glyph:'◉'}},
 __Emilia:{MAX_NODES:7,snapshot:()=>recipe,subscribe:()=>()=>{},stopPreview:()=>{},semanticKey:r=>JSON.stringify(r.model.nodes),
 moveNode:(r,id,x,y)=>({...r,model:{...r.model,nodes:r.model.nodes.map(n=>n.id===id?{...n,x,y}:n)}}),
 set:r=>{changes++;recipe=r},editNode:(r,id,p)=>r,startPreview:callback=>{playing=true;previewCallback=callback;callback('playing');}},
 requestAnimationFrame:fn=>{rafQueue.set(++rafId,fn);return rafId},cancelAnimationFrame:id=>rafQueue.delete(id),
 setTimeout:(fn,t)=>{timers.set(++timerId,{fn,t});return timerId},clearTimeout:id=>timers.delete(id)};
vm.createContext(ctx);vm.runInContext(code+';globalThis.renderEmilia=EmiliaForgeLab',ctx);
let tree,area,layer,field,started=false;const all=(node,pred)=>{if(!node||typeof node!=='object')return[];return (pred(node)?[node]:[]).concat(...(node.children||[]).map(n=>all(n,pred)))};
function render(){idx=0;tree=ctx.renderEmilia();field=all(tree,n=>n.props?.['data-emilia-nodal-field']==='true')[0];layer=all(tree,n=>n.props?.['data-emilia-ripple-layer']==='true')[0];if(!started){for(const e of effects.splice(0))e();started=true}field.props.ref.current={getBoundingClientRect:()=>({width:340,height:340})};layer.props.ref.current=host;return tree}
function node(){return all(tree,n=>n.props?.['aria-label']==='Move Tone')[0]}
function down(id){const n=node();n.props.onPointerDown({button:0,pointerId:id,clientX:100,clientY:100,preventDefault(){},currentTarget:{setPointerCapture(){},releasePointerCapture(){}}});render()}
function move(id){field.props.onPointerMove({pointerId:id,clientX:142,clientY:115});flushRaf();render()}
function up(id){field.props.onPointerUp({pointerId:id});render()}
function flushRaf(){let counter=0;while(rafQueue.size){const current=[...rafQueue.entries()][0];rafQueue.delete(current[0]);current[1]();if(++counter>40)throw Error('unbounded raf')}}
render();assert.equal(layer.type,'div');assert.equal(host.children.length,0);
down(1);assert.equal(host.children.length,1,'press always emits one wave');
move(1);assert.equal(host.children.length,1,'first drag movement emits no extra wave');
up(1);assert.equal(changes,1);assert.equal(host.children.length,1,'release wave waits for UI/commit frames');
flushRaf();assert.equal(host.children.length,2,'exactly one release ripple once commits complete');
assert.equal(host.children[0].parent,host,'press wave DOM identity retained after drag');
const beforeClick=host.children.length, beforeCommits=changes;
down(20);up(20);flushRaf();assert.equal(host.children.length,beforeClick+1,'click creates press ripple only');
assert.equal(changes,beforeCommits,'click does not change instrument');
// Preview-on path: no visual wave starts inside a synchronous/async PCM update.
const button=all(tree,n=>n.props?.['data-emilia-held-preview']==='true')[0];button.props.onClick();render();assert.equal(playing,true);
down(2);move(2);up(2);
assert.equal(changes,2,'second drag commits immediately while preview plays');
assert.equal(host.children.length,4,'press wave starts, but release wave is deferred');
flushRaf();assert.equal(host.children.length,4,'release wave does not start just because a frame passed');
previewCallback('playing');flushRaf();assert.equal(host.children.length,5,'release ring begins only after PCM refresh completion');
assert.equal([...timers.values()].some(t=>t.t===2800),false,'fallback timer cancelled on audio completion');
// Move after the preview: node remains at edited location; no other stores mutated.
assert(recipe.model.nodes[0].x>.25);
console.log('PASS F4.3.12: imperative compositor layer; no ring on first move; release after settle; preview render cannot overlap ring onset; cleanup timeouts');
