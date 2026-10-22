const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const file=process.argv[2];
if(!file)throw new Error('Usage: node test_grid_consistency.cjs <HTML>');
const content=fs.readFileSync(file,'utf8');
const begin=content.indexOf('const __XenStarterPrimaryId=');
const end=content.indexOf('function __createXenMetaSessionStore(',begin);
assert(begin>=0&&end>begin,'Starter code available');
const code=content.slice(begin,end);
const ctx={__xenMetaColorKey:item=>item.kind==='grid'?'grid:'+item.instanceId:item.kind+':'+item.id};
vm.createContext(ctx);
const result=vm.runInContext(code+';__xenStarterPresetRecords()',ctx);
const profiles=[...result.primary.items,...result.secondary.items].filter(x=>x.kind==='grid');
const expected={
 '12edo|aeolian':[1,4,6,9,11],
 'ji|harmonic_minor':[3,5,8,9,10],
 'bp|bp_minor':[2,4,7,10],
 '19edo|phrygian':[1,3,4,6,7,9,10,12,14,15,17,18],
 '31edo|dorian':[1,2,3,4,6,7,9,10,11,12,14,15,16,17,19,20,21,22,24,25,27,28,29,30]
};
assert.equal(profiles.length,5);
for(const p of profiles){
 const key=p.id+'|'+p.gridProfile.modeId;
 assert.ok(expected[key],`Unexpected mode ${key}`);
 assert.deepEqual(Array.from(p.gridProfile.mainMutedDegrees),expected[key],`Incorrect actual playable-degree mask for ${key}`);
 assert.equal(p.gridProfile.mainStepOffsets.length,0);
}
assert(content.includes('harmonic_minor'), 'Native harmonic minor must be defined');
assert(content.includes('repairStarterGridProfiles:()=>'), 'Meta Session migration must exist');
assert(content.includes('const __XenStarterQuickRepaired='), 'Quickrack migration must exist');
assert(content.includes('const __XenStarterProfilesRepaired='), 'Meta migration invoked');
console.log('PASS starter modes/masks and both migration hooks',profiles.map(p=>p.id+'/'+p.gridProfile.modeId).join(', '));
