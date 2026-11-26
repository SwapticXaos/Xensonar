'use strict';
// SONG-PART-TAGS-01 (no browser): the designation at the end of a sent title (" · A2b") is parsed, replaced and coloured:
// top = letter colour, edge = repetition colour (none when not repeated), bottom = section shade; remembered colours win.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src','ui','10_song_part_tint.js'),'utf8');
const load=()=>{const m=new Map();const ls={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 return new Function('localStorage','window','u',src+'\nreturn __XenSongPartTint;')(ls,{},{jsx:()=>null})};
test('parse and replace the designation',()=>{
 const T=load();
 assert.deepEqual(T.parse('My Song · A2b'),{tag:'A2b',letter:'A',occ:2,sub:1});
 assert.deepEqual(T.parse('My Song · B'),{tag:'B',letter:'B',occ:0,sub:-1});
 assert.equal(T.parse('Pattern B'),null,'a plain name ending in a capital is no designation');
 assert.equal(T.withTag('My Song','A1a'),'My Song · A1a');assert.equal(T.withTag('My Song · A1a','B2'),'My Song · B2','an old tag is replaced');
 assert.equal(T.withTag('My Song · A1a',null),'My Song');
});
test('colours from the tag, remembered colours win',()=>{
 const T=load();
 const a=T.tintFor('S · A1'),a2=T.tintFor('S · A2'),b=T.tintFor('S · B'),s=T.tintFor('S · A1b');
 assert.equal(a.top,T.LETTER_COLORS[0]);assert.equal(a.edge,T.OCC_COLORS[0]);assert.equal(a2.edge,T.OCC_COLORS[1]);
 assert.equal(b.edge,b.top,'not repeated: no own edge colour');assert.equal(s.bottom,T.shade(T.LETTER_COLORS[0],1));assert.equal(a.bottom,a.top);
 T.remember('S · A1',{tag:'A1',top:'#123456',edge:'#abcdef',bottom:'#123456'});assert.equal(T.tintFor('S · A1').top,'#123456');
 assert.equal(T.quickTint('Pattern A').border,undefined,'untagged material keeps its normal card');assert.equal(T.quickTint('S · A1').border,'#abcdef');
});
