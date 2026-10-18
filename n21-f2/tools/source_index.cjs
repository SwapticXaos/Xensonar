const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
let code='';const spans=m.files.map(file=>{const text=fs.readFileSync(path.join(root,file),'utf8'),start=code.length;code+=text;return {file,start,end:code.length,text}});
const sf=ts.createSourceFile('xensonar-inline.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
if(sf.parseDiagnostics.length)throw Error('Invalid assembled JavaScript');
function owner(pos){let lo=0,hi=spans.length-1;while(lo<=hi){const mid=(lo+hi)>>1,s=spans[mid];if(pos<s.start)hi=mid-1;else if(pos>=s.end)lo=mid+1;else return s}throw Error('Source position outside manifest')}
const host=ts.createCompilerHost({allowJs:true,noLib:true});host.getSourceFile=file=>file===sf.fileName?sf:undefined;host.fileExists=file=>file===sf.fileName;host.readFile=file=>file===sf.fileName?code:undefined;
const checker=ts.createProgram([sf.fileName],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
const declarations=[],symbols=new Map();
function add(name,node){if(!ts.isIdentifier(name))return;const span=owner(name.getStart(sf)),local=span.text.slice(0,name.getStart(sf)-span.start);const record={name:name.text,file:span.file,line:local.split('\n').length};declarations.push(record);const symbol=checker.getSymbolAtLocation(name);if(symbol)symbols.set(symbol,record)}
for(const n of sf.statements){if(n.name)add(n.name,n);if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)add(d.name,d)}
const names=new Set(declarations.map(d=>d.name)),edges=new Map();
function visit(n){if(ts.isIdentifier(n)&&names.has(n.text)){const symbol=ts.isShorthandPropertyAssignment(n.parent)&&n.parent.name===n?checker.getShorthandAssignmentValueSymbol(n.parent):checker.getSymbolAtLocation(n);const d=symbols.get(symbol);if(d){const from=owner(n.getStart(sf)).file;if(from!==d.file){const key=from+'\n'+d.file;if(!edges.has(key))edges.set(key,{from,to:d.file,symbols:new Set});edges.get(key).symbols.add(d.name)}}}ts.forEachChild(n,visit)}visit(sf);
const dependencies=[...edges.values()].map(e=>({...e,symbols:[...e.symbols].sort()})).sort((a,b)=>(a.from+a.to).localeCompare(b.from+b.to));
const result={scope:'Static lexical references in the assembled application. Embedded code strings and registry require paths are not a complete runtime call graph.',declarations,dependencies};
fs.writeFileSync(path.join(root,'source-index.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({sourceUnits:spans.length,topLevelNames:declarations.length,crossUnitDependencyPairs:dependencies.length}));
