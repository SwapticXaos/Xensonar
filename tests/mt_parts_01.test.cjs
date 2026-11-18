// MT-PARTS-01: named, coloured parts in the Multitrack. A marker may carry a colour (optional, additive data); the colour belongs to
// the part name (same name = same colour), and shades the arrangement from its marker up to the next marker. No template.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const mt=fs.readFileSync(path.join(__dirname,'..','src/post-oct/032-xen-room-multitrack.js'),'utf8');
function cut(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a,'marker '+start);return src.slice(a,b)}
const P=new Function(cut(mt,'const PART_COLORS=','\n',)+'\n'+cut(mt,'const partKey=','/* ---')+';return {PART_COLORS,partKey,partColors,partBands}')();

test('same name shares the colour; unnamed or uncoloured markers stay plain',()=>{
  const ms=[{id:'a',beat:0,name:'Intro'},{id:'b',beat:8,name:'Verse',color:'#fb7185'},{id:'c',beat:24,name:'Chorus'},{id:'d',beat:40,name:' verse '},{id:'e',beat:56,name:''}];
  assert.deepStrictEqual(P.partColors(ms),[null,'#fb7185',null,'#fb7185',null],'the second Verse (other case, spaces) gets the colour of the first');
});
test('bands run from a coloured marker to the next marker (any marker), the last one to the end',()=>{
  const ms=[{id:'a',beat:0,name:'A',color:'#38bdf8'},{id:'b',beat:8,name:'B'},{id:'c',beat:16,name:'A'}];
  assert.deepStrictEqual(P.partBands(ms,40).map(q=>[q.id,q.a,q.b,q.color]),[['a',0,8,'#38bdf8'],['c',16,40,'#38bdf8']]);
  assert.deepStrictEqual(P.partBands([],40),[],'no markers: no parts');
  assert.deepStrictEqual(P.partBands([{id:'x',beat:4,name:'X'}],40),[],'markers without colour: as before');
});
test('the project keeps a valid colour and drops anything else (old projects unchanged)',()=>{
  const src=cut(mt,'const DB=','/* ---------- persistence');
  const m=new Function(src.replace(/^const DB=[^\n]*\n/,"const KEY='current',FORMAT='xensonar.multitrack',VERSION=2;\n")+';return {sanitize}')();
  const out=m.sanitize({format:'xensonar.multitrack',tracks:[{id:'a',clips:[]}],markers:[{id:'x',beat:0,name:'A',color:'#FB7185'},{id:'y',beat:4,name:'B',color:'red;x'},{id:'z',beat:8,name:'C'}]},100);
  assert.deepStrictEqual(out.markers.map(k=>k.color),['#fb7185',undefined,undefined]);
  assert.ok(!('color' in out.markers[2]),'no colour key is added to a plain marker');
  assert.ok(P.PART_COLORS.every(([,c])=>/^#[0-9a-f]{6}$/.test(c)),'palette is valid hex');
});
