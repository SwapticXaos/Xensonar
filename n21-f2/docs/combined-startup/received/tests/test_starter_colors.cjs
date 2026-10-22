const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const content=fs.readFileSync((process.argv[2]||'/mnt/data/XenSonar_P7_38_11_Starter_Sessions_Test.html'),'utf8');
const begin=content.indexOf('const __XenStarterPrimaryId=');
const end=content.indexOf('function __createXenMetaSessionStore(',begin);
assert(begin>-1&&end>begin);
const code=content.slice(begin,end);
const context={__xenMetaColorKey:item=>item.kind==='grid'?'grid:'+item.instanceId:item.kind+':'+item.id};
vm.createContext(context);
const presets=vm.runInContext(code+';__xenStarterPresetRecords()',context);
for(const record of [presets.primary,presets.secondary]){
 for(const tile of record.items){
  const color=record.colors[context.__xenMetaColorKey(tile)];
  assert(color&&/^#[0-9a-f]{6}$/i.test(color.border)&&/^#[0-9a-f]{6}$/i.test(color.background));
 }
}
const keys=record=>record.items.map(tile=>({kind:tile.kind,color:record.colors[context.__xenMetaColorKey(tile)]}));
const primary=keys(presets.primary),secondary=keys(presets.secondary);
for(const kind of ['grid','drum','bass']){
 const cells=primary.filter(row=>row.kind===kind);
 assert.equal(cells.length,3);
 assert.equal(new Set(cells.map(row=>row.color.background)).size,1,'Primary column background must be shared');
 assert.equal(new Set(cells.map(row=>row.color.border)).size,3,'Primary tile borders must be unique');
}
const secondaryBg=secondary.map(row=>row.color.background);
assert.equal(new Set(secondaryBg).size,secondaryBg.length,'Secondary backgrounds should not repeat');
assert.equal(secondaryBg.length,6);
const bgContrastWhite=hex=>{
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return 1/(0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]+0.05);
};
for(const c of secondaryBg) assert(bgContrastWhite(c)>4.5,`Low white-on-background contrast: ${c} ${bgContrastWhite(c)}`);
const addedBlock=content.slice(content.indexOf('const colorsFor=additions=>'),content.indexOf('if(unchanged&&activeIsStarter)',content.indexOf('const colorsFor=additions=>')));
assert(addedBlock.includes("entry.kind==='material'?'#1d344a':'#352940'"),'Demo material/RFL must share per-column backgrounds');
console.log('PASS: primary 3 columns uniform backgrounds + individual borders; secondary 6 distinct colorful backgrounds, adequate contrast; demo loop colors maintain grouping.');
