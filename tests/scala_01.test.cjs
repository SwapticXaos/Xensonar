// SCALA-01: .scl import/export adapter on the Grid library owner. Parser follows the Scala format: '!' comments, description line,
// note count, then pitches (cents with a dot, ratios a/b or integers); 1/1 implied; the last pitch is the period.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/myzel/01_effect_mapping.js'),'utf8');
function cut(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i,a);return src.slice(i,j)}
const body=cut('function __xenScalaCents(','async function Zoe(');
const saved=[];
const env={LJ:t=>{saved.push(t);return t.id},Voe:()=>'custom:test',
  hc:id=>({'12edo':{label:'12 EDO'},'19edo':{label:'19 EDO'},ji:{label:'Just Intonation'},bp:{label:'Bohlen-Pierce (13-EDT)'}})[id],
  vF:id=>id==='bp'?1200*Math.log2(3):1200,
  Kp:id=>id==='12edo'?Array.from({length:12},(_,i)=>i*100):id==='19edo'?Array.from({length:19},(_,i)=>i*1200/19):id==='bp'?Array.from({length:13},(_,i)=>i*1200*Math.log2(3)/13):[0,203.9,386.3,701.9],
  fc:[{cents:0,label:'Root'},{cents:203.9,label:'9/8'},{cents:386.3,label:'5/4'},{cents:701.9,label:'3/2'}]};
const S=new Function(...Object.keys(env),body+';return {__xenScalaParse,__xenScalaImport,__xenScalaWrite}')(...Object.values(env));

test('parses cents, ratios, integers and comments; 1/1 implied; last pitch is the period',()=>{
  const q=S.__xenScalaParse(`! meanquar.scl\n!\n1/4-comma meantone scale. Pietro Aaron's temperament (1523)\n 12\n!\n 76.04900\n 193.15686\n 310.26471\n 5/4\n 503.42157\n 579.47057\n 696.57843\n 25/16\n 889.73529\n 1006.84314\n 1082.89214\n 2/1\n`,'meanquar.scl');
  assert.strictEqual(q.label,'meanquar');assert.strictEqual(q.stepCents.length,12);assert.strictEqual(q.stepCents[0],0);
  assert.ok(Math.abs(q.periodCents-1200)<1e-9);assert.ok(Math.abs(q.stepCents[4]-386.3137)<1e-3,'5/4 as cents');
  const t=S.__xenScalaParse('Bohlen-Pierce\n13\n'+Array.from({length:12},(_,i)=>((i+1)*1901.955/13).toFixed(5)).join('\n')+'\n3/1\n');
  assert.ok(Math.abs(t.periodCents-1901.955)<.01,'tritave period');
});
test('rejects broken files with a clear message',()=>{
  assert.throws(()=>S.__xenScalaParse('only a description\n'),/note count/);
  assert.throws(()=>S.__xenScalaParse('x\n3\n100.0\n'),/lists 3 notes but contains 1/);
  assert.throws(()=>S.__xenScalaParse('x\n1\nabc\n'),/bad pitch/);
});
test('import saves ONE custom grid through the library owner (cents → cdo/cdt, pure ratios → cji)',()=>{
  saved.length=0;const r=S.__xenScalaImport('x\n3\n 9/8\n 3/2\n 2/1\n','pent.scl');
  assert.strictEqual(saved.length,1);assert.strictEqual(saved[0].family,'cji','all steps are ratios: custom JI');assert.strictEqual(saved[0].periodFamily,'octave');assert.strictEqual(saved[0].divisionKind,'ratio');assert.deepStrictEqual(saved[0].stepRatios,{'203.9':'9/8','702.0':'3/2'});
  assert.strictEqual(r.id,'custom:test');assert.deepStrictEqual(saved[0].stepCents.map(c=>Math.round(c*10)/10),[0,203.9,702]);
  S.__xenScalaImport('bp\n2\n 950.0\n 3/1\n','bp.scl');assert.strictEqual(saved[1].periodFamily,'tritave');assert.strictEqual(saved[1].family,'cdt');
  S.__xenScalaImport('mix\n3\n 5/4\n 700.0\n 2/1\n','mix.scl');assert.strictEqual(saved[2].family,'cdo','one step in cents keeps it a custom division');assert.deepStrictEqual(saved[2].stepRatios,{'386.3':'5/4'});
});
test('export writes valid Scala and reads back to the same steps (EDO, tritave, JI ratios)',()=>{
  const e=S.__xenScalaWrite('12edo');assert.match(e.text,/^! 12 EDO\.scl\n!\n12 EDO · exported from XenSonar\n 12\n!\n 100\.00000\n/);assert.match(e.text,/\n 2\/1\n$/);
  for(const id of ['12edo','19edo','bp']){const back=S.__xenScalaParse(S.__xenScalaWrite(id).text);const want=env.Kp(id);
    assert.strictEqual(back.stepCents.length,want.length,id);back.stepCents.forEach((c,i)=>assert.ok(Math.abs(c-want[i])<1e-4,id+' step '+i));assert.ok(Math.abs(back.periodCents-env.vF(id))<1e-4)}
  assert.match(S.__xenScalaWrite('ji').text,/\n 9\/8\n 5\/4\n 3\/2\n 2\/1\n$/,'JI keeps its ratios');
});
