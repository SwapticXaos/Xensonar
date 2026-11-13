const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const dir=process.argv[2]; const idx=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
const found=[];
function scan(src,label,depth=0){
  let ast; try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true});}catch(e){try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true});}catch(e2){try{ast=acorn.parse('('+src+'\n)',{ecmaVersion:'latest'})}catch(e3){return}}}
  const lits=[];
  walk.simple(ast,{
    TemplateLiteral(n){const t=n.quasis.map(q=>q.value.cooked).join('__X__'); if(t&&t.includes('registerProcessor')&&t.includes('process'))lits.push({t,exprs:n.expressions.length})},
    Literal(n){if(typeof n.value==='string'&&n.value.includes('registerProcessor')&&n.value.includes('process'))lits.push({t:n.value,exprs:0})}
  });
  // also array.join based sources: skip
  for(const l of lits) found.push({label,...l});
}
for(const b of idx){ if(b.file[0]!=='s')continue; scan(fs.readFileSync(path.join(dir,b.file),'utf8'),b.file); }
// dedupe nested (a literal containing another)
found.sort((a,b)=>a.t.length-b.t.length);
const uniq=found.filter((f,i)=>!found.slice(0,i).some(g=>g.t===f.t));
console.log('worklet source literals:',uniq.length);
const out=path.join(path.dirname(dir),'worklets'); fs.mkdirSync(out,{recursive:true});
let k=0;
for(const f of uniq){
  const names=[...f.t.matchAll(/registerProcessor\(\s*['"`]([^'"`]+)/g)].map(m=>m[1]);
  const file=path.join(out,'w'+(k++)+'.js'); fs.writeFileSync(file,f.t);
  let ast,err=null; try{ast=acorn.parse(f.t,{ecmaVersion:'latest',sourceType:'script'})}catch(e){err=e.message}
  const rep=[];
  if(ast){
    walk.ancestor(ast,{
      MethodDefinition(n,anc){ if(n.key.name!=='process')return; const cls=anc.slice().reverse().find(a=>a.type==='ClassDeclaration'||a.type==='ClassExpression');
        const c={cls:cls&&cls.id?cls.id.name:'?',lines:f.t.slice(n.start,n.end).split('\n').length,chars:n.end-n.start,newExpr:[],arrLit:0,objLit:0,post:0,closures:0,tmpl:0,allocCalls:[],tryc:0,calls:new Set()};
        walk.simple(n.value.body,{
          NewExpression(x){c.newExpr.push(x.callee.name||'?')},
          ArrayExpression(){c.arrLit++}, ObjectExpression(){c.objLit++}, TemplateLiteral(){c.tmpl++}, TryStatement(){c.tryc++},
          ArrowFunctionExpression(){c.closures++}, FunctionExpression(){c.closures++},
          CallExpression(x){const nm=x.callee.property&&x.callee.property.name; if(nm==='postMessage')c.post++; if(['slice','map','filter','concat','from','keys','values','entries','push','splice','join','split','stringify'].includes(nm))c.allocCalls.push(nm);
            if(x.callee.type==='MemberExpression'&&x.callee.object.type==='ThisExpression')c.calls.add(nm)}
        });
        c.calls=[...c.calls].slice(0,12).join(','); rep.push(c);
      }
    });
  }
  console.log('\n#',path.basename(file),'from',f.label,'len',f.t.length,'placeholders',f.exprs,'names',names.join(',')||'(templated)',err?('PARSE-ERR '+err):'');
  for(const c of rep)console.log('   process() in',c.cls,`lines=${c.lines} chars=${c.chars} new=[${c.newExpr}] arr=${c.arrLit} obj=${c.objLit} postMessage=${c.post} closures=${c.closures} tmpl=${c.tmpl} try=${c.tryc} allocCalls=[${c.allocCalls}] this.calls=[${c.calls}]`);
}
