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

/* xen-lazy:nodal */


/* xen-lazy:nodal */


/* xen-lazy:nodal */



/* xen-lazy:nodal */

// Room III is one workspace with three modes, not a floating Sound Design modal.

/* xen-lazy:nodal */


/* xen-lazy:nodal */

