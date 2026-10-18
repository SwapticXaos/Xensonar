'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/forge/ui/02_donor_routing_and_hearing.js'),'utf8');
const code=src.slice(src.indexOf('function __F34LibrarySmallView('),src.indexOf('function jHe('));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function run(agree){
 const calls=[],states=[];
 const data=[{id:'a',name:'First carrier',updatedAt:1500},{id:'b',name:'Second carrier',updatedAt:2200}];
 const props={
   P:{useState:(v)=>{const i=states.length;const values=['b',null,false,''];states.push(values[i]??v);return[states[i],next=>{states[i]=next;calls.push(['setState',i,next]);}]},useMemo:fn=>fn(),useEffect:()=>{},useRef:()=>({current:null})},
   u:{jsx:(type,p)=>({type,props:p}),jsxs:(type,p)=>({type,props:p})},
   cB:()=>data,pe:Object.assign(()=>()=>{}, {getState:()=>({})}),
   jd:async id=>({id,spectralSnapshot:[.5]}),pFe:async id=>{calls.push(['delete',id]);},
   dHe:()=>({}),window:{confirm:msg=>{calls.push(['confirm',msg]);return agree}},
 };
 vm.createContext(props);vm.runInContext(code,props);
 const tree=props.__F34CompactLibrary({onClose:()=>calls.push(['close'])});
 function find(el,fn){if(!el)return null;if(Array.isArray(el)){for(const item of el){const found=find(item,fn);if(found)return found;}return null;}if(typeof el!=='object')return null;if(fn(el))return el;return find(el.props?.children,fn)}
 const preview=find(tree,e=>e.type===props.__F34LibrarySmallView);
 const deleted=find(tree,e=>e.props?.['aria-label']==='Delete selected carrier');
 const load=find(tree,e=>e.props?.className==='f34-library-load');
 const elements=[];(function walk(el){if(!el)return;if(Array.isArray(el))return el.forEach(walk);if(typeof el==='object'){elements.push(el);walk(el.props?.children)}})(tree);
 assert(preview,'drawn carrier preview is in library');assert(deleted,'delete button exists');assert(load,'load is preserved');
 assert(elements.some(e=>e.props?.className==='f37-library-entry-modified'),'modified date alongside each carrier');
 assert(elements.some(e=>e.props?.className==='f37-library-modified'),'modified date in preview');
 deleted.props.onClick();
 return {calls,states,flush};
}
(async()=>{
 const rejected=run(false);await rejected.flush();
 assert(rejected.calls.some(x=>x[0]==='confirm'),'deleting asks confirmation');
 assert(!rejected.calls.some(x=>x[0]==='delete'),'cancel must not delete');
 const accepted=run(true);await accepted.flush();
 assert.deepEqual(accepted.calls.filter(x=>x[0]==='delete').map(x=>x[1]),['b'],'only selected carrier deleted');
 assert(accepted.calls.some(x=>x[0]==='setState'&&x[1]===0&&x[2]==='a'),'selection switches to surviving project');
 assert(!accepted.calls.some(x=>x[0]==='close'),'library remains open after deletion');
 console.log('PASS F3.7 selected carrier deletion: cancel/confirm, persistence handler, and surviving selection; modified and preview retained');
})().catch(e=>{console.error(e);process.exit(1)});
