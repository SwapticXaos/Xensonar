'use strict';
/* What the script bytes consist of (analysis only): comments, whitespace, string/template data, code. node tools/slim/composition.cjs */
const acorn=require('acorn');
const {out,blocks,fileAt}=require('./page.cjs').load();
const tot={all:0,comments:0,whitespace:0,strings:0,templates:0,code:0};const perFile=new Map();const bigStr=[];
const add=(file,k,n)=>{tot[k]+=n;let o=perFile.get(file);if(!o)perFile.set(file,o={comments:0,whitespace:0,strings:0,templates:0,all:0});if(k in o)o[k]+=n};
for(const b of blocks){if(b.kind==='other')continue;const src=out.slice(b.start,b.end);tot.all+=src.length;
 let pos=b.start;while(pos<b.end){const p=fileAt(pos);const e=Math.min(b.end,p.end);add(p.file,'all',e-pos);pos=e}
 const comments=[];let covered=0;let lastEnd=0;
 try{for(const t of acorn.tokenizer(src,{ecmaVersion:'latest',sourceType:'module',onComment:(blk,text,s,e)=>comments.push([s,e])})){
   if(t.type.label==='string'){add(fileAt(b.start+t.start).file,'strings',t.end-t.start);if(t.end-t.start>3000)bigStr.push([t.end-t.start,fileAt(b.start+t.start).file,src.slice(t.start,t.start+70)])}
   else if(t.type.label==='template'){add(fileAt(b.start+t.start).file,'templates',t.end-t.start);if(t.end-t.start>3000)bigStr.push([t.end-t.start,fileAt(b.start+t.start).file,src.slice(t.start,t.start+70).replace(/\n/g,'⏎')])}
   covered+=t.end-t.start}}catch(e){console.log('tokenizer stopped in',b.id,e.message)}
 let c=0;for(const [s,e] of comments){c+=e-s;add(fileAt(b.start+s).file,'comments',e-s)}
 const ws=(src.match(/\s/g)||[]).length; // includes whitespace inside strings/comments (small overestimate)
 add(fileAt(b.start).file,'whitespace',0);tot.whitespace+=ws;
}
tot.code=tot.all-tot.comments-tot.whitespace-tot.strings-tot.templates;
console.log(JSON.stringify(tot));
for(const k of ['comments','whitespace','strings','templates','code'])console.log(k.padEnd(11),String(tot[k]).padStart(9),(100*tot[k]/tot.all).toFixed(1)+'%');
console.log('\nfiles with most comment characters:');for(const [f,o] of [...perFile].sort((a,b)=>b[1].comments-a[1].comments).slice(0,12))console.log(String(o.comments).padStart(8),'/',String(o.all).padStart(8),f);
console.log('\nfiles with most string+template data:');for(const [f,o] of [...perFile].sort((a,b)=>(b[1].strings+b[1].templates)-(a[1].strings+a[1].templates)).slice(0,22))console.log(String(o.strings+o.templates).padStart(8),'/',String(o.all).padStart(8),f);
console.log('\nlargest single literals:');for(const [n,f,s] of bigStr.sort((a,b)=>b[0]-a[0]).slice(0,30))console.log(String(n).padStart(8),f.padEnd(60),s.slice(0,60));
