const fs=require('fs'),path=require('path'),acorn=require('acorn'),walk=require('acorn-walk');
const dir=process.argv[2]; const idx=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
const tops={}; const stats=[];
for(const b of idx){ if(b.file[0]!=='s')continue;
  const src=fs.readFileSync(path.join(dir,b.file),'utf8');
  const isMod=/type="module"/.test(b.attrs); const lazy=/application\/x-xensonar/.test(b.attrs);
  let ast,err=null,mode=isMod?'module':'script';
  try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:mode,allowReturnOutsideFunction:lazy,allowAwaitOutsideFunction:lazy});}
  catch(e){ // lazy payload may be an expression
    try{ast=acorn.parse('('+src+'\n)',{ecmaVersion:'latest',sourceType:'script'});mode='expr';}catch(e2){err=e.message;}
  }
  const st={file:b.file,id:(b.attrs.match(/id="([^"]+)"/)||[])[1]||'',mode,err,len:src.length};
  if(ast){
    const c={fn:0,emptyCatch:0,catchAll:0,setInterval:0,setTimeout:0,raf:0,addEL:0,remEL:0,MO:0,newAC:0,newOAC:0,ls:0,idb:0,innerHTML:0,evalish:0,ws:0,fetch:0,console:0,debugger:0,worker:0,jsonParse:0,jsonStr:0,strict:false,withStmt:0};
    walk.simple(ast,{
      Function(){c.fn++}, 
      CatchClause(n){c.catchAll++; if(n.body.body.length===0)c.emptyCatch++},
      DebuggerStatement(){c.debugger++}, WithStatement(){c.withStmt++},
      NewExpression(n){const nm=n.callee.name||(n.callee.property&&n.callee.property.name);
        if(nm==='MutationObserver')c.MO++; if(nm==='AudioContext'||nm==='webkitAudioContext')c.newAC++; if(nm==='OfflineAudioContext')c.newOAC++;
        if(nm==='Function')c.evalish++; if(nm==='WebSocket')c.ws++; if(nm==='Worker'||nm==='SharedWorker')c.worker++;},
      CallExpression(n){const cal=n.callee; const nm=cal.name||(cal.property&&(cal.property.name||cal.property.value));
        if(nm==='setInterval')c.setInterval++; if(nm==='setTimeout')c.setTimeout++; if(nm==='requestAnimationFrame')c.raf++;
        if(nm==='addEventListener')c.addEL++; if(nm==='removeEventListener')c.remEL++; if(nm==='eval'&&cal.type==='Identifier')c.evalish++;
        if(nm==='fetch'&&cal.type==='Identifier')c.fetch++;
        if(cal.type==='MemberExpression'&&cal.object.name==='console')c.console++;
        if(cal.type==='MemberExpression'&&cal.object.name==='JSON'){if(nm==='parse')c.jsonParse++; if(nm==='stringify')c.jsonStr++;}
      },
      MemberExpression(n){const p=n.property&&(n.property.name||n.property.value); const o=n.object&&n.object.name;
        if(o==='localStorage'||p==='localStorage')c.ls++; if(o==='indexedDB'||p==='indexedDB')c.idb++;},
      AssignmentExpression(n){if(n.left.type==='MemberExpression'){const p=n.left.property.name||n.left.property.value; if(p==='innerHTML'||p==='outerHTML')c.innerHTML++;}}
    });
    Object.assign(st,c);
    if(mode==='script'&&!lazy){ for(const n of ast.body){
      const add=(name,kind)=>{(tops[name]=tops[name]||[]).push({file:b.file,kind});};
      if(n.type==='FunctionDeclaration')add(n.id.name,'function');
      if(n.type==='ClassDeclaration')add(n.id.name,'class');
      if(n.type==='VariableDeclaration')for(const d of n.declarations){ if(d.id.type==='Identifier')add(d.id.name,n.kind); }
    }}
    if(mode==='module'){ st.modTop=ast.body.length; const names={}; let dupFn=[];
      for(const n of ast.body){ if(n.type==='FunctionDeclaration'){ if(names[n.id.name])dupFn.push(n.id.name); names[n.id.name]=1; } }
      st.modDupFn=dupFn.slice(0,50); st.modFnCount=Object.keys(names).length; st.imports=ast.body.filter(n=>n.type==='ImportDeclaration').length; }
  }
  stats.push(st);
}
const cols=['file','mode','len','fn','emptyCatch','catchAll','setInterval','setTimeout','raf','addEL','remEL','MO','newAC','newOAC','ls','idb','innerHTML','evalish','ws','fetch','console','worker','jsonParse','jsonStr'];
console.log(cols.join('\t'));
const tot={};
for(const s of stats){ console.log(cols.map(k=>s[k]??'').join('\t')+(s.err?'\tERR '+s.err:'')+'\t'+s.id); for(const k of cols) if(typeof s[k]==='number')tot[k]=(tot[k]||0)+s[k]; }
console.log('TOTAL\t\t'+cols.slice(2).map(k=>tot[k]).join('\t'));
const dups=Object.entries(tops).filter(([k,v])=>v.length>1);
console.log('\nCROSS-SCRIPT TOP-LEVEL DUPLICATES:',dups.length); for(const [k,v] of dups)console.log(' ',k,JSON.stringify(v));
const m=stats.find(s=>s.mode==='module'); if(m)console.log('\nMODULE: top-level stmts',m.modTop,'fn',m.modFnCount,'dupFn',m.modDupFn,'imports',m.imports);
