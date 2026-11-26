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
test('two colours like a card: main rubric (kind) and sub rubric (section, else repetition, else main again); remembered colours win',()=>{
 const T=load();
 const a=T.tintFor('S · A1'),a2=T.tintFor('S · A2'),b=T.tintFor('S · B'),s=T.tintFor('S · A1b');
 assert.equal(a.main,T.LETTER_COLORS[0]);assert.equal(a.sub,T.OCC_COLORS[0],'A1: sub = repetition colour');assert.equal(a2.sub,T.OCC_COLORS[1]);
 assert.equal(b.sub,b.main,'B (one colour): twice the same colour');assert.equal(s.sub,T.shade(T.LETTER_COLORS[0],1),'A1b: sub = section shade');
 const card=T.cardColors('S · A1');assert.equal(card.border,T.OCC_COLORS[0],'card border = sub rubric');assert.match(card.background,/^#[0-9a-f]{6}$/,'card body = main rubric (darkened, session format)');
 T.remember('S · A1',{tag:'A1',main:'#123456',sub:'#abcdef'});assert.deepEqual(T.tintFor('S · A1'),{tag:'A1',main:'#123456',sub:'#abcdef'});
 assert.deepEqual(T.cardColors('Pattern A'),{},'untagged material keeps its normal card');assert.equal(T.cardColors('S · A1').border,'#abcdef');
});
