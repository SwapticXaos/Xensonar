'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const controls=read('src/forge/editor/09_workflow_controls.js'),routing=read('src/forge_and_melodic/10_audition_and_persistence.js'),extraction=read('src/forge/ui/02_donor_routing_and_hearing.js'),dialog=read('src/06_workbench_dialog.js'),css=read('styles/08_forge_workflow.css');
const piece=(s,a,b)=>{const from=s.indexOf(a);assert(from>=0,a);const to=s.indexOf(b,from+a.length);assert(to>from,b);return s.slice(from,to)};
// Reproduce F3.4: the state still has Emilia's machine even after user explicitly chooses Donor.
const history=[];const state={carrierIntegralSelection:{machineId:'emilia-nodal-carrier',source:'user'},sourcePreviewMode:'forge',setCarrierIntegralSelection(v){this.carrierIntegralSelection={...this.carrierIntegralSelection,...v}},setCarrierIntegralHarmonicXplore(){}};
let donorSelected=false;let epoch=0;
const ctx={__F35611DonorIntent:false,__f333Epoch:0,
 pe:{getState:()=>state,setState:()=>history.push('reset-play'),subscribe:()=>()=>{}},
 Vt:{getSnapshot:()=>({selected:donorSelected}),subscribe:()=>()=>{},selectCarrier:()=>{donorSelected=false;history.push('carrier')},selectDonor:()=>{donorSelected=true;history.push('donor');return true}},
 LGe:[{id:'emilia',machineId:'emilia-nodal-carrier'},{id:'fractalia',machineId:'fractalia-self-carrier'},{id:'pure-dieter',machineId:'raw-darkpsy-oscillator'}],
 __f333Stop:()=>history.push('stop'),__f333Idle:()=>({}),
 __f3562EnsureDonor:async()=>{history.push('resolved-donor');return true},
 __f352Enabled:()=>true,__f333WorkingSource:()=>false,
 __F352Runtime:{play:async()=>{history.push('played-donor-hybrid');return true}},
 window:{dispatchEvent:ev=>history.push('change:'+ev.detail)},CustomEvent:class CustomEvent{constructor(_,data){this.detail=data.detail}},
};vm.createContext(ctx);
vm.runInContext(piece(controls,'const __ForgeListeningMode=','function __useForgeListeningMode')+'\n globalThis.__ForgeListeningModeTest=__ForgeListeningMode;',ctx);
vm.runInContext(piece(routing,'function __f333Route(state) {','async function __f333RenderCurrentRaw'),ctx);
vm.runInContext(piece(routing,'async function __f333PlayCurrent(state,options={}) {','async function __f333ExportCurrent'),ctx);
assert.equal(ctx.__ForgeListeningModeTest.value(),'emilia','initial machine is Emilia');
ctx.__ForgeListeningModeTest.choose('donor',{prepare:false});
assert.equal(ctx.__ForgeListeningModeTest.value(),'donor','selector actually selects Donor');
assert.equal(ctx.__f333Route(state),'donor-pending','missing donor cannot silently fall through to Emilia');
(async()=>{
 const played=await ctx.__f333PlayCurrent(state,{});
 assert.equal(played,true,'play finishes');
 assert.equal(ctx.__f333Route(state),'hybrid','Donor takes precedence over stale Emilia machine');
 assert(history.includes('resolved-donor')&&history.includes('played-donor-hybrid'),'real play resolved and used donor renderer');
 ctx.__ForgeListeningModeTest.choose('emilia');assert.equal(ctx.__ForgeListeningModeTest.value(),'emilia');assert.equal(ctx.__f333Route(state),'hearing','explicit machine selection recovered');
 assert.match(extraction,/__f435OnExtractTimbre\(\);le\("extract-timbre"/,'Extract Timbre uses conditional routing (F4.3.5)');
 assert.match(dialog,/__ForgeListeningMode\.choose\('donor',\{prepare:false\}\);__F341Workbench\.preset\('material-flow-original'\)/,'workshop direct-entry uses same default');
 assert.match(controls,/data-forge-transport-picker/,'second selector is restored');
 assert.match(controls,/data-forge-hearing-destinations/,'routing destinations are distinct from status');
 assert.match(css,/\.f31-play-rack \.f31-transport-main\{\s*position:relative;display:grid/,'project name remains first-row grid column');
 assert.match(css,/\.f31-play-rack \.f34-transport-status\{position:absolute;left:0;top:51px/,'status below controls and not its own row');
 assert.match(css,/\.f31-play-rack \.f34-project-save-on-main\{grid-column:5/,'project + save top right');
 console.log('PASS F3.5: Emilia → Donor → Play uses donor renderer; no fallback; explicit Donor selection and conditional Timbre extraction; hearing picker, status, project placement preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
