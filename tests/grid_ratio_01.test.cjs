// GRID-RATIO-01: typed ratio -> cents above the root, folded into the period (Period Workbench, Grid Workbench right column).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/myzel/01_effect_mapping.js'),'utf8');
const i=src.indexOf('function __xenRatioStep('),j=src.indexOf('function Woe(e){',i);assert(i>=0&&j>i);
const R=new Function('Pi','_A',src.slice(i,j)+';return __xenRatioStep')(e=>Math.round(e*10)/10,.15);
const near=(a,b,t=.051)=>assert.ok(Math.abs(a-b)<=t,a+' vs '+b);
test('simple and complex JI ratios become cents above the root',()=>{
  near(R('3/2',1200).cents,702.0);near(R('81/64',1200).cents,407.8);near(R('11/8',1200).cents,551.3);near(R('5/4',1200).cents,386.3);
  near(R('1001/1000',1200).cents,1.7);near(R("4095/4096",1200).cents,1199.6);
  assert.strictEqual(R('3 / 2',1200).label,'3/2');assert.strictEqual(R('18/16',1200).label,'9/8','label is reduced');
  assert.strictEqual(R('9:8',1200).label,'9/8','colon works');near(R('1,25',1200).cents,386.3);near(R('7',1200).cents,R('7/1',1200).cents);
});
test('ratios outside one period are folded into it and say so',()=>{
  const a=R('9/4',1200);near(a.cents,203.9);assert.strictEqual(a.folded,true);const b=R('2/3',1200);near(b.cents,498.0);assert.strictEqual(b.folded,true);
  assert.strictEqual(R('3/2',1200).folded,false);

});
test('tritave period folds at 3/1',()=>{near(R('9/2',1902).cents,701.9);near(R('3/2',1902).cents,702.0);near(R('5/3',1902).cents,884.4)});
test('root, whole periods and garbage are refused with a reason',()=>{
  assert.throws(()=>R('1/1',1200),/root or a whole number of periods/);assert.throws(()=>R('2/1',1200),/root or a whole number of periods/);assert.throws(()=>R('4/1',1200),/root/);
  assert.throws(()=>R('3/1',1902),/root/,'tritave period itself');
  assert.throws(()=>R('',1200),/Type a ratio/);assert.throws(()=>R('abc',1200),/not a ratio/);assert.throws(()=>R('3/0',1200),/positive/);assert.throws(()=>R('-3/2',1200),/not a ratio/);assert.throws(()=>R('1/2/3',1200),/not a ratio/);
});
