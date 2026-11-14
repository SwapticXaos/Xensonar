'use strict';
/* Duplicate functions across all script blocks (analysis only): identical after removing whitespace ("exact") and identical after
 * additionally renaming local identifiers by order of first appearance ("renamed"). node tools/slim/duplicates.cjs [--min 300] */
const acorn=require('acorn'),walk=require('acorn-walk'),crypto=require('crypto');
const {out,blocks,fileAt}=require('./page.cjs').load();
const MIN=process.argv.includes('--min')?+process.argv[process.argv.indexOf('--min')+1]:300;
const groupsExact=new Map(),groupsRen=new Map();
const h=s=>crypto.createHash('sha1').update(s).digest('hex');
for(const b of blocks){if(b.kind==='other')continue;let src=out.slice(b.start,b.end),shift=0;if(b.kind==='island'){src='('+src+'\n)';shift=1}
 const tokensOf=(s,e)=>{const t=[];for(const tok of acorn.tokenizer(src.slice(s,e),{ecmaVersion:'latest',sourceType:'module',allowHashBang:true}))t.push(tok);return t};
 let ast;try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:b.kind==='module'?'module':'script',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true})}catch{continue}
 walk.full(ast,node=>{if(!/Function/.test(node.type))return;const len=node.end-node.start;if(len<MIN)return;
  // compare from the parameter list on, so `function a(){}` equals `const b=function(){}` and method bodies
  const from=node.params.length?node.params[0].start:node.body.start;
  let toks;try{toks=tokensOf(from,node.end)}catch{return}
  const exact=toks.map(t=>t.type.label==='name'?t.value:t.type.label==='string'?JSON.stringify(t.value):t.type.label==='num'?String(t.value):t.type.label==='template'?t.value:t.type.label==='regexp'?String(t.value.pattern)+'/'+t.value.flags:t.type.label).join(' ');
  const names=new Map();const ren=toks.map((t,i)=>{if(t.type.label!=='name')return t.type.label==='string'?JSON.stringify(t.value):t.type.label==='num'?String(t.value):t.type.label==='template'?t.value:t.type.label;
    const prev=toks[i-1];if(prev&&(prev.type.label==='.'||prev.type.label==='?.'))return t.value; // property names stay
    if(!names.has(t.value))names.set(t.value,'$'+names.size);return names.get(t.value)}).join(' ');
  const rec={len,file:fileAt(b.start+node.start-shift).file,name:node.id?.name||'',pos:b.start+node.start-shift,end:b.start+node.end-shift};
  for(const [m,k] of [[groupsExact,h(exact)],[groupsRen,h(ren)]]){let a=m.get(k);if(!a)m.set(k,a=[]);a.push(rec)}
 });
}
function summarise(m,label){
 let groups=[...m.values()].filter(a=>a.length>1);
 // drop members nested inside another member of a bigger duplicate (count only outermost)
 const all=groups.flat().sort((a,b)=>a.pos-b.pos||b.end-a.end);const outer=new Set();let last=-1;for(const r of all){if(r.pos>=last){outer.add(r);last=r.end}}
 groups=groups.map(a=>a.filter(r=>outer.has(r))).filter(a=>a.length>1);
 const saved=groups.reduce((s,a)=>s+a.slice(1).reduce((x,r)=>x+r.len,0),0);
 console.log('\n== '+label+': '+groups.length+' groups, '+groups.reduce((s,a)=>s+a.length,0)+' functions, characters that would go if each group kept one copy: '+saved);
 for(const a of groups.sort((x,y)=>(y.length-1)*y[0].len-(x.length-1)*x[0].len).slice(0,28))
  console.log(String((a.length-1)*a[0].len).padStart(7),'×'+a.length,String(a[0].len).padStart(6),(a[0].name||'(anon)').padEnd(26).slice(0,26),[...new Set(a.map(r=>r.file.replace(/^src\//,'')))].slice(0,4).join(' | ').slice(0,150));
}
summarise(groupsExact,'exact duplicates (≥'+MIN+' chars)');
summarise(groupsRen,'duplicates after renaming locals (≥'+MIN+' chars)');
