'use strict';
// P3C-D4: UI integration invariants; the actual transfer implementation is preserved.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const get=f=>fs.readFileSync(path.join(root,f),'utf8');
const dual=get('src/05_dual_donor.js'),out=get('src/forge/dual/06_output_controls.js'),hud=get('src/audio/entrophon/03_native_bridge.js'),dialog=get('src/06_workbench_dialog.js');
assert(hud.includes('children:"⚙️"'),'collapsed UI uses the gear emoji');
assert(hud.includes('data-runtime-diagnostic-collapsed'));assert(hud.includes('background:"transparent"'));assert(hud.includes('border:0'));
assert(!hud.includes('Load Trace 60 s ▸'),'collapsed UI must not show status text');
assert(dual.includes("'data-dual-action':'use-in-forge'"));assert(dual.includes("'data-dual-action':'hear-in-carrier'"));
assert(dual.includes('onClick:()=>void useBody()'));assert(dual.includes('onClick:()=>void hearHybridInCarrier()'));
assert(!dual.includes('useBody(true)'), 'transfer must not implicitly play the carrier');
assert(dual.includes("setTransferredKey(bodyKey)"),'transfer status must only be set after committed transfer');
assert(dual.includes("if(!Vt.selectDonor())throw Error"),'transfer still activates the donor');
assert(dual.includes('bodyJob.busy||carrierPreviewBusy||!transferReady'),'separate carrier button needs successful transfer');
assert(dual.includes("if(!grid?.some?.(v=>v>.0001))"),'empty carrier has explicit feedback');
assert(dual.includes('await LU(s.spectralData'),'carrier button actually calls the carrier renderer');
assert(dual.includes('Available in Audio Import Rack'),'in-place transfer success status');
assert(out.includes("children:'Use Hybrid in Forge'"));assert(out.includes("children:'▶ Hear Hybrid in Carrier'"));
assert(!out.includes('Use hybrid in Forge ▶ Hear Carrier'));
assert(dialog.includes('Dual Donor Assembly · Sound Crossing'));
const german=[/Regionen verbinden/i,/Diese Regionen verbinden/i,/Meine Regionen berechnen/i,/Verfahren für neue Verbindung/i,/Berechnung läuft/i,/Deine Klangkreuzung/i,/Beziehungswerkstatt/i,/bereits verbundene Regionen/i,/logarithmisches Zeit-Frequenz/i,/Hör Carrier/i];
for(const term of german)assert(!term.test(dual),`Dual workshop still contains German: ${term}`);
// Execute the real detailed-output JSX function with a tiny React element emulator;
// ensure the *two controls* remain separate in advanced mode too.
const script=out+"\nglobalThis.__panel=__F35636Output;";
const ctx={u:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},globalThis:{}};
vm.runInNewContext(script,ctx,{filename:'06_output_controls.js'});
let uses=0,hears=0;
const view=ctx.globalThis.__panel({body:{duration:2,manifest:{recipe:{links:[]}}},current:true,problem:'',settings:{duration:2,strength:.5},job:{busy:false},onSettings:()=>{},onRender:()=>{},onCancel:()=>{},onListen:()=>{},audition:null,onSave:()=>{},onUse:()=>uses++,onHearCarrier:()=>hears++,transferReady:true,actionFeedback:{kind:'success',text:'Transferred'},carrierPreviewBusy:false,onExport:()=>{},onExportSession:()=>{},onImportSession:()=>{},sessionImport:{current:null},savedFigure:null,onRestore:()=>{},audioSaved:''});
function flatten(el){if(!el||typeof el!=='object')return [];return [el,...(Array.isArray(el.props?.children)?el.props.children:[el.props?.children]).flatMap(flatten)];}
const btn=flatten(view).filter(x=>x.type==='button'),name=x=>String(x.props.children||'');
const transfer=btn.find(x=>name(x)==='Use Hybrid in Forge'),carrier=btn.find(x=>name(x)==='▶ Hear Hybrid in Carrier');
assert(transfer&&!transfer.props.disabled,'usable independent transfer action');assert(carrier&&!carrier.props.disabled,'carrier preview available after transfer');
transfer.props.onClick();assert.equal(uses,1);assert.equal(hears,0,'transfer must not play');
carrier.props.onClick();assert.equal(hears,1,'carrier preview independent from transfer');
console.log('PASS P3C-D4: gear-only HUD, fully English dual UI, separate and operative transfer/carrier actions, confirmation, empty-carrier gate');
