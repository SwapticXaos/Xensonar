'use strict';
/* Provably unreachable declarations in the XenSonar sources (analysis tool, never part of index.html).
 *
 *   node tools/slim/dead_code.cjs            report only
 *   node tools/slim/dead_code.cjs --apply    delete them from src/** (then: python3 tools/build.py and run all tests)
 *   node tools/slim/dead_code.cjs --json f   write the full list to file f
 *
 * Method: every function declaration, class declaration and variable declarator with a side-effect-free initializer is a "pure
 * item". A reference keeps its target alive only if it sits in live code (code outside any pure item, or inside a live item).
 * Everything not reached from live code is dead, including dead cycles. Deleting a pure item cannot change behaviour.
 * Scope facts of this code base that the tool knows about:
 *  - the main bundle is one <script type="module">; room and function payloads are evaluated by DIRECT eval inside it, so their
 *    free identifiers are references into the module scope;
 *  - top-level names of classic <script> blocks are globals and are never touched;
 *  - names that occur as words in tests/ or tools/ are kept (probe builds evaluate code inside the bundle, unit tests cut source
 *    text at declaration names); leading comments are removed only with function/class declarations and only if shorter than them.
 */
const fs=require('fs'),path=require('path');
const acorn=require('acorn'),walk=require('acorn-walk'),eslintScope=require('eslint-scope');
const ROOT=path.resolve(__dirname,'../..');
const APPLY=process.argv.includes('--apply');
const JSON_OUT=process.argv.includes('--json')?process.argv[process.argv.indexOf('--json')+1]:null;
const NO_TEST_KEEP=process.argv.includes('--ignore-tests');
/* what-if: --without a,b,c treats these module-level names as removed and reports what only they keep alive (never use with --apply) */
const WITHOUT=new Set(process.argv.includes('--without')?process.argv[process.argv.indexOf('--without')+1].split(','):[]);
const REFS_TO=process.argv.includes('--who-uses')?process.argv[process.argv.indexOf('--who-uses')+1].split(','):null;
if(WITHOUT.size&&APPLY){console.error('--without is a what-if analysis and cannot be applied');process.exit(2)}
const {out,pieces,blocks,fileAt,applyDeletions}=require('./page.cjs').load();

/* ---------- purity ---------- */
const PURE_NS=new Set(['Math','Number','Symbol','Object','Array','String','JSON','Infinity','NaN','undefined','Float32Array','Float64Array','Uint8Array','Int32Array','Uint32Array','Int16Array','Uint16Array','Int8Array']);
const PURE_NEW=new Set(['Set','Map','WeakMap','WeakSet','Float32Array','Float64Array','Uint8Array','Uint8ClampedArray','Int8Array','Int16Array','Uint16Array','Int32Array','Uint32Array','Array','RegExp']);
const PURE_CALLS=new Set(['Object.freeze','Object.create','Object.seal','Symbol','Symbol.for','Number','String','Boolean','Math.max','Math.min','Math.pow','Math.sqrt','Math.log','Math.log2','Math.exp','Math.round','Math.floor','Math.ceil','Math.abs','Math.sin','Math.cos','Math.tan','Math.atan','Math.atan2','Math.PI']);
function calleeName(n){if(n.type==='Identifier')return n.name;if(n.type==='MemberExpression'&&!n.computed&&n.object.type==='Identifier'&&n.property.type==='Identifier')return n.object.name+'.'+n.property.name;return null}
function pureClass(c){
 if(c.superClass&&!(c.superClass.type==='Identifier'||(c.superClass.type==='MemberExpression'&&!c.superClass.computed)))return false;
 for(const e of c.body.body){
  if(e.type==='StaticBlock')return false;
  if(e.computed&&!isPure(e.key))return false;
  if(e.type==='PropertyDefinition'&&e.static&&!isPure(e.value))return false;
 }return true;
}
function pureBody(fn){ // IIFE used as a module: only declarations and a pure return
 if(fn.async||fn.generator||fn.params.length)return false;
 if(fn.body.type!=='BlockStatement')return isPure(fn.body);
 for(const s of fn.body.body){
  if(s.type==='FunctionDeclaration'||s.type==='EmptyStatement')continue;
  if(s.type==='ClassDeclaration'){if(!pureClass(s))return false;continue}
  if(s.type==='VariableDeclaration'){for(const d of s.declarations)if(d.id.type!=='Identifier'||!isPure(d.init))return false;continue}
  if(s.type==='ReturnStatement'){if(!isPure(s.argument))return false;continue}
  return false;
 }return true;
}
function isPure(n){
 if(!n)return true;
 switch(n.type){
  case 'Literal':case 'Identifier':case 'FunctionExpression':case 'ArrowFunctionExpression':case 'ThisExpression':return true;
  case 'TemplateLiteral':return n.expressions.every(isPure);
  case 'TaggedTemplateExpression':return calleeName(n.tag)==='String.raw'&&n.quasi.expressions.every(isPure);
  case 'ClassExpression':return pureClass(n);
  case 'ObjectExpression':return n.properties.every(p=>p.type==='Property'&&(!p.computed||isPure(p.key))&&isPure(p.value));
  case 'ArrayExpression':return n.elements.every(e=>e===null||(e.type!=='SpreadElement'&&isPure(e)));
  case 'UnaryExpression':return n.operator!=='delete'&&isPure(n.argument);
  case 'BinaryExpression':case 'LogicalExpression':return n.operator!=='in'&&n.operator!=='instanceof'&&isPure(n.left)&&isPure(n.right);
  case 'ConditionalExpression':return isPure(n.test)&&isPure(n.consequent)&&isPure(n.alternate);
  case 'SequenceExpression':return n.expressions.every(isPure);
  case 'ParenthesizedExpression':return isPure(n.expression);
  case 'MemberExpression':return !n.computed&&n.object.type==='Identifier'&&PURE_NS.has(n.object.name);
  case 'NewExpression':return n.callee.type==='Identifier'&&PURE_NEW.has(n.callee.name)&&n.arguments.every(a=>a.type!=='SpreadElement'&&isPure(a));
  case 'CallExpression':{
   if((n.callee.type==='FunctionExpression'||n.callee.type==='ArrowFunctionExpression')&&n.arguments.length===0)return pureBody(n.callee);
   const name=calleeName(n.callee);return !!name&&PURE_CALLS.has(name)&&n.arguments.every(a=>a.type!=='SpreadElement'&&isPure(a));}
  default:return false;
 }
}

/* ---------- names used by tests and tools (kept) ---------- */
const testWords=new Set();
if(!NO_TEST_KEEP){const scan=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);
  if(e.isDirectory()){if(e.name==='node_modules'||e.name==='fixtures'||e.name==='slim')continue;scan(p)}
  else if(/\.(cjs|js|mjs|py|json|txt)$/.test(e.name)&&fs.statSync(p).size<4e6){for(const w of fs.readFileSync(p,'utf8').match(/[A-Za-z_$][\w$]*/g)||[])testWords.add(w)}}};
 scan(path.join(ROOT,'tests'));scan(path.join(ROOT,'tools'));}

/* ---------- analysis of one block ---------- */
const CONTAINER=new Set(['Program','BlockStatement','StaticBlock','SwitchCase']);
function analyse(block){
 const shift=block.kind==='island'?1:0;
 const src=block.kind==='island'?'('+out.slice(block.start,block.end)+'\n)':out.slice(block.start,block.end);
 const comments=[];
 const ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:block.kind==='module'?'module':'script',allowReturnOutsideFunction:block.kind==='room',allowAwaitOutsideFunction:block.kind==='room',ranges:true,onComment:comments});
 const sm=eslintScope.analyze(ast,{ecmaVersion:2022,sourceType:block.kind==='module'?'module':'script',impliedStrict:block.kind!=='classic',ignoreEval:true,nodejsScope:block.kind==='room'||block.kind==='island'});
 // items + owner of every identifier
 const items=[];const itemOf=new Map();
 const mk=(node,decl,kind)=>{const it={node,decl,kind,live:false,refs:new Set(),variable:null};items.push(it);itemOf.set(node,it);return it};
 const owner=new Map();const evalScopes=[];
 walk.fullAncestor(ast,(node,_s,anc)=>{
  const parent=anc[anc.length-2];
  if(node.type==='FunctionDeclaration'&&parent&&(CONTAINER.has(parent.type)))mk(node,node,'function');
  else if(node.type==='ClassDeclaration'&&parent&&CONTAINER.has(parent.type)&&pureClass(node))mk(node,node,'class');
  else if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&parent.type==='VariableDeclaration'&&isPure(node.init)){
   const gp=anc[anc.length-3];if(gp&&CONTAINER.has(gp.type))mk(node,parent,'var');}
 if(node.type==='CallExpression'&&node.callee.type==='Identifier'&&node.callee.name==='eval')evalScopes.push(node);
 });
 // fullAncestor is post-order, so the owner of every identifier is resolved in a second pass, once all items are known
 walk.fullAncestor(ast,(node,_s,anc)=>{if(node.type!=='Identifier')return;let o=null;for(let i=anc.length-2;i>=0;i--){const it=itemOf.get(anc[i]);if(it){o=it;break}}owner.set(node,o)});
 // variables
 const topScope=block.kind==='module'?sm.globalScope.childScopes[0]:(block.kind==='room'||block.kind==='island')?sm.globalScope.childScopes[0]:sm.globalScope;
 const vars=[];const varOfItem=new Map();
 for(const scope of sm.scopes){
  const protectedScope=block.kind==='classic'&&scope===sm.globalScope;
  for(const v of scope.variables){
   const defs=v.defs;if(!defs.length){continue}
   const its=defs.map(d=>d.type==='FunctionName'?itemOf.get(d.node):d.type==='ClassName'?itemOf.get(d.node):d.type==='Variable'?itemOf.get(d.node):null);
   const rec={v,scope,items:its.every(Boolean)?its:null,forced:protectedScope,isTop:scope===topScope};
   if(rec.items)for(const it of rec.items){it.variable=rec}
   vars.push(rec);
  }
 }
 // direct eval: every variable visible from that call is alive (except module top level, handled through the payload analysis)
 for(const call of evalScopes){/* find innermost scope containing the call */
  let best=null;for(const s of sm.scopes){const b=s.block;if(b.range[0]<=call.range[0]&&b.range[1]>=call.range[1]&&(!best||b.range[1]-b.range[0]<best.block.range[1]-best.block.range[0]))best=s}
  for(let s=best;s&&s!==topScope&&s!==sm.globalScope;s=s.upper)for(const rec of vars)if(rec.scope===s)rec.forced=true;}
 const free=new Set(sm.globalScope.through.map(r=>r.identifier.name));
 return {block,shift,src,ast,sm,items,vars,owner,comments,free,topScope};
}

const results=blocks.filter(b=>b.kind!=='other').map(b=>{try{return analyse(b)}catch(e){console.error('PARSE/ANALYSIS FAILED for block',b.id||b.kind,e.message);process.exit(2)}});
const moduleRes=results.find(r=>r.block.kind==='module');
const externalIntoModule=new Set();
for(const r of results)if(r.block.kind==='room'||r.block.kind==='island')for(const n of r.free)externalIntoModule.add(n);

/* ---------- liveness ---------- */
let keptForTests=[];
for(const r of results){
 const queue=[];
 const enliven=rec=>{if(!rec.items)return;if(WITHOUT.has(rec.v.name)&&rec.isTop&&r===moduleRes)return;for(const it of rec.items)if(!it.live){it.live=true;queue.push(it)}};
 if(REFS_TO&&r===moduleRes){for(const name of REFS_TO){const rec=r.vars.find(x=>x.isTop&&x.v.name===name);if(!rec){console.log('who-uses',name,': not a module-level name');continue}
   const users=new Set();for(const ref of rec.v.references){const o=r.owner.get(ref.identifier);users.add(o?(o.variable?.v.name||'?')+(o.variable?.isTop?'':' (nested)'):'(top-level code)')}
   console.log('who-uses',name,'('+(rec.items?rec.items[0].node.range[1]-rec.items[0].node.range[0]:'?')+' chars):',[...users].join(', '))}}
 // references grouped by owning item
 const refsByItem=new Map();const rootRefs=[];
 for(const rec of r.vars){
  if(!rec.items)continue;
  for(const ref of rec.v.references){const o=r.owner.get(ref.identifier);
   if(o&&rec.items.includes(o))continue; // self reference
   if(o){let a=refsByItem.get(o);if(!a)refsByItem.set(o,a=[]);a.push(rec)}else rootRefs.push(rec)}
 }
 for(const rec of r.vars){
  if(!rec.items)continue;
  if(rec.forced)enliven(rec);
  else if(rec.isTop&&r===moduleRes&&externalIntoModule.has(rec.v.name))enliven(rec);
 }
 for(const rec of rootRefs)enliven(rec);
 const drain=()=>{while(queue.length){const it=queue.pop();for(const rec of refsByItem.get(it)||[])enliven(rec)}};
 drain();
 // names used by tests: kept, but counted separately
 for(const rec of r.vars){if(!rec.items||rec.items.some(i=>i.live))continue;
  if(testWords.has(rec.v.name)){ /* any nesting level: some tests cut source text at such names */ keptForTests.push({block:r.block.id||r.block.kind,name:rec.v.name});enliven(rec)}}
 drain();
}

/* ---------- deletion ranges ---------- */
const deletions=[];const report=[];
for(const r of results){
 const base=r.block.start-r.shift;const src=r.src;
 const dead=r.items.filter(it=>!it.live&&it.variable&&it.variable.items.every(i=>!i.live));
 const deadSet=new Set(dead);
 const isNested=it=>{ // inside another dead item: covered by the outer deletion
  for(const o of dead)if(o!==it&&o.node.range[0]<=it.node.range[0]&&o.node.range[1]>=it.node.range[1])return true;return false};
 // fast nesting test through sorted ranges
 const sorted=dead.slice().sort((a,b)=>a.node.range[0]-b.node.range[0]||b.node.range[1]-a.node.range[1]);
 const outer=[];let lastEnd=-1;for(const it of sorted){if(it.node.range[0]>=lastEnd){outer.push(it);lastEnd=it.node.range[1]}}
 const commentBefore=new Map(r.comments.map(c=>[c.end,c]));
 const widen=(s,e,wholeStatement,docComment=false)=>{
  if(wholeStatement){
   // adjacent leading comments (same line directly before, or on the lines directly above without a blank line)
   for(;docComment;){let k=s;while(k>0&&(src[k-1]===' '||src[k-1]==='\t'))k--;let nl=0;let j=k;while(j>0&&(src[j-1]==='\n'||src[j-1]==='\r'||src[j-1]===' '||src[j-1]==='\t')){if(src[j-1]==='\n')nl++;j--}
    const c=commentBefore.get(j);if(!c||nl>1||c.end-c.start>e-s)break; /* a comment longer than the declaration describes more than it */
    // the comment must start its own line (or the block)
    let b=c.start;while(b>0&&(src[b-1]===' '||src[b-1]==='\t'))b--;if(b>0&&src[b-1]!=='\n')break;
    s=c.start}
   // swallow the rest of an otherwise empty line
   let a=s;while(a>0&&(src[a-1]===' '||src[a-1]==='\t'))a--;
   if(a===0||src[a-1]==='\n'){let z=e;while(z<src.length&&(src[z]===' '||src[z]==='\t'||src[z]==='\r'))z++;if(src[z]==='\n'){s=a;e=z+1}}
  }
  return [s,e];
 };
 const byDecl=new Map();
 for(const it of outer){
  if(it.kind!=='var'){const [s,e]=widen(it.node.range[0],it.node.range[1],true,true);deletions.push([base+s,base+e]);continue}
  let a=byDecl.get(it.decl);if(!a)byDecl.set(it.decl,a=[]);a.push(it.node);
 }
 for(const [decl,nodes] of byDecl){
  const ds=decl.declarations;const deadIdx=new Set(nodes.map(n=>ds.indexOf(n)));
  if(deadIdx.size===ds.length){const [s,e]=widen(decl.range[0],decl.range[1],true);deletions.push([base+s,base+e]);continue}
  for(let i=0;i<ds.length;){
   if(!deadIdx.has(i)){i++;continue}
   let j=i;while(j+1<ds.length&&deadIdx.has(j+1))j++;
   if(i===0)deletions.push([base+ds[0].range[0],base+ds[j+1].range[0]]);
   else deletions.push([base+ds[i-1].range[1],base+ds[j].range[1]]);
   i=j+1;
  }
 }
 for(const it of outer){const p=fileAt(base+it.node.range[0]);report.push({block:r.block.id||r.block.kind,file:p.file,name:it.variable.v.name,kind:it.kind,bytes:it.node.range[1]-it.node.range[0],top:it.variable.isTop})}
 r.deadCount=dead.length;r.outerCount=outer.length;
}
deletions.sort((a,b)=>a[0]-b[0]);
const merged=[];for(const d of deletions){const l=merged[merged.length-1];if(l&&d[0]<=l[1])l[1]=Math.max(l[1],d[1]);else merged.push(d.slice())}

/* ---------- report ---------- */
const total=merged.reduce((a,d)=>a+d[1]-d[0],0);
const perFile=new Map();for(const x of report){perFile.set(x.file,(perFile.get(x.file)||0)+x.bytes)}
console.log('dead declarations (outermost):',report.length,' characters to delete:',total,' of',out.length,'('+(100*total/out.length).toFixed(2)+'%)');
console.log('by kind:',JSON.stringify(report.reduce((o,x)=>(o[x.kind]=(o[x.kind]||0)+1,o),{})),' module-top-level:',report.filter(x=>x.top).length,' kept only because a test/tool mentions the name:',keptForTests.length);
console.log('\nlargest files by dead characters:');
for(const [f,b] of [...perFile].sort((a,b)=>b[1]-a[1]).slice(0,25))console.log(String(b).padStart(8),f);
console.log('\nlargest dead declarations:');
for(const x of report.slice().sort((a,b)=>b.bytes-a.bytes).slice(0,40))console.log(String(x.bytes).padStart(8),x.kind.padEnd(8),x.name.padEnd(44),x.file);
if(JSON_OUT)fs.writeFileSync(JSON_OUT,JSON.stringify({total,report,keptForTests},null,1));

/* ---------- apply ---------- */
if(APPLY){const changed=applyDeletions(merged);console.log('\nAPPLIED: rewrote',changed,'files. Now: python3 tools/build.py, rerun this tool (must parse and find nothing new), then all tests.')}
