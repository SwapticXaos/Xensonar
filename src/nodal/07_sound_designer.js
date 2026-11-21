const __NodalDraftKey = 'xensonar.nodal.sounddesigner.v1';
let __NodalPendingDesign = null;
let __NodalSessionDraft = null;
let __NodalPendingEditTarget = null;
let __NodalPendingLibraryEntry = null;
const __NodalOrgans = {sub: {label: 'Sub', color: '#eead79', glyph: '∿'}, resonator: {label: 'Resonator', color: '#78d9d0', glyph: '◎'}, formant: {label: 'Formant', color: '#d8b2e8', glyph: '◖'}, fold: {label: 'Fold', color: '#ff8e83', glyph: '⋀'}, drive: {label: 'Drive', color: '#e4bc6b', glyph: '◈'}, tilt: {label: 'Tilt', color: '#a4c7f0', glyph: '╱'}};
function nodalStarter(kind = 'glass') {
  const roles = kind === 'ember' ? ['sub', 'resonator', 'fold'] : kind === 'breath' ? ['formant', 'resonator', 'tilt'] : ['resonator', 'resonator', 'resonator'];
  return __XenNodalModel.normalize({schema: __XenNodalModel.schema, schemaVersion: 1, kernelVersion: __XenNodalModel.kernelVersion,
    name: kind === 'ember' ? 'Ember Network' : kind === 'breath' ? 'Breath Texture' : 'Glass Cluster', referenceHz: 220, seed: 913,
    excitation: {kind: kind === 'breath' ? 'breath' : 'tone', level: .65}, coupling: .12,
    articulation: {durationSec: 1.8, attackSec: .012, releaseSec: .18},
    nodes: roles.map((role, i) => ({id: 'design-' + i, label: __NodalOrgans[role].label, role,
      x: [.28, .7, .49][i], y: [.33, .4, .73][i], ratio: [1, 1.5, 2][i], cents: 0, radius: .3, strength: 1,
      excitation: [.85, .45, .28][i], pickup: [.9, .65, .4][i], muted: false}))});
}

/* xen-lazy:nodal */

const __NodalOpenPresets = [
  {id:'prism',name:'Prism',hint:'Struck glass · long, uneven modes',wave:'sine',kind:'impulse',roles:['resonator','resonator','tilt'],ratios:[1,1.003,1.007],body:.96,stretch:.62,balance:.78,damping:.28,natural:.85,follow:1,width:.55},
  {id:'ember',name:'Ember',hint:'Dense grain · warm, folded material',wave:'saw',kind:'tone',roles:['sub','fold','drive'],ratios:[2,1,1.004],body:.3,stretch:-.24,balance:.38,damping:.65,natural:.12,follow:1,width:.3},
  {id:'hollow',name:'Hollow',hint:'Odd partials · steady formant body',wave:'hollow',kind:'tone',roles:['resonator','formant','formant'],ratios:[1,1,1.006],body:.56,stretch:-.12,balance:.72,damping:.4,natural:.28,follow:.25,width:.46},
  {id:'filament',name:'Filament',hint:'Exciter → listeners · a resonant thread',wave:'triangle',kind:'impulse',roles:['resonator','resonator','tilt'],ratios:[1,1.018,1.04],body:1,stretch:.27,balance:.6,damping:.3,natural:.9,follow:1,width:.72},
  {id:'reed',name:'Reed',hint:'Periodic core · breath through the network',wave:'triangle',kind:'tone',roles:['resonator','formant','tilt'],ratios:[1,1.002,1.008],body:.62,stretch:.08,balance:.48,damping:.7,natural:.18,follow:.55,width:.36},
  {id:'obsidian',name:'Obsidian',hint:'Narrow pulse · compressed, dark body',wave:'pulse',kind:'tone',roles:['drive','resonator','fold'],ratios:[1,1.005,1.01],body:.4,stretch:-.68,balance:.84,damping:.23,natural:.35,follow:1,width:.58},
  {id:'troodle',name:'troodle',hint:'Seven-node instrument · original saved sound'}
];
function nodalOpenStarter(id='prism') {
  if(id==='troodle') return __XenNodalModel.normalize(window.__XenNodalBuiltinTroodle);
  const p=__NodalOpenPresets.find(p=>p.id===id)??__NodalOpenPresets[0],legacy=nodalStarter('glass');
  return __XenNodalModel.normalize({...__XenNodalModel.upgrade(legacy),name:p.name+' Network',excitation:{kind:p.kind,level:.78},coupling:.18,
    material:{...p,richness:.85},articulation:{...legacy.articulation,durationSec:1.6,attackSec:.006,releaseSec:.12},
    nodes:legacy.nodes.map((n,i)=>({...n,role:p.roles[i],label:__NodalOrgans[p.roles[i]].label,ratio:p.ratios[i],radius:.4,
      x:[.25,.68,.51][i],y:p.kind==='impulse'?[.32,.57,.76][i]:[.31,.5,.7][i],excitationSeed:913+i*71,
      excitation:id==='filament'?(i===0?1:0):[.9,.5,.3][i],pickup:id==='filament'?(i===0?0:.9):[.85,.7,.55][i],
      excitationKind:id==='reed'&&i===1?'breath':'inherit'}))});
}
/* NODAL-FACTORY-01: the built-in Nodal starter sounds (Prism, Ember, Hollow, Filament, Reed, Obsidian, troodle) as read-only factory sounds with a key and no revision,
   like nodal:factory:troodle: resolved by key, never stored in a song bank, available in the Melodic Loop sound menu and the library manager. */
const __xenNodalFactoryCache = new Map();
function __xenNodalFactoryInstrument(key) {
  const match = typeof key === 'string' && /^nodal:factory:([a-z0-9-]+)$/.exec(key);
  if (!match) return null;
  if (match[1] === 'troodle') return __XenNodalBuiltinTroodle;
  if (!__NodalOpenPresets.some(preset => preset.id === match[1])) return null;
  let value = __xenNodalFactoryCache.get(match[1]);
  if (!value) { value = nodalOpenStarter(match[1]); __xenNodalFactoryCache.set(match[1], value); }
  return value;
}

/* BUILTIN-SEED-01: the built-in Nodal starter sounds (Prism, Ember, Hollow, Filament, Reed, Obsidian) and the built-in Entrophon sounds become ORDINARY library entries, once,
   when the Melodic Loop import managers open: from then on they are in the instrument menu and in the managers like every saved sound (Preview, Edit, Rename, Remove).
   A flag per library keeps a removed sound from coming back; an identical saved sound is not duplicated (the library de-duplicates); a full library stops the seeding for that library.
   troodle (with its factory EQ) stays a built-in key. Existing entries and projects are not touched. */
function __xenSeedBuiltinSounds() {
  const storage = typeof localStorage === 'undefined' ? null : localStorage; if (!storage) return {nodal: 0, entrophon: 0};
  const result = {nodal: 0, entrophon: 0};
  const run = (flag, library, items, key) => {
    let done = null; try { done = storage.getItem(flag); } catch { return; }
    if (done) return;
    for (const make of items) { try { library.save(make()); result[key]++; } catch (error) { if (/full/i.test(String(error && error.message))) break; } }
    try { storage.setItem(flag, '1'); } catch {}
  };
  run('xensonar.nodal.builtinSeed.v1', __XenNodalLibrary, __NodalOpenPresets.filter(p => p.id !== 'troodle').map(p => () => nodalOpenStarter(p.id)), 'nodal');
  if (typeof Yx !== 'undefined' && typeof __XenEntrophonLibrary !== 'undefined' && typeof __xenEntrophonFactoryDefinition === 'function')
    run('xensonar.entrophon.builtinSeed.v1', __XenEntrophonLibrary, Yx.map(profile => () => __xenEntrophonFactoryDefinition('entrophon:factory:' + profile.id + '@1')), 'entrophon');
  return result;
}


/* xen-lazy:nodal */


/* xen-lazy:nodal */


/* xen-lazy:nodal */



/* xen-lazy:nodal */

// Room III is one workspace with three modes, not a floating Sound Design modal.

/* xen-lazy:nodal */


/* xen-lazy:nodal */

