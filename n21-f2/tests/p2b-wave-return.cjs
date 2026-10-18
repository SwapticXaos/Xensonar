'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/runtime/instrument/10_entrophon_and_voice_control.js','utf8');
const body=source.match(/function __xenChooseWaveStarterSource\([\s\S]*?\n\}/)?.[0];
assert(body,'explicit Wave Starter source selection helper must exist');
let current={enabled:true,engineAmount:.76,filterFreqBase:1900};
const chosen=[],holds=[],enabled=[];
const select=new Function('Hd','Ew','dG',body+';return __xenChooseWaveStarterSource;')(
 ()=>current.enabled&&current.engineAmount>1e-4,
 ()=>({...current}),
 (_lane,patch)=>{current={...current,...patch};return current}
);
const control={selectPreset:value=>chosen.push(value),setNParams:value=>holds.push(value),setWaveEnabled:value=>enabled.push(value)};
select('tape_halo',control);
assert.equal(current.enabled,false,'choosing Classic must deactivate global Entrophon dispatch');
assert.equal(chosen.at(-1),'tape_halo');
select('entrophon',control);
assert.equal(current.enabled,true,'the explicit Entrophon menu entry must restore Entrophon');
assert.equal(current.engineAmount,.76,'Entrophon sound design must survive navigation');
assert.equal(chosen.at(-1),'entrophon','the live source must change as well as the global switch');
assert.equal(holds.at(-1).waveStarterHoldSoundPreset,'entrophon','Enter-Hold follows the selected source');
current.engineAmount=0;select('entrophon',control);
assert(current.engineAmount>1e-4,'Entrophon selected explicitly must be playable even if engineAmount was zero');
assert(source.includes('value:__xenWaveStarterMenuValue(L)'),'Wave menu displays the actual renderer selection');
assert(source.includes('children:he(!0)'),'Wave menu renders the Entrophon entry');
assert(source.includes('children:he(!0)'),'Keyboard menu also exposes explicit Entrophon');
console.log('PASS wave source reversible, genuine Entrophon backend, Entrophon design retained and live/Hold selection aligned');
