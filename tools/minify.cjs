'use strict';
/* MIN-01: compacts the built page for delivery (called by tools/build.py; reads HTML on stdin, writes HTML to stdout).
 * - <script> (classic) and <script type="module">: whitespace, comments and syntax minified by esbuild; NAMES ARE KEPT
 *   (room/function payloads are evaluated by direct eval in the module scope and refer to module names; tests and the probe
 *   build address functions by name).
 * - room and function payloads (application/x-xensonar-room / -function): whitespace and comments only. Their completion value
 *   is what eval returns, so syntax rewriting is not allowed there.
 * - <style>: CSS minified.
 * Everything else (markup, other script types) is copied unchanged. esbuild is pinned in tools/slim/package.json, so the output
 * is reproducible (CI: npm ci --prefix tools/slim). */
const esbuild=require('./slim/node_modules/esbuild');
const input=require('fs').readFileSync(0,'utf8');
(async()=>{
 const parts=[];let last=0;const re=/<(script|style)\b([^>]*)>/gi;let m;
 while((m=re.exec(input))){
  const tag=m[1].toLowerCase(),attrs=m[2],start=m.index+m[0].length,rest=input.slice(start),end=rest.search(new RegExp('</'+tag+'\\s*>','i'));
  if(end<0)throw Error('unterminated <'+tag+'>');
  const body=input.slice(start,start+end);parts.push(input.slice(last,start));
  let out=body;
  if(body.trim()){
   if(tag==='style')out=(await esbuild.transform(body,{loader:'css',minify:true,charset:'utf8',legalComments:'none'})).code.trim();
   else{
    const type=(attrs.match(/type="([^"]*)"/)||[])[1]||'';
    const room=type==='application/x-xensonar-room',island=type==='application/x-xensonar-function';
    if(type===''||type==='module'||/javascript/.test(type)||room||island){
     const code=island?'__xenIsland=(\n'+body+'\n);':body; // a function payload is an expression: minify it as the right side of an assignment
     let r=(await esbuild.transform(code,{loader:'js',charset:'utf8',legalComments:'none',target:'es2022',treeShaking:false,
      format:type==='module'?'esm':undefined,minifyWhitespace:true,minifySyntax:!(room||island),minifyIdentifiers:false})).code.trim();
     if(island){if(!r.startsWith('__xenIsland=')||!r.endsWith(';'))throw Error('unexpected function payload shape');r=r.slice('__xenIsland='.length,-1)}
     out=r;
    }
   }
   if(new RegExp('</'+tag,'i').test(out))throw Error('minified <'+tag+'> would contain its own end tag');
  }
  parts.push(out);last=start+end;re.lastIndex=last;
 }
 parts.push(input.slice(last));
 process.stdout.write(parts.join(''));
})().catch(e=>{console.error('[minify] '+(e.message||e));process.exit(1)});
