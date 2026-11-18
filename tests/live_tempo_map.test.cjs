// LIVE-TEMPO-01: the Live Room tempo map. Without a ramp it is the classic absolute grid (beat = t*bpm/60, identical numbers to the
// scheduler before the patch); a ramp glides evenly per beat and is continuous in beat AND time at both ends.
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/rhythm/04_workspace_and_transport.js'),'utf8');
const a=src.indexOf('const __XenLiveTempo='),b=src.indexOf('/* LIVE-TEMPO-01: one scheduler tick');assert(a>0&&b>a);
const make=()=>new Function(src.slice(a,b)+';return __XenLiveTempo')();
const ctx=(t=0)=>({state:'running',currentTime:t});
test('without a ramp: the classic absolute grid, a slider change is a jump',()=>{
  const L=make(),c=ctx(100);assert.strictEqual(L.sync(108,c),false);assert.strictEqual(L.mapped(),false);
  assert.strictEqual(L.beatAt(100),100*108/60);assert.strictEqual(L.timeAt(720),720*60/108);
  assert.strictEqual(L.sync(120,c),false);assert.strictEqual(L.beatAt(100),200,'jump: the absolute grid at the new tempo, as before');
});
test('a ramp: begins at the given 16th, glides evenly per beat, lasts exactly the given beats, continuous at both ends',()=>{
  const L=make(),c=ctx(50);L.sync(108,c);const commits=[];
  assert.ok(L.request(140,8,v=>commits.push(v)));assert.ok(L.hasPending());
  const step=Math.ceil(L.beatAt(50.3)*4);L.begin(step);assert.ok(L.mapped());
  const b0=step/4,t0=step/4*60/108;
  assert.ok(Math.abs(L.timeAt(b0)-t0)<1e-9,'starts exactly where the old grid had that step');
  for(const db of [0,.5,2,4,7.5,8]){const t=L.timeAt(b0+db);assert.ok(Math.abs(L.beatAt(t)-(b0+db))<1e-9,'beatAt(timeAt(b)) = b at +'+db)}
  assert.ok(Math.abs(L.bpmAt(L.timeAt(b0+4))-124)<1e-6,'half way in beats = half way in tempo (even per beat)');
  const t1=L.timeAt(b0+8);assert.ok(Math.abs(L.bpmAt(t1)-140)<1e-9);
  const eps=1e-7;assert.ok(Math.abs((L.beatAt(t1+eps)-L.beatAt(t1-eps))/(2*eps)*60-140)<1e-3,'tempo continuous at the end');
  assert.ok(Math.abs((L.beatAt(t0+eps)-L.beatAt(t0-eps))/(2*eps)*60-108)<1e-3,'tempo continuous at the start');
  // exact duration: integral of 60/bpm over 8 beats = (60/k) ln(140/108), k = 4 BPM per beat
  assert.ok(Math.abs((t1-t0)-15*Math.log(140/108))<1e-9);
  // commit once when the clock passes the end; the app state then equals the target and the map keeps the phase
  const at=t=>{c.currentTime=t;return c};L.sync(108,at(t1-.01));assert.deepStrictEqual(commits,[]);L.sync(108,at(t1+.01));assert.deepStrictEqual(commits,[140]);L.sync(108,at(t1+.02));assert.deepStrictEqual(commits,[140],'once');
  assert.ok(L.sync(140,at(t1+.05)),'state = target: the map stays in charge (no jump)');assert.ok(Math.abs(L.timeAt(b0+12)-(t1+4*60/140))<1e-9);
});
test('slowing down, Stop, Power off, and no scheduler',()=>{
  const L=make(),c=ctx(10);L.sync(140,c);const commits=[];L.request(100,16,v=>commits.push(v));L.begin(Math.ceil(L.beatAt(10.2)*4));
  const mid=L.timeAt(L.beatAt(10.2)+8);assert.ok(L.bpmAt(mid)<140&&L.bpmAt(mid)>100);
  c.currentTime=mid;L.sync(140,c);L.stop(v=>commits.push(v));assert.ok(L.hasPending());L.begin(Math.ceil(L.beatAt(mid+.1)*4));c.currentTime=mid+.5;L.sync(140,c);
  assert.strictEqual(commits.length,1);assert.strictEqual(commits[0],Math.round(L.bpmAt(mid+.05)),'stop = the nearest whole BPM, written once');
  const P=make(),cc=ctx(5);P.sync(120,cc);const pc=[];P.request(90,8,v=>pc.push(v));P.begin(Math.ceil(P.beatAt(5.2)*4));P.halt();assert.deepStrictEqual(pc,[90],'Power off mid-glide lands on the target');assert.strictEqual(P.mapped(),false);
  const N=make(),nc=[],off=ctx(1);N.sync(100,off);off.state='suspended';assert.strictEqual(N.request(80,8,v=>nc.push(v)),false);assert.deepStrictEqual(nc,[80],'no running clock: the tempo is set directly');
});
