// GRID-RATIO-01 / GRID-CJI-01: typed ratio -> cents above the root, folded into the period (ratio folded too: 9/4 -> 9/8);
// a grid whose steps are all exact ratios is classified CJI (custom JI) and keeps its fractions (stepRatios).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/myzel/01_effect_mapping.js'),'utf8');
const rt=fs.readFileSync(path.join(__dirname,'..','src/runtime/01_instrument_state.js'),'utf8');
const i=src.indexOf('function __xenRatioStep('),j=src.indexOf('function Woe(e){',i);assert(i>=0&&j>i);
const ri=rt.indexOf('function __xenRatioCents('),rj=rt.indexOf('\n',rt.indexOf('function __xenStoredRatios('));assert(ri>=0&&rj>ri);
const z0=src.indexOf('function z6('),z1=src.indexOf('function qx(',z0);assert(z0>=0&&z1>z0);
const Pi=e=>Math.round(e*10)/10;
const H=new Function('Pi','_A','dI','rT',rt.slice(ri,rj)+'\n'+src.slice(i,j)+'\n'+src.slice(z0,z1)+';return {__xenRatioStep,__xenStepRatios,__xenRatioMap,__xenStoredRatios,z6,__xenRatioCents}')(Pi,.15,{octave:1200,tritave:1902},(n,t)=>Array.from({length:Math.max(1,n)},(_,k)=>Pi(k/Math.max(1,n)*t)));
const R=H.__xenRatioStep;const near=(a,b,t=.051)=>assert.ok(Math.abs(a-b)<=t,a+' vs '+b);
test('simple and complex JI ratios become cents above the root',()=>{
  near(R('3/2',1200).cents,702.0);near(R('81/64',1200).cents,407.8);near(R('11/8',1200).cents,551.3);near(R('5/4',1200).cents,386.3);
  near(R('1001/1000',1200).cents,1.7);near(R('4095/4096',1200).cents,1199.6);
  assert.strictEqual(R('3 / 2',1200).label,'3/2');assert.strictEqual(R('18/16',1200).label,'9/8','label is reduced');
  assert.strictEqual(R('9:8',1200).label,'9/8','colon works');near(R('1,25',1200).cents,386.3);assert.strictEqual(R('1,25',1200).label,'5/4','decimals become fractions');
  assert.strictEqual(R('1.5',1200).label,'3/2');near(R('7',1200).cents,R('7/4',1200).cents);assert.strictEqual(R('7',1200).label,'7/4','7/1 folds to 7/4');
});
test('ratios outside one period are folded into it (ratio and cents) and say so',()=>{
  const a=R('9/4',1200);near(a.cents,203.9);assert.strictEqual(a.label,'9/8');assert.strictEqual(a.folded,true);near(a.raw,1403.9);
  const b=R('2/3',1200);near(b.cents,498.0);assert.strictEqual(b.label,'4/3');assert.strictEqual(b.folded,true);assert.strictEqual(R('3/2',1200).folded,false);
  near(R('1/1000',1200).cents,(1200*Math.log2(1/1000)%1200+1200)%1200);assert.match(R('1/1000',1200).label,/^\d+\/\d+$/);
});
test('tritave period folds at 3/1; other periods take ratios inside the period only',()=>{
  assert.strictEqual(R('9/2',1902).label,'3/2');near(R('9/2',1902).cents,1200*Math.log2(1.5));assert.strictEqual(R('5/3',1902).label,'5/3');assert.strictEqual(R('2/1',1902).label,'2/1');
  near(R('3/2',1300).cents,702.0);assert.throws(()=>R('9/4',1300),/outside the period/);
});
test('root, whole periods and garbage are refused with a reason',()=>{
  assert.throws(()=>R('1/1',1200),/root or a whole number of periods/);assert.throws(()=>R('2/1',1200),/root or a whole number of periods/);assert.throws(()=>R('4/1',1200),/root/);
  assert.throws(()=>R('3/1',1902),/root/,'tritave period itself');
  assert.throws(()=>R('',1200),/Type a ratio/);assert.throws(()=>R('abc',1200),/not a ratio/);assert.throws(()=>R('3/0',1200),/positive/);assert.throws(()=>R('-3/2',1200),/not a ratio/);assert.throws(()=>R('1/2/3',1200),/not a ratio/);
  assert.throws(()=>R('99999999999999999999/3',1200),/below 9/);
});
test('stepRatios follow the steps: exact ratios only, dragged markers lose them, junk is dropped',()=>{
  const steps=[0,203.9,407.8,498,600],tr={'9/8':203.9,'81/64':407.8,'4/3':498,'7/5':600};
  assert.deepStrictEqual(H.__xenStepRatios(steps,tr),{'203.9':'9/8','407.8':'81/64','498.0':'4/3'},'600 c is not 7/5 (582.5 c): dragged away, ratio dropped');
  assert.deepStrictEqual(H.__xenStepRatios([0,203.9],{'foo':1,'9/0':2}),{});
  const keep=H.__xenRatioMap({'203.9':'9/8','407.8':'5/4','999.0':'3/2','498.0':'nonsense'},[0,203.9,407.8,498]);assert.deepStrictEqual(keep,{stepRatios:{'203.9':'9/8'}},'5/4 does not match 407.8 c; unknown steps and junk are dropped');
  assert.deepStrictEqual(H.__xenRatioMap(undefined,[0,100]),{},'old grids stay unchanged');assert.deepStrictEqual(H.__xenStoredRatios({stepRatios:{'203.9':'9/8'}}),{'9/8':203.9});
});
test('classification: all steps exact ratios -> CJI; one cents-only step or an equal division stays as before',()=>{
  const all={'9/8':203.9,'81/64':407.8,'4/3':498,'3/2':702};const st=[0,203.9,407.8,498,702];
  const c=H.z6('octave',1200,st,all);assert.deepStrictEqual({f:c.family,k:c.divisionKind,l:c.label},{f:'cji',k:'ratio',l:'5 CJI'});
  const m=H.z6('octave',1200,[...st,1000],all);assert.strictEqual(m.family,'cdo','1000 c has no ratio: custom division');assert.strictEqual(m.label,'6 CDO');
  assert.strictEqual(H.z6('octave',1200,[0,100,200,300,400,500,600,700,800,900,1000,1100],{}).family,'edo');
  assert.strictEqual(H.z6('tritave',1902,[0,500],{'5/3':884.4}).family,'cdt');assert.strictEqual(H.z6('tritave',1902,[0,884.4],{'5/3':884.4}).family,'cji');
  assert.strictEqual(H.z6('octave',1200,st).family,'cdo','callers without ratios behave as before');
});
