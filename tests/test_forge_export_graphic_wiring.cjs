'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'src/rooms/lab.js'),'utf8');
const view=fs.readFileSync(path.join(root,'src/rooms/00_forge_rack_presentation.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles/areas/040_xen-p9-m9-cockpit-canonical.css'),'utf8');
const toolDefs=fs.readFileSync(path.join(root,'src/forge/editor/02_tools_and_audio_inputs.js'),'utf8');
// Real paint behavior: two icons weren't cosmetic and must not be destructively removed.
assert(code.includes('case"threshold":c.applyThresholdBrush('));
assert(code.includes('case"sourceTrace":{const f=e.sourceAsset?.analysisCache;'));
assert(!toolDefs.includes('{id:"threshold",icon:"🚪"'), 'Threshold tool icon must be removed from paint rail');
assert(!toolDefs.includes('{id:"sourceTrace",icon:"🧬"'), 'DNA tool icon must be removed from paint rail');
// Export handlers retain the same action callbacks; only labels are modified.
for(const pattern of ['le("commit",()=>ee())','le("raw",()=>de(fe))','le("raw-melodic-pink",()=>gt(fromUser))',
 'le("raw-root-follow",()=>dt())','__f435OnExtractTimbre();le("embody-timbre"',
 'le("donor-library-save",async()=>{await __DonorLibraryF36.donorLibrary.save'])assert(code.includes(pattern),'Missing export action '+pattern);
assert(code.includes('children:__ForgeRackCaption("apply")')&&view.includes("apply:{className:'xen-forge-tile-apply',label:'Apply Raw'"));
for(const label of [
 '__ForgeRackCaption("extract")',
 '__ForgeRackCaption("material")',
 '__ForgeRackCaption("pink")',
 '__ForgeRackCaption("root")',
 "__ForgeRackCaption('carrier',busy?'Cancel · '+Math.round(status.progress*100)+' %':undefined)"
])assert(code.includes(label),'Export symbol/line layout missing: '+label);
for(const [icon,txt] of [['🧬','Extract Timbre'],['📀','Send raw as a loop to Material Track'],['🎵','Send as Pink Track'],['🎼','Root Follow Loop'],['🧪','Transform to']])assert(view.includes(icon)&&view.includes(txt),'Shared presenter missing export label '+txt);
assert(code.includes("function __ForgeMaterialQuickFields({meta,onPatch})"));
assert(code.includes('data-forge-inline-metadata'));
assert(code.includes('meta:s,onPatch:i'));
assert(code.includes("onPatch({bars:Math.max(1,Math.min(16,Math.round(Number(event.currentTarget.value)||1)))})"));
assert(code.includes("onPatch({rootHz:value===''?null:__forgeMaterialRootHz(Number(value))})"));
assert.equal((code.match(/'Number of Bars'/g)||[]).length>=2,true);
assert(css.includes('grid-column:4;grid-row:1 / 4'));
assert(css.includes('.xen-forge-name-help{white-space:nowrap'));
assert(css.includes('font-size:24px'));
console.log('Forge export UI wiring PASS: unchanged handlers, real paint tool preservation, compact title+metadata and icon labels');
