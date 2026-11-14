'use strict';
/* Merges the coverage files written by cov_preload.cjs and reports code that was never executed in any recorded run.
 *   node tools/slim/cov_report.cjs dist/coverage [--json out.json] [--min 2000]
 * "Never executed" is NOT the same as dead: it means no recorded test or tour reached it. It shows where to look. */
const fs=require('fs'),path=require('path');
const acorn=require('acorn'),walk=require('acorn-walk');
const {out,blocks,fileAt,ROOT}=require('./page.cjs').load();
const dir=path.resolve(process.argv[2]||'dist/coverage');
const JSON_OUT=process.argv.includes('--json')?process.argv[process.argv.indexOf('--json')+1]:null;
const MIN=process.argv.includes('--min')?+process.argv[process.argv.indexOf('--min')+1]:1500;
const exposeLen=(()=>{try{const pj=JSON.parse(fs.readFileSync(path.join(ROOT,'tests/probe/probe.json'),'utf8'));let n=0;for(const fs_ of Object.values(pj.append))for(const f of fs_)n+=fs.readFileSync(path.join(ROOT,f),'utf8').length;return n}catch{return 0}})();
const byKey=new Map();
for(const b of blocks){const len=b.end-b.start;
 if(b.kind==='classic')byKey.set('doc:'+len,{b,shift:0});
 if(b.kind==='module'){byKey.set('doc:'+len,{b,shift:0});byKey.set('doc:'+(len+exposeLen),{b,shift:0})}
 if(b.kind==='room')byKey.set('eval:'+len,{b,shift:0});
 if(b.kind==='island')byKey.set('eval:'+(len+2),{b,shift:1});}
const cov=new Map();let files=0,unmatched=new Map();
for(const f of fs.readdirSync(dir)){if(!/^cov_.*\.json$/.test(f))continue;files++;
 const o=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
 for(const [key,list] of Object.entries(o)){const hit=byKey.get(key);if(!hit){unmatched.set(key,(unmatched.get(key)||0)+1);continue}
  let m=cov.get(hit.b);if(!m)cov.set(hit.b,m=new Map());
  for(const item of list){const [s,e,c]=item.split(':').map(Number);const k=(s-hit.shift)+':'+(e-hit.shift);if(c)m.set(k,1);else if(!m.has(k))m.set(k,0)}}}
console.log('coverage files:',files,' blocks seen:',cov.size,'of',blocks.filter(b=>b.kind!=='other').length);
const rows=[];const perFile=new Map();const perFileTotal=new Map();let grandUncov=0,grandTotal=0;const big=[];
for(const b of blocks){if(b.kind==='other')continue;const len=b.end-b.start;grandTotal+=len;
 const m=cov.get(b);
 if(!m){rows.push({id:b.id||b.kind,kind:b.kind,len,uncovered:len,never:true});grandUncov+=len;
  const p=fileAt(b.start);perFile.set(p.file,(perFile.get(p.file)||0)+len);continue}
 const un=[...m].filter(([k,c])=>!c).map(([k])=>k.split(':').map(Number)).filter(r=>!(r[0]<=0&&r[1]>=len)).sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
 const outer=[];let last=-1;for(const r of un){if(r[0]>=last){outer.push(r);last=r[1]}}
 let sum=0;for(const r of outer){sum+=r[1]-r[0];
  // attribute to files (a function can span file borders)
  let pos=b.start+r[0];const end=b.start+r[1];while(pos<end){const p=fileAt(pos);const e=Math.min(end,p.end);perFile.set(p.file,(perFile.get(p.file)||0)+e-pos);pos=e}
  if(r[1]-r[0]>=MIN)big.push({block:b,range:r})}
 rows.push({id:b.id||b.kind,kind:b.kind,len,uncovered:sum,functions:m.size,covered:[...m.values()].filter(Boolean).length});grandUncov+=sum;
}
for(const b of blocks){if(b.kind==='other')continue;let pos=b.start;while(pos<b.end){const p=fileAt(pos);const e=Math.min(b.end,p.end);perFileTotal.set(p.file,(perFileTotal.get(p.file)||0)+e-pos);pos=e}}
console.log('never executed:',grandUncov,'of',grandTotal,'characters of script ('+(100*grandUncov/grandTotal).toFixed(1)+'%)\n');
console.log('per block (uncovered / size):');
for(const r of rows.sort((a,b)=>b.uncovered-a.uncovered).slice(0,40))console.log(String(r.uncovered).padStart(8),'/',String(r.len).padStart(8),(100*r.uncovered/r.len).toFixed(0).padStart(4)+'%',r.kind.padEnd(8),r.id,r.never?'(never loaded)':'');
console.log('\nper source file (uncovered / size), top 45:');
for(const [f,u] of [...perFile].sort((a,b)=>b[1]-a[1]).slice(0,45))console.log(String(u).padStart(8),'/',String(perFileTotal.get(f)).padStart(8),(100*u/perFileTotal.get(f)).toFixed(0).padStart(4)+'%',f);
// names of the biggest never-run functions
const named=[];
const astCache=new Map();
for(const x of big.sort((a,b)=>(b.range[1]-b.range[0])-(a.range[1]-a.range[0])).slice(0,400)){
 const b=x.block;let src=out.slice(b.start,b.end),shift=0;if(b.kind==='island'){src='('+src+'\n)';shift=1}
 let idx=astCache.get(b);
 if(!idx){idx=new Map();try{const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:b.kind==='module'?'module':'script',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true});
   walk.fullAncestor(ast,(node,_s,anc)=>{if(!/Function/.test(node.type))return;const parent=anc[anc.length-2];
    let name=node.id?.name||(parent?.type==='VariableDeclarator'&&parent.id.name)||(parent?.type==='Property'&&(parent.key.name||parent.key.value))||(parent?.type==='MethodDefinition'&&(parent.key.name||parent.key.value))||(parent?.type==='AssignmentExpression'&&src.slice(parent.left.start,parent.left.end))||'(anonymous)';
    // enclosing named function for context
    let ctx='';for(let i=anc.length-2;i>=0;i--){const a=anc[i];if(/Function/.test(a.type)&&a.id){ctx=a.id.name;break}if(a.type==='VariableDeclarator'&&a.id.type==='Identifier'&&i<anc.length-2){ctx=a.id.name;break}if(a.type==='MethodDefinition'||a.type==='ClassDeclaration'){ctx=(a.key?.name||a.id?.name||'');if(ctx)break}}
    idx.set((node.start-shift)+':'+(node.end-shift),{name:String(name).slice(0,60),ctx});
    // method definitions are reported by V8 with the range of the function value
   })}catch(e){}astCache.set(b,idx)}
 const info=idx.get(x.range[0]+':'+x.range[1])||{name:'?',ctx:''};
 named.push({bytes:x.range[1]-x.range[0],name:info.name,ctx:info.ctx,file:fileAt(b.start+x.range[0]).file,block:b.id||b.kind});
}
console.log('\nlargest never-executed functions:');
for(const n of named.slice(0,70))console.log(String(n.bytes).padStart(7),(n.name+(n.ctx&&n.ctx!==n.name?'  ⊂ '+n.ctx:'')).slice(0,70).padEnd(70),n.file);
if(JSON_OUT)fs.writeFileSync(JSON_OUT,JSON.stringify({grandUncov,grandTotal,rows,perFile:[...perFile],named,unmatched:[...unmatched]},null,1));
