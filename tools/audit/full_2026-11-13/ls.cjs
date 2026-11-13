const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const dir=process.argv[2]; const idx=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
let tot=0,unguarded=[],keys={};
for(const b of idx){ if(b.file[0]!=='s')continue; const src=fs.readFileSync(path.join(dir,b.file),'utf8');
  let ast; try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:/module/.test(b.attrs)?'module':'script',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true})}catch{try{ast=acorn.parse('('+src+'\n)',{ecmaVersion:'latest'})}catch{continue}}
  walk.ancestor(ast,{CallExpression(n,anc){ const c=n.callee; if(c.type!=='MemberExpression')return; const nm=c.property.name; if(nm!=='setItem')return;
    const objTxt=src.slice(c.object.start,c.object.end); if(!/[lL]ocalStorage|storage|Storage/.test(objTxt))return;
    tot++; const inTry=anc.some((a,i)=>a.type==='TryStatement'&&anc[i+1]===a.block);
    const k=n.arguments[0]?src.slice(n.arguments[0].start,n.arguments[0].end).slice(0,60):'?';
    keys[k]=(keys[k]||0)+1;
    if(!inTry){ const line=src.slice(0,n.start).split('\n').length; unguarded.push(b.file+':'+line+' '+src.slice(n.start,Math.min(n.end,n.start+110)).replace(/\n/g,' ')); }
  }});
}
console.log('setItem calls',tot,'not lexically inside try:',unguarded.length); for(const u of unguarded)console.log('  ',u);
