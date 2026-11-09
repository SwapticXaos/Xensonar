'use strict';
// Deterministic logical-time coverage of the existing expressive input budget,
// lifecycle tickets, stale hold-plan behavior, and material Worklet hot path.
// No wall-clock performance or hardware XRUN claims are made here.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function realAdmissionGate(){
  const source=read('src/runtime/01_instrument_state.js');
  const start=source.indexOf('function sY(){'),end=source.indexOf('const lY=',start);
  assert(start>=0&&end>start,'real expressive admission gate must exist');
  const scope={Math,Number};vm.createContext(scope);
  vm.runInContext(source.slice(start,end)+';globalThis.makeGate=sY;',scope);
  return scope.makeGate();
}

function materialWorkletCode(source){
  const match=source.match(/const code=("(?:\\.|[^"\\])*?");\s*const contexts=/s);
  assert(match,'embedded material Worklet source must remain extractable');
  return JSON.parse(match[1]);
}

test('expressive wave bursts preserve the allowed 8/32ms, 96-ticket contract and recover after release',()=>{
  const gate=realAdmissionGate();
  const leaseSource=read('src/audio/lifecycle/00_voice_lease.js');
  const scope={Map,Set,WeakMap,Object,Array,Number};vm.createContext(scope);
  vm.runInContext(leaseSource+';globalThis.makeLease=__xenCreateVoiceLease;globalThis.count=__xenVoiceLeaseCount;globalThis.retire=__xenRetireVoiceLeases;',scope);
  const context={state:'running'},live=new Set();let tickets=0;
  const note=(time,id)=>{
    if(!gate.tryStart('wave',time,live.size,true,id))return false;
    const lease=scope.makeLease({context,renderer:'expressive-wave',releaseTicket:()=>{tickets--;},disconnect:()=>{},stop:()=>{}});
    tickets++;assert.equal(lease.commit(),true);live.add(lease);return true;
  };

  for(let i=0;i<8;i++)assert.equal(note(1+i*.003,'fresh-'+i),true,'fresh primary event inside allowed burst window');
  assert.equal(note(1.024,'ninth-in-window'),false,'ninth wave in same 32ms window is throttled');
  assert.equal(tickets,8,'rejected event must not reserve a voice ticket');
  assert.equal(note(1.04,'fresh-after-window'),true,'a fresh event after the rate window is admitted');

  // Fill the independent global scheduled-voice allowance using fresh windows.
  for(let i=9;i<96;i++)assert.equal(note(2+i*.04,'capacity-'+i),true);
  assert.equal(scope.count(context),96);
  assert.equal(note(7,'at-capacity'),false,'global 96-voice cap rejects while full');
  assert.equal(tickets,96,'capacity rejection cannot leak a ticket');

  const released=[...live].slice(0,32);
  for(const lease of released){assert.equal(lease.onEnded(),true);live.delete(lease)}
  assert.equal(scope.count(context),64);
  assert.equal(note(8,'fresh-after-release'),true,'admission recovers after real voice release');
  assert.equal(scope.count(context),65);
  assert.equal(scope.retire(context),65,'context retirement releases every remaining admitted voice');
  live.clear();
  assert.equal(scope.count(context),0);
  assert.equal(tickets,0,'all acquired tickets were returned exactly once');
});

test('stalled hold processor skips stale catch-up and new phase traffic does not change per-sample process',()=>{
  // The real processor contract verifies phase-exact current events and no
  // replay of missed events after a stalled quantum interval.
  const hold=spawnSync(process.execPath,[path.join(__dirname,'hold_resident_processor.cjs')],{encoding:'utf8'});
  assert.equal(hold.status,0,hold.stdout+'\n'+hold.stderr);
  assert.match(hold.stdout,/no catch-up/);

  const current=materialWorkletCode(read('src/mix/03_quick_menu__before_eq-core.js'));
  const processBody=code=>{
    const start=code.indexOf(' process(inputs,outputs)'),end=code.indexOf("registerProcessor('xen-material-phase-v1'",start);
    assert(start>=0&&end>start,'real material process callback must exist');
    return code.slice(start,end);
  };
  // Provenance: SHA-256 of the decoded `process(inputs,outputs)` body in
  // baseline/Source/src/mix/03_quick_menu__before_eq-core.js at checkpoint.
  // Pinning the body keeps this test portable; the baseline checkout is not needed.
  assert.equal(crypto.createHash('sha256').update(processBody(current)).digest('hex'),
    'f60277d717694be7ed349a9842122d4d8081aa7cf9ceef7c72202a3f698ac91a',
    'expressive control-message edits must not add work to the AudioWorklet process callback');
});
