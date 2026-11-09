/* Nodal instrument v1. Construction only: no canvas, ball or audio dependencies. */
function createNodalInstrumentModel() {
  const SCHEMA = 'xensonar.nodal-instrument', VERSION = 1, KERNEL = 'coupled-modal-v1';
  const ROLES = ['sub', 'resonator', 'formant', 'fold', 'drive', 'tilt'];
  const MAX_NODES = 12;
  // Only this model's validated, deeply frozen values may use the fast path.
  // Foreign frozen objects and mutable import payloads must still be checked.
  const normalizedValues = new WeakSet(), keys = new WeakMap(), plans = new WeakMap();
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const number = (v, fallback, lo, hi) => clamp(finite(v, fallback), lo, hi);
  const copy = v => JSON.parse(JSON.stringify(v));
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  function fail(message) { throw new Error('[nodal] ' + message); }
  function normalize(input) {
    if (input && normalizedValues.has(input)) return input;
    const modern = input?.schemaVersion === 2 && input?.kernelVersion === 'coupled-modal-v2';
    if (!input || input.schema !== SCHEMA || (!modern && (input.schemaVersion !== VERSION || input.kernelVersion !== KERNEL))) fail('Unsupported instrument version');
    if (!Array.isArray(input.nodes) || !input.nodes.length || input.nodes.length > MAX_NODES) fail('Instrument requires 1–12 nodes');
    const ids = new Set();
    const nodes = input.nodes.map(n => {
      if (!n || typeof n.id !== 'string' || !n.id || n.id.length > 160 || ids.has(n.id)) fail('Invalid or duplicate node ID');
      ids.add(n.id);
      if (!ROLES.includes(n.role)) fail('Unsupported organ: ' + n.role);
      for (const k of ['x', 'y', 'ratio', 'cents', 'radius', 'strength', 'excitation']) if (!Number.isFinite(n[k])) fail('Invalid node ' + k);
      if (n.ratio <= 0 || n.ratio > 32) fail('Ratio outside supported range');
      return {
        id: n.id, label: String(n.label ?? n.id).slice(0, 160), role: n.role,
        x: number(n.x, .5, 0, 1), y: number(n.y, .5, 0, 1),
        ratio: n.ratio, cents: number(n.cents, 0, -2400, 2400),
        radius: number(n.radius, .18, .015, 1), strength: number(n.strength, 1, 0, 2),
        excitation: number(n.excitation, .5, 0, 1), pickup: number(n.pickup, .25 + .75 * n.excitation, 0, 1), muted: n.muted === true,
        ...(modern ? {excitationKind: ['inherit','tone','impulse','breath'].includes(n.excitationKind) ? n.excitationKind : 'inherit',
          wave: ['inherit','sine','triangle','saw','hollow','pulse'].includes(n.wave) ? n.wave : 'inherit',
          excitationSeed: finite(n.excitationSeed, 913) >>> 0, ratioText: String(n.ratioText ?? '').slice(0,40)} : {})
      };
    }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const blocked = [];
    if (input.blockedEdges != null && !Array.isArray(input.blockedEdges)) fail('Invalid blocked edges');
    for (const pair of input.blockedEdges ?? []) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !ids.has(pair[0]) || !ids.has(pair[1])) fail('Invalid blocked edge');
      const key = pair.slice().sort();
      if (!blocked.some(p => p[0] === key[0] && p[1] === key[1])) blocked.push(key);
    }
    if (blocked.length > MAX_NODES * (MAX_NODES - 1) / 2) fail('Too many edges');
    blocked.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
    const excitation = input.excitation ?? {};
    if (!['impulse', 'tone', 'breath'].includes(excitation.kind)) fail('Unsupported excitation');
    const articulation = input.articulation ?? {};
    const result = freeze({
      schema: SCHEMA, schemaVersion: modern ? 2 : VERSION, kernelVersion: modern ? 'coupled-modal-v2' : KERNEL,
      ...(modern ? {material: normalizeMaterial(input.material), edgePolarities: normalizePolarities(input.edgePolarities, ids),
        previewRatios: (Array.isArray(input.previewRatios) && input.previewRatios.length === 4 ? input.previewRatios : ['1/1','7/6','11/8','13/8']).map(v => String(v).slice(0,40))} : {}),
      name: String(input.name ?? 'Nodal Instrument').slice(0, 160),
      referenceHz: number(input.referenceHz, 220, 10, 4000),
      seed: finite(input.seed, 1) >>> 0,
      nodes, blockedEdges: blocked,
      excitation: {kind: excitation.kind, level: number(excitation.level, .6, 0, 1)},
      coupling: number(input.coupling, .075, 0, .2),
      articulation: {attackSec: number(articulation.attackSec, .005, .001, 2), releaseSec: number(articulation.releaseSec, .12, .01, 3), durationSec: number(articulation.durationSec, 1, .02, 30),
        volumeEnvelope: field(articulation.volumeEnvelope), pitchEnvelope: field(articulation.pitchEnvelope)}
    });
    normalizedValues.add(result); return result;
  }
  const waveCache = new Map(), waveNames = ['sine','triangle','saw','hollow','pulse'];
  function normalizeMaterial(m = {}) {
    return {wave: waveNames.includes(m.wave) ? m.wave : 'saw', richness: number(m.richness,.7,0,1), body: number(m.body,.72,0,1),
      stretch: number(m.stretch,.25,-1,1), balance: number(m.balance,.45,0,1), damping: number(m.damping,.45,0,1),
      natural: number(m.natural,.35,0,1), follow: number(m.follow,1,0,1), register: number(m.register,0,-2,2), width: number(m.width,.35,0,1)};
  }
  function normalizePolarities(value, ids) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 66) fail('Invalid coupling polarities');
    const result = [];
    for (const pair of value) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !ids.has(pair[0]) || !ids.has(pair[1])) fail('Invalid signed edge');
      const sorted = pair.slice().sort();
      if (!result.some(p => p[0] === sorted[0] && p[1] === sorted[1])) result.push(sorted);
    }
    return result.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
  }
  function upgrade(input) {
    const old = normalize(input);
    if (old.schemaVersion === 2) return old;
    return normalize({...old, schemaVersion:2, kernelVersion:'coupled-modal-v2', material:{},
      nodes:old.nodes.map(n=>({...n,excitationSeed:913}))});
  }
  // Fourier-limited banks are compiled on the editor thread, then transferred
  // with the immutable plan. No table creation or trigonometric build in Worklet.
  function waveBank(wave, richness, role, strength) {
    const key = JSON.stringify([wave,richness,role,strength]);
    if (waveCache.has(key)) return waveCache.get(key);
    const size=1024, harmonics=32, coefficients=Array(harmonics).fill(0);
    for (let h=1;h<=harmonics;h++) {
      let a = wave==='sine' ? (h===1?1:0) : wave==='triangle' ? (h%2 ? (h%4===1?1:-1)/(h*h) : 0) :
        wave==='saw' ? 1/h : wave==='hollow' ? (h%2 ? 1/h : 0) : Math.sin(Math.PI*h*.19)/h;
      a = h===1 ? 1 : a*richness;
      if(role==='fold' && h%2) a += richness*strength*.48*Math.sin(h*1.7)/Math.pow(h,.85);
      if(role==='drive' && h%2) a += richness*strength*.38/Math.pow(h,1.25);
      coefficients[h-1]=a;
    }
    const norm=.8/Math.max(1,Math.sqrt(coefficients.reduce((v,a)=>v+a*a,0)));
    const tables=[1,2,4,8,16,32].map(limit=>{
      const t=Array(size+1).fill(0);
      for(let h=1;h<=limit;h++) if(coefficients[h-1]) {
        const a=coefficients[h-1]*norm;
        for(let k=0;k<size;k++) t[k]+=a*Math.sin(2*Math.PI*h*k/size);
      }
      t[size]=t[0];return t;
    });
    tables.harmonics=coefficients.map(v=>Math.abs(v*norm));
    const bank=freeze(tables);waveCache.set(key,bank);
    if(waveCache.size>32)waveCache.delete(waveCache.keys().next().value);
    return bank;
  }
  function compileOpen(instrument) {
    // Canonical acoustic order is independent of technical IDs and insertion order.
    const nodes=instrument.nodes.filter(n=>!n.muted).slice().sort((a,b)=>{
      const acoustic=n=>JSON.stringify([n.ratio,n.cents,n.x,n.y,n.role,n.radius,n.strength,n.excitation,n.pickup,n.excitationKind,n.wave,n.excitationSeed]);
      return acoustic(a).localeCompare(acoustic(b),'en');
    }),n=nodes.length,m=instrument.material,edges=[],degree=Array(n).fill(0);
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) {
      const pair=[nodes[i].id,nodes[j].id].sort();
      if(instrument.blockedEdges.some(p=>p[0]===pair[0]&&p[1]===pair[1]))continue;
      const overlap=clamp(1-Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)/(nodes[i].radius+nodes[j].radius),0,1);
      const weight=overlap*overlap*(3-2*overlap)*Math.sqrt(nodes[i].strength*nodes[j].strength);
      if(weight<=0)continue;
      edges.push({a:i,b:j,weight,polarity:instrument.edgePolarities.some(p=>p[0]===pair[0]&&p[1]===pair[1])?-1:1});degree[i]+=weight;degree[j]+=weight;
    }
    // Smooth bounded conductance retains absolute Strength sensitivity in dense graphs.
    edges.forEach(e=>e.weight/=1+Math.max(degree[e.a],degree[e.b]));
    const weights=[Math.pow(1-m.balance,1.4)+.08, .12+Math.sin(m.balance*Math.PI)*.8, .04+m.balance*m.balance*1.1];
    const energy=Math.sqrt(weights.reduce((s,v)=>s+v*v,0));weights.forEach((v,i)=>weights[i]=v/energy);
    const programs=nodes.map(node=>{
      const base=node.role==='sub'?[.5,1,2]:node.role==='formant'?[1,2.8,4.3]:[1,2,4];
      const partials=base.map((v,b)=>b===0?v:Math.max(.6,v*Math.pow(2,m.stretch*(b===1?.65:1.15))));
      const bank=waveBank(node.wave==='inherit'?m.wave:node.wave,m.richness,node.role,node.strength);
      // Source spectral amplitude at each body mode; odd/even/pulse families
      // remain distinct even with a fully resonant output (no dry bypass).
      const modeColor=partials.map((ratio,b)=>{if(b===0)return 1;const f=ratio/partials[0];let amplitude=0,weight=0;for(let h=1;h<=bank.harmonics.length;h++){const w=Math.exp(-.5*Math.pow(Math.log2(h/f)/.33,2));amplitude+=bank.harmonics[h-1]*w;weight+=w;}return .025+1.6*amplitude/Math.max(.001,weight);});
      return {id:node.id,role:node.role,ratio:node.ratio*Math.pow(2,node.cents/1200),partials,brightness:node.x,
        decaySec:.07*Math.pow(80,node.y),strength:node.strength,excitation:node.excitation,pickup:node.pickup,
        excitationSeed:node.excitationSeed,kind:node.excitationKind==='inherit'?instrument.excitation.kind:node.excitationKind,
        wave:node.wave==='inherit'?m.wave:node.wave,x:node.x,modeColor,output:[.9,.48+node.x*.5,.25+node.x*.6].map(v=>v*node.pickup),
        bank};
    });
    const bands=[0,1,2].map(band=>{
      const matrix=Array(n*n).fill(0);
      for(let i=0;i<n;i++)matrix[i*n+i]=programs[i].ratio*programs[i].partials[band];
      for(const e of edges){const k=instrument.coupling*e.weight*(1+band*.3);matrix[e.a*n+e.a]+=k;matrix[e.b*n+e.b]+=k;
        matrix[e.a*n+e.b]-=k*e.polarity;matrix[e.b*n+e.a]-=k*e.polarity;}
      // Signed Laplacian = sum k (x_a - sign*x_b)^2, hence positive semidefinite.
      const r=eigen(matrix,n);
      if(band===0&&n){const anchor=Math.min(...programs.map(p=>p.ratio*p.partials[0])),scale=anchor/r.frequencies[0];r.frequencies=r.frequencies.map(f=>f*scale);}
      r.drives=['tone','impulse','breath'].map(kind=>Array.from({length:n},(_,j)=>programs.reduce((s,p,i)=>s+r.vectors[i*n+j]*(p.kind===kind?p.excitation*(kind==='tone'?p.modeColor[band]:1):0),0)));
      r.pickup=Array.from({length:n},(_,j)=>programs.reduce((s,p,i)=>s+r.vectors[i*n+j]*p.output[band],0));
      r.side=Array.from({length:n},(_,j)=>programs.reduce((s,p,i)=>s+r.vectors[i*n+j]*p.output[band]*(p.x-.5)*m.width*1.6,0));
      r.decayRates=Array.from({length:n},(_,j)=>programs.reduce((s,p,i)=>s+r.vectors[i*n+j]**2*Math.pow(2,band*(m.damping-.5)*3+(p.role==='tilt'?band*(1-p.brightness):0))/p.decaySec,0));
      return r;
    });
    const contours=typeof resolveNodalArticulationFields==='function'?resolveNodalArticulationFields(instrument.articulation):{volumeCurve:null,pitchCurve:null};
    if(typeof resolveNodalArticulationFields!=='function'&&(instrument.articulation.volumeEnvelope||instrument.articulation.pitchEnvelope))fail('Shared envelope resolver unavailable');
    return freeze({schema:'xensonar.nodal-plan',schemaVersion:2,kernelVersion:'coupled-modal-v2',key:semanticKey(instrument),nodes:programs,edges,bands,
      seed:instrument.seed,excitation:instrument.excitation,referenceHz:instrument.referenceHz,material:m,bandWeights:weights,
      articulation:{...instrument.articulation,...contours},nonlinearNodes:[],
      tailSec:m.natural*1.8,cost:Math.max(1,Math.ceil(n/3)),silent:n===0});
  }

  function field(value) {
    if (value == null) return null;
    const text = JSON.stringify(value);
    if (text.length > 60000 || !Array.isArray(value.deformation?.curve) || value.deformation.curve.length > 512 || !value.deformation.curve.every(Number.isFinite)) fail('Invalid instrument envelope');
    return JSON.parse(text);
  }
  function fromInstallation({nodes, width, height, referenceHz = 220, name, seed = 1, excitation = 'tone', level = .6, coupling = .075, blockedEdges, articulation}) {
    if (!Array.isArray(nodes) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) fail('Invalid installation dimensions');
    const extent = Math.max(width, height), diagnostics = [];
    const result = nodes.map((n, index) => {
      const design = n.nodalDesign ?? {};
      const original = design.role ?? n.myzelEffectModuleType ?? 'resonator';
      if (design.role != null && !ROLES.includes(design.role)) fail('Unsupported explicit nodal role');
      const role = ROLES.includes(original) ? original : 'resonator';
      if (role !== original) diagnostics.push({nodeId: n.residentId ?? n.id ?? String(index), legacyModule: original, mappedRole: role});
      // freq is authoritative in the existing installation (already includes tuningCents).
      // Explicit design ratios are independent of its live retuning and keep their own cents.
      const ratio = design.ratio ?? (Number.isFinite(n.freq) && n.freq > 0 ? n.freq / referenceHz : finite(n.ratio, 1));
      const x = design.x ?? (.5 + (finite(n.x, width / 2) - width / 2) / extent);
      const y = design.y ?? (.5 + (finite(n.y, height / 2) - height / 2) / extent);
      return {id: String(n.residentId ?? n.id ?? ('legacy-' + index)), label: n.label,
        role, x, y, ratio, cents: design.cents ?? 0,
        radius: design.radius ?? finite(n.myzelAuraRadius, extent * .22) / extent,
        strength: design.strength ?? finite(n.myzelEffectStrength, 1),
        excitation: design.excitation ?? (role === 'sub' ? .9 : role === 'resonator' ? .55 : .3), pickup: design.pickup, muted: n.residentMuted === true};
    });
    return {instrument: normalize({schema: SCHEMA, schemaVersion: VERSION, kernelVersion: KERNEL,
      name, seed, referenceHz, nodes: result, excitation: {kind: excitation, level}, coupling, blockedEdges, articulation}), diagnostics};
  }
  function semanticKey(instrument) {
    instrument = normalize(instrument);
    if (keys.has(instrument)) return keys.get(instrument);
    const {name, referenceHz, ...body} = instrument;
    body.nodes = body.nodes.map(({label, ...node}) => node);
    if (instrument.schemaVersion === 2) { body.referenceHz = referenceHz; delete body.previewRatios; body.nodes = body.nodes.map(({ratioText,...node})=>node); }
    const key = JSON.stringify(body); keys.set(instrument, key); return key;
  }
  function eigen(matrix, n) {
    const a = matrix.slice(), v = Array(n * n).fill(0);
    for (let i = 0; i < n; i++) v[i * n + i] = 1;
    for (let iteration = 0; iteration < Math.max(1, n * n * 40); iteration++) {
      let p = 0, q = 0, largest = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(a[i * n + j]) > largest) { largest = Math.abs(a[i * n + j]); p = i; q = j; }
      if (largest < 1e-12) break;
      const angle = .5 * Math.atan2(2 * a[p * n + q], a[q * n + q] - a[p * n + p]);
      const c = Math.cos(angle), s = Math.sin(angle), app = a[p * n + p], aqq = a[q * n + q], apq = a[p * n + q];
      for (let k = 0; k < n; k++) if (k !== p && k !== q) {
        const akp = a[k * n + p], akq = a[k * n + q];
        a[k * n + p] = a[p * n + k] = c * akp - s * akq;
        a[k * n + q] = a[q * n + k] = s * akp + c * akq;
      }
      a[p * n + p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      a[q * n + q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      a[p * n + q] = a[q * n + p] = 0;
      for (let k = 0; k < n; k++) { const vp = v[k * n + p], vq = v[k * n + q]; v[k * n + p] = c * vp - s * vq; v[k * n + q] = s * vp + c * vq; }
    }
    const order = Array.from({length: n}, (_, i) => i).sort((i, j) => a[i * n + i] - a[j * n + j] || i - j);
    return {frequencies: order.map(i => a[i * n + i]), vectors: v.map((_, k) => v[Math.floor(k / n) * n + order[k % n]])};
  }
  function compile(input) {
    const instrument = normalize(input);
    const resolver = typeof resolveNodalArticulationFields === 'function' ? resolveNodalArticulationFields : null;
    const cached = plans.get(instrument);
    if (cached && cached.resolver === resolver) return cached.plan;
    if (instrument.schemaVersion === 2) { const plan = compileOpen(instrument); plans.set(instrument, {resolver, plan}); return plan; }
    const nodes = instrument.nodes.filter(n => !n.muted), n = nodes.length;
    const edges = [], degree = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (instrument.blockedEdges.some(p => p[0] === nodes[i].id && p[1] === nodes[j].id)) continue;
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      const overlap = clamp(1 - distance / (nodes[i].radius + nodes[j].radius), 0, 1);
      const weight = overlap * overlap * (3 - 2 * overlap) * Math.sqrt(nodes[i].strength * nodes[j].strength);
      if (weight <= 0) continue;
      edges.push({a: i, b: j, weight}); degree[i] += weight; degree[j] += weight;
    }
    // Local conductance normalization: an unrelated isolated node cannot alter this component.
    edges.forEach(e => { e.weight /= Math.max(1, degree[e.a], degree[e.b]); });
    const programs = nodes.map(node => {
      const ratio = node.ratio * Math.pow(2, node.cents / 1200);
      const partials = node.role === 'sub' ? [.5, 1, 2] : node.role === 'formant' ? [1, 2.8, 4.3] : [1, 2.01, 3.98];
      return {id: node.id, role: node.role, ratio, partials, brightness: node.x,
        decaySec: .07 * Math.pow(80, node.y), strength: node.strength, excitation: node.excitation,
        output: [1, .18 + node.x * .36, .025 + node.x * .25].map(level => level * node.pickup)};
    });
    const bands = [0, 1, 2].map(band => {
      const matrix = Array(n * n).fill(0);
      for (let i = 0; i < n; i++) matrix[i * n + i] = programs[i].ratio * programs[i].partials[band];
      for (const e of edges) {
        const k = instrument.coupling * e.weight * (1 + band * .2);
        matrix[e.a * n + e.a] += k; matrix[e.b * n + e.b] += k;
        matrix[e.a * n + e.b] -= k; matrix[e.b * n + e.a] -= k;
      }
      const resolved = eigen(matrix, n);
      resolved.pickup = Array.from({length: n}, (_, j) => programs.reduce((sum, p, i) => sum + resolved.vectors[i * n + j] * p.output[band], 0));
      // Shared-mode decay follows its participation in the local materials.
      resolved.decayRates = Array.from({length: n}, (_, j) => programs.reduce((sum, p, i) => {
        const localRate = (1 + band * (1 - p.brightness) * (p.role === 'tilt' ? 7 : 3)) / p.decaySec;
        return sum + resolved.vectors[i * n + j] ** 2 * localRate;
      }, 0));
      return resolved;
    });
    const contours = typeof resolveNodalArticulationFields === 'function' ? resolveNodalArticulationFields(instrument.articulation) : {volumeCurve: null, pitchCurve: null};
    if (typeof resolveNodalArticulationFields !== 'function' && (instrument.articulation.volumeEnvelope || instrument.articulation.pitchEnvelope)) fail('Shared envelope resolver unavailable');
    const plan = freeze({schema: 'xensonar.nodal-plan', schemaVersion: VERSION, kernelVersion: KERNEL,
      key: semanticKey(instrument), nodes: programs, edges, bands, seed: instrument.seed,
      excitation: instrument.excitation, articulation: {...instrument.articulation, ...contours},
      nonlinearNodes: programs.map((p, i) => p.role === 'fold' || p.role === 'drive' ? i : -1).filter(i => i >= 0),
      cost: Math.max(1, Math.ceil(n * 3 / 12 + (programs.some(p => p.role === 'fold' || p.role === 'drive') ? n * n * 3 / 24 : 0))), silent: n === 0});
    plans.set(instrument, {resolver, plan}); return plan;
  }
  function serialize(input) { return JSON.stringify(normalize(input)); }
  function deserialize(text) { if (typeof text !== 'string' || text.length > 250000) fail('Invalid instrument payload'); return normalize(JSON.parse(text)); }
  return Object.freeze({schema: SCHEMA, version: VERSION, kernelVersion: KERNEL, roles: ROLES.slice(), maxNodes: MAX_NODES, normalize, upgrade, fromInstallation, semanticKey, compile, serialize, deserialize, clone: copy});
}
const __XenNodalModel = createNodalInstrumentModel();
/* TROODLE_FACTORY_PRESET06: independent read-only built-in, never seeded into user storage.
   Sound-design source: verified troodle.xen-nodal.json (formerly troodle 5).
   EQ presets have independent storage/ownership and are NOT implicitly assigned. */
const __XenNodalBuiltinTroodle = __XenNodalModel.normalize({"schema":"xensonar.nodal-instrument","schemaVersion":2,"kernelVersion":"coupled-modal-v2","material":{"wave":"pulse","richness":0.85,"body":0.4,"stretch":-0.048216501240694765,"balance":0.7181423611111111,"damping":0.23,"natural":0.35,"follow":1,"register":0,"width":0.58},"edgePolarities":[],"previewRatios":["1/1","7/6","11/8","13/8"],"name":"troodle","referenceHz":220,"seed":913,"nodes":[{"id":"design-0","label":"Drive","role":"drive","x":0.9566961156542055,"y":0.784874050817757,"ratio":1,"cents":0,"radius":0.4,"strength":1,"excitation":0.9,"pickup":0.85,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":913,"ratioText":""},{"id":"design-1","label":"Tilt","role":"tilt","x":0.96,"y":0.22079439252336447,"ratio":1.005,"cents":0,"radius":0.4,"strength":1,"excitation":0.5,"pickup":0.7,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":984,"ratioText":""},{"id":"design-2","label":"Sub","role":"sub","x":0.7404322429906542,"y":0.8437306512850464,"ratio":1.01,"cents":0,"radius":0.4,"strength":1,"excitation":0.3,"pickup":0.55,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":1055,"ratioText":""},{"id":"organ-mw2pzrkt-q8b87","label":"Formant","role":"formant","x":0.08556001752336452,"y":0.07837470794392529,"ratio":1,"cents":0,"radius":0.22,"strength":1,"excitation":0.5,"pickup":0.65,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":913,"ratioText":""},{"id":"organ-mw2pztho-ido9y","label":"Drive","role":"drive","x":0.24760550525700942,"y":0.2505691442757009,"ratio":1,"cents":0,"radius":0.22,"strength":1,"excitation":0.5,"pickup":0.65,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":913,"ratioText":""},{"id":"organ-mw2pzz0b-8e7lx","label":"Tilt","role":"tilt","x":0.48463894567757015,"y":0.35032783294392533,"ratio":1,"cents":0,"radius":0.22,"strength":1,"excitation":0.5,"pickup":0.65,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":913,"ratioText":""},{"id":"organ-mw2q0gzg-rxdtx","label":"Sub","role":"sub","x":0.48,"y":0.52,"ratio":1,"cents":0,"radius":0.22,"strength":1,"excitation":0.5,"pickup":0.65,"muted":false,"excitationKind":"inherit","wave":"inherit","excitationSeed":913,"ratioText":""}],"blockedEdges":[],"excitation":{"kind":"tone","level":0.78},"coupling":0.18,"articulation":{"attackSec":0.006,"releaseSec":0.12,"durationSec":1.6,"volumeEnvelope":{"id":"603e5f2a-261f-42e3-a52b-4da395bfb337","geometryKind":"linear-strip","interpreterKind":"dynamic-fade","enabled":true,"bypassed":false,"referenceLevel":0,"range":{"startRatio":0.18,"endRatio":0.82},"edgeHandles":{"left":0.9533590313867659,"right":-1},"baseCurve":{"kind":"linear"},"deformation":{"resolution":360,"curve":[0.9533590313867659,0.9547957815211815,0.9562298412439705,0.9576584123144638,0.9590784852185856,0.9604867443210774,0.9618794854875131,0.9632525495580936,0.9646012744310463,0.9659204677814357,0.9672044016309149,0.9684468291285271,0.9696410230373829,0.9707798345828345,0.9718557705397728,0.9728610857525153,0.9737878877190524,0.9746282494552871,0.9753743266008088,0.9760184746445206,0.9765533622368321,0.9769720768076819,0.9772682191110775,0.9774359838448812,0.9774702241212527,0.9773664982563471,0.9771210980731445,0.9767310586338611,0.9761941500050106,0.9755088522789286,0.9746743156053281,0.973690307406011,0.9725571492426519,0.9712756459758397,0.969847009894177,0.968272782412094,0.9665547557460581,0.9646948966970019,0.9626952743107335,0.960557992778065,0.9582851304932841,0.9558786857339288,0.9533405289764165,0.9506723614396317,0.9478756790696548,0.944951740859989,0.9419015401586102,0.9387257774608067,0.9354248331391781,0.9319987386319795,0.9284471448089704,0.9247692865674428,0.9209639431828514,0.9170293945446392,0.9129633741362337,0.9087630204464978,0.9044248293944369,0.8999446112636995,0.8953174565202575,0.8905377156563963,0.8855989987886921,0.8804942010536078,0.8752155598077247,0.8697547491722274,0.8641030164980813,0.8582513638264639,0.8521907753672897,0.8459124894478123,0.8394083103751555,0.832670952351442,0.8256944041794175,0.8184743002594008,0.8110082806098349,0.803296320672027,0.7953410108039485,0.7871477658975544,0.7787249476433336,0.7700838856515917,0.7612387887895546,0.752206544390725,0.7430064099507833,0.7336596089244295,0.7241888485977637,0.7146177830712219,0.7049704476036852,0.6952706915925384,0.6855416362072788,0.6758051793435715,0.6660815655631456,0.6563890326660928,0.6467435402349646,0.6371585796096302,0.6276450598956295,0.6182112611770086,0.6088628442585116,0.5996029059244774,0.590432069598176,0.5813486030125168,0.5723485566118548,0.5634259184784921,0.5545727832939197,0.54577953401056,0.5370350354672344,0.5283268391907886,0.5196413982294491,0.5109642902424067,0.5022804464058583,0.49357438313715735,0.48483043328399866,0.4760329733169373,0.4671666431930419,0.45821655588103327,0.4491684939876124,0.44000909142901923,0.43072599858595306,0.4213080298132679,0.4117452925158298,0.4020292972340894,0.39215304830810216,0.3821111147192577,0.3718996806647,0.36151657532428416,0.3509612811594568,0.3402349199633832,0.32934021578717865,0.31828143382296237,0.307064294355056,0.2956958610202389,0.28418440287043534,0.272539230129237,0.2607705040972915,0.24888902240587557,0.23690598174999933,0.2248327213476417,0.2126804516501529,0.20045997423113043,0.18818140024535424,0.17585387628953106,0.16348532780242223,0.15108223118195696,0.13864942642466271,0.1261899821563825,0.1137051242790792,0.10119423798738451,0.08865495053442743,0.07608329883565346,0.06347398185794301,0.05082069290872355,0.03811652167499403,0.025354410520687105,0.01252764456906771,-0.0003696490363831146,-0.013342020085264313,-0.02639226084454655,-0.03952104540296911,-0.052726666521966475,-0.0660048878995291,-0.07934892195076924,-0.09274953396448546,-0.1061952636094088,-0.11967274521279314,-0.1331671000665592,-0.1466623682249253,-0.16014194463689715,-0.17358898547110294,-0.1869867551728222,-0.2003188927015427,-0.21356958563840917,-0.22672365217985135,-0.23976654201044853,-0.25268427625625717,-0.2654633529762093,-0.278090647196269,-0.29055333312380965,-0.30283885128151783,-0.31493493577514997,-0.32682970801807537,-0.3385118343592905,-0.3499707374408016,-0.3611968456085779,-0.37218186165258493,-0.3829190313338293,-0.39340339291288984,-0.4036319903839283,-0.41360403463808676,-0.423320998066513,-0.43278662950863855,-0.4420068788510524,-0.45098972512835356,-0.4597449095596119,-0.4682835856702737,-0.47661791143185084,-0.4847606209539399,-0.4927246226991209,-0.5005226745583086,-0.5081671815672911,-0.5156701495199387,-0.5230433092420574,-0.5302984054268466,-0.5374476248273559,-0.5445041245885145,-0.5514826140031404,-0.5583999410351135,-0.5652756356579254,-0.5721323617888887,-0.5789962257111712,-0.585896881231399,-0.5928673636014012,-0.599943581595137,-0.607163407616123,-0.6145653356890419,-0.6221867290042459,-0.6300617483677073,-0.6382191293997689,-0.6466800428308559,-0.6554563098339321,-0.6645492371150226,-0.6739492769430144,-0.683636610108798,-0.6935826125163537,-0.7037520260647353,-0.7141055424180629,-0.7246024503112192,-0.7352030074218651,-0.7458702744682626,-0.7565712735789089,-0.7672774746254416,-0.7779647374423106,-0.7886129150999197,-0.7992053373302374,-0.8097283453056187,-0.8201709577800835,-0.8305246435653144,-0.8407830871394548,-0.8509417852206802,-0.8609973106108906,-0.8709461201183775,-0.8807828530120079,-0.8904981531971974,-0.9000761463515823,-0.9094918114482011,-0.9187085985037248,-0.9276767378884287,-0.9363327151672037,-0.9446002932549584,-0.9523932208371724,-0.9596194153581583,-0.9661860881874718,-0.9720051785449068,-0.9769987044692825,-0.9811041426851055,-0.9842803916139768,-0.9865148517372053,-0.987831529462285,-0.9882991959719793,-0.9880381441486259,-0.9872240086595279,-0.986086223037328,-0.9848961367576362,-0.9839386934251975,-0.9834672365320682,-0.9836518211792185,-0.9845431837454549,-0.9860888810391841,-0.9881985399991358,-0.9907046013923517,-0.993166206512315,-0.9950051934812981,-0.9960608755634731,-0.9966051929632278,-0.9969430278619481,-0.9972283611707742,-0.9975114382195336,-0.9978030546058465,-0.9981042611386164,-0.9984147910030245,-0.9987338420474459,-0.9990574561172403,-0.9993713848784288,-0.9996443055016084,-0.9998391830987953,-0.9999447107477304,-0.9999860482230845,-0.9999974903470575,-0.9999996891080857,-0.9999999748903368,-0.9999999988107886,-0.9999999999748872,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"interior":[0.9533590313867659,0.9547957815211815,0.9562298412439705,0.9576584123144638,0.9590784852185856,0.9604867443210774,0.9618794854875131,0.9632525495580936,0.9646012744310463,0.9659204677814357,0.9672044016309149,0.9684468291285271,0.9696410230373829,0.9707798345828345,0.9718557705397728,0.9728610857525153,0.9737878877190524,0.9746282494552871,0.9753743266008088,0.9760184746445206,0.9765533622368321,0.9769720768076819,0.9772682191110775,0.9774359838448812,0.9774702241212527,0.9773664982563471,0.9771210980731445,0.9767310586338611,0.9761941500050106,0.9755088522789286,0.9746743156053281,0.973690307406011,0.9725571492426519,0.9712756459758397,0.969847009894177,0.968272782412094,0.9665547557460581,0.9646948966970019,0.9626952743107335,0.960557992778065,0.9582851304932841,0.9558786857339288,0.9533405289764165,0.9506723614396317,0.9478756790696548,0.944951740859989,0.9419015401586102,0.9387257774608067,0.9354248331391781,0.9319987386319795,0.9284471448089704,0.9247692865674428,0.9209639431828514,0.9170293945446392,0.9129633741362337,0.9087630204464978,0.9044248293944369,0.8999446112636995,0.8953174565202575,0.8905377156563963,0.8855989987886921,0.8804942010536078,0.8752155598077247,0.8697547491722274,0.8641030164980813,0.8582513638264639,0.8521907753672897,0.8459124894478123,0.8394083103751555,0.832670952351442,0.8256944041794175,0.8184743002594008,0.8110082806098349,0.803296320672027,0.7953410108039485,0.7871477658975544,0.7787249476433336,0.7700838856515917,0.7612387887895546,0.752206544390725,0.7430064099507833,0.7336596089244295,0.7241888485977637,0.7146177830712219,0.7049704476036852,0.6952706915925384,0.6855416362072788,0.6758051793435715,0.6660815655631456,0.6563890326660928,0.6467435402349646,0.6371585796096302,0.6276450598956295,0.6182112611770086,0.6088628442585116,0.5996029059244774,0.590432069598176,0.5813486030125168,0.5723485566118548,0.5634259184784921,0.5545727832939197,0.54577953401056,0.5370350354672344,0.5283268391907886,0.5196413982294491,0.5109642902424067,0.5022804464058583,0.49357438313715735,0.48483043328399866,0.4760329733169373,0.4671666431930419,0.45821655588103327,0.4491684939876124,0.44000909142901923,0.43072599858595306,0.4213080298132679,0.4117452925158298,0.4020292972340894,0.39215304830810216,0.3821111147192577,0.3718996806647,0.36151657532428416,0.3509612811594568,0.3402349199633832,0.32934021578717865,0.31828143382296237,0.307064294355056,0.2956958610202389,0.28418440287043534,0.272539230129237,0.2607705040972915,0.24888902240587557,0.23690598174999933,0.2248327213476417,0.2126804516501529,0.20045997423113043,0.18818140024535424,0.17585387628953106,0.16348532780242223,0.15108223118195696,0.13864942642466271,0.1261899821563825,0.1137051242790792,0.10119423798738451,0.08865495053442743,0.07608329883565346,0.06347398185794301,0.05082069290872355,0.03811652167499403,0.025354410520687105,0.01252764456906771,-0.0003696490363831146,-0.013342020085264313,-0.02639226084454655,-0.03952104540296911,-0.052726666521966475,-0.0660048878995291,-0.07934892195076924,-0.09274953396448546,-0.1061952636094088,-0.11967274521279314,-0.1331671000665592,-0.1466623682249253,-0.16014194463689715,-0.17358898547110294,-0.1869867551728222,-0.2003188927015427,-0.21356958563840917,-0.22672365217985135,-0.23976654201044853,-0.25268427625625717,-0.2654633529762093,-0.278090647196269,-0.29055333312380965,-0.30283885128151783,-0.31493493577514997,-0.32682970801807537,-0.3385118343592905,-0.3499707374408016,-0.3611968456085779,-0.37218186165258493,-0.3829190313338293,-0.39340339291288984,-0.4036319903839283,-0.41360403463808676,-0.423320998066513,-0.43278662950863855,-0.4420068788510524,-0.45098972512835356,-0.4597449095596119,-0.4682835856702737,-0.47661791143185084,-0.4847606209539399,-0.4927246226991209,-0.5005226745583086,-0.5081671815672911,-0.5156701495199387,-0.5230433092420574,-0.5302984054268466,-0.5374476248273559,-0.5445041245885145,-0.5514826140031404,-0.5583999410351135,-0.5652756356579254,-0.5721323617888887,-0.5789962257111712,-0.585896881231399,-0.5928673636014012,-0.599943581595137,-0.607163407616123,-0.6145653356890419,-0.6221867290042459,-0.6300617483677073,-0.6382191293997689,-0.6466800428308559,-0.6554563098339321,-0.6645492371150226,-0.6739492769430144,-0.683636610108798,-0.6935826125163537,-0.7037520260647353,-0.7141055424180629,-0.7246024503112192,-0.7352030074218651,-0.7458702744682626,-0.7565712735789089,-0.7672774746254416,-0.7779647374423106,-0.7886129150999197,-0.7992053373302374,-0.8097283453056187,-0.8201709577800835,-0.8305246435653144,-0.8407830871394548,-0.8509417852206802,-0.8609973106108906,-0.8709461201183775,-0.8807828530120079,-0.8904981531971974,-0.9000761463515823,-0.9094918114482011,-0.9187085985037248,-0.9276767378884287,-0.9363327151672037,-0.9446002932549584,-0.9523932208371724,-0.9596194153581583,-0.9661860881874718,-0.9720051785449068,-0.9769987044692825,-0.9811041426851055,-0.9842803916139768,-0.9865148517372053,-0.987831529462285,-0.9882991959719793,-0.9880381441486259,-0.9872240086595279,-0.986086223037328,-0.9848961367576362,-0.9839386934251975,-0.9834672365320682,-0.9836518211792185,-0.9845431837454549,-0.9860888810391841,-0.9881985399991358,-0.9907046013923517,-0.993166206512315,-0.9950051934812981,-0.9960608755634731,-0.9966051929632278,-0.9969430278619481,-0.9972283611707742,-0.9975114382195336,-0.9978030546058465,-0.9981042611386164,-0.9984147910030245,-0.9987338420474459,-0.9990574561172403,-0.9993713848784288,-0.9996443055016084,-0.9998391830987953,-0.9999447107477304,-0.9999860482230845,-0.9999974903470575,-0.9999996891080857,-0.9999999748903368,-0.9999999988107886,-0.9999999999748872,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"xOffsets":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"smoothing":0.42},"targetSlots":{"dynamic-fade":{"edgeHandles":{"left":0.9533590313867659,"right":-1},"deformation":{"resolution":360,"curve":[0.9533590313867659,0.9547957815211815,0.9562298412439705,0.9576584123144638,0.9590784852185856,0.9604867443210774,0.9618794854875131,0.9632525495580936,0.9646012744310463,0.9659204677814357,0.9672044016309149,0.9684468291285271,0.9696410230373829,0.9707798345828345,0.9718557705397728,0.9728610857525153,0.9737878877190524,0.9746282494552871,0.9753743266008088,0.9760184746445206,0.9765533622368321,0.9769720768076819,0.9772682191110775,0.9774359838448812,0.9774702241212527,0.9773664982563471,0.9771210980731445,0.9767310586338611,0.9761941500050106,0.9755088522789286,0.9746743156053281,0.973690307406011,0.9725571492426519,0.9712756459758397,0.969847009894177,0.968272782412094,0.9665547557460581,0.9646948966970019,0.9626952743107335,0.960557992778065,0.9582851304932841,0.9558786857339288,0.9533405289764165,0.9506723614396317,0.9478756790696548,0.944951740859989,0.9419015401586102,0.9387257774608067,0.9354248331391781,0.9319987386319795,0.9284471448089704,0.9247692865674428,0.9209639431828514,0.9170293945446392,0.9129633741362337,0.9087630204464978,0.9044248293944369,0.8999446112636995,0.8953174565202575,0.8905377156563963,0.8855989987886921,0.8804942010536078,0.8752155598077247,0.8697547491722274,0.8641030164980813,0.8582513638264639,0.8521907753672897,0.8459124894478123,0.8394083103751555,0.832670952351442,0.8256944041794175,0.8184743002594008,0.8110082806098349,0.803296320672027,0.7953410108039485,0.7871477658975544,0.7787249476433336,0.7700838856515917,0.7612387887895546,0.752206544390725,0.7430064099507833,0.7336596089244295,0.7241888485977637,0.7146177830712219,0.7049704476036852,0.6952706915925384,0.6855416362072788,0.6758051793435715,0.6660815655631456,0.6563890326660928,0.6467435402349646,0.6371585796096302,0.6276450598956295,0.6182112611770086,0.6088628442585116,0.5996029059244774,0.590432069598176,0.5813486030125168,0.5723485566118548,0.5634259184784921,0.5545727832939197,0.54577953401056,0.5370350354672344,0.5283268391907886,0.5196413982294491,0.5109642902424067,0.5022804464058583,0.49357438313715735,0.48483043328399866,0.4760329733169373,0.4671666431930419,0.45821655588103327,0.4491684939876124,0.44000909142901923,0.43072599858595306,0.4213080298132679,0.4117452925158298,0.4020292972340894,0.39215304830810216,0.3821111147192577,0.3718996806647,0.36151657532428416,0.3509612811594568,0.3402349199633832,0.32934021578717865,0.31828143382296237,0.307064294355056,0.2956958610202389,0.28418440287043534,0.272539230129237,0.2607705040972915,0.24888902240587557,0.23690598174999933,0.2248327213476417,0.2126804516501529,0.20045997423113043,0.18818140024535424,0.17585387628953106,0.16348532780242223,0.15108223118195696,0.13864942642466271,0.1261899821563825,0.1137051242790792,0.10119423798738451,0.08865495053442743,0.07608329883565346,0.06347398185794301,0.05082069290872355,0.03811652167499403,0.025354410520687105,0.01252764456906771,-0.0003696490363831146,-0.013342020085264313,-0.02639226084454655,-0.03952104540296911,-0.052726666521966475,-0.0660048878995291,-0.07934892195076924,-0.09274953396448546,-0.1061952636094088,-0.11967274521279314,-0.1331671000665592,-0.1466623682249253,-0.16014194463689715,-0.17358898547110294,-0.1869867551728222,-0.2003188927015427,-0.21356958563840917,-0.22672365217985135,-0.23976654201044853,-0.25268427625625717,-0.2654633529762093,-0.278090647196269,-0.29055333312380965,-0.30283885128151783,-0.31493493577514997,-0.32682970801807537,-0.3385118343592905,-0.3499707374408016,-0.3611968456085779,-0.37218186165258493,-0.3829190313338293,-0.39340339291288984,-0.4036319903839283,-0.41360403463808676,-0.423320998066513,-0.43278662950863855,-0.4420068788510524,-0.45098972512835356,-0.4597449095596119,-0.4682835856702737,-0.47661791143185084,-0.4847606209539399,-0.4927246226991209,-0.5005226745583086,-0.5081671815672911,-0.5156701495199387,-0.5230433092420574,-0.5302984054268466,-0.5374476248273559,-0.5445041245885145,-0.5514826140031404,-0.5583999410351135,-0.5652756356579254,-0.5721323617888887,-0.5789962257111712,-0.585896881231399,-0.5928673636014012,-0.599943581595137,-0.607163407616123,-0.6145653356890419,-0.6221867290042459,-0.6300617483677073,-0.6382191293997689,-0.6466800428308559,-0.6554563098339321,-0.6645492371150226,-0.6739492769430144,-0.683636610108798,-0.6935826125163537,-0.7037520260647353,-0.7141055424180629,-0.7246024503112192,-0.7352030074218651,-0.7458702744682626,-0.7565712735789089,-0.7672774746254416,-0.7779647374423106,-0.7886129150999197,-0.7992053373302374,-0.8097283453056187,-0.8201709577800835,-0.8305246435653144,-0.8407830871394548,-0.8509417852206802,-0.8609973106108906,-0.8709461201183775,-0.8807828530120079,-0.8904981531971974,-0.9000761463515823,-0.9094918114482011,-0.9187085985037248,-0.9276767378884287,-0.9363327151672037,-0.9446002932549584,-0.9523932208371724,-0.9596194153581583,-0.9661860881874718,-0.9720051785449068,-0.9769987044692825,-0.9811041426851055,-0.9842803916139768,-0.9865148517372053,-0.987831529462285,-0.9882991959719793,-0.9880381441486259,-0.9872240086595279,-0.986086223037328,-0.9848961367576362,-0.9839386934251975,-0.9834672365320682,-0.9836518211792185,-0.9845431837454549,-0.9860888810391841,-0.9881985399991358,-0.9907046013923517,-0.993166206512315,-0.9950051934812981,-0.9960608755634731,-0.9966051929632278,-0.9969430278619481,-0.9972283611707742,-0.9975114382195336,-0.9978030546058465,-0.9981042611386164,-0.9984147910030245,-0.9987338420474459,-0.9990574561172403,-0.9993713848784288,-0.9996443055016084,-0.9998391830987953,-0.9999447107477304,-0.9999860482230845,-0.9999974903470575,-0.9999996891080857,-0.9999999748903368,-0.9999999988107886,-0.9999999999748872,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"interior":[0.9533590313867659,0.9547957815211815,0.9562298412439705,0.9576584123144638,0.9590784852185856,0.9604867443210774,0.9618794854875131,0.9632525495580936,0.9646012744310463,0.9659204677814357,0.9672044016309149,0.9684468291285271,0.9696410230373829,0.9707798345828345,0.9718557705397728,0.9728610857525153,0.9737878877190524,0.9746282494552871,0.9753743266008088,0.9760184746445206,0.9765533622368321,0.9769720768076819,0.9772682191110775,0.9774359838448812,0.9774702241212527,0.9773664982563471,0.9771210980731445,0.9767310586338611,0.9761941500050106,0.9755088522789286,0.9746743156053281,0.973690307406011,0.9725571492426519,0.9712756459758397,0.969847009894177,0.968272782412094,0.9665547557460581,0.9646948966970019,0.9626952743107335,0.960557992778065,0.9582851304932841,0.9558786857339288,0.9533405289764165,0.9506723614396317,0.9478756790696548,0.944951740859989,0.9419015401586102,0.9387257774608067,0.9354248331391781,0.9319987386319795,0.9284471448089704,0.9247692865674428,0.9209639431828514,0.9170293945446392,0.9129633741362337,0.9087630204464978,0.9044248293944369,0.8999446112636995,0.8953174565202575,0.8905377156563963,0.8855989987886921,0.8804942010536078,0.8752155598077247,0.8697547491722274,0.8641030164980813,0.8582513638264639,0.8521907753672897,0.8459124894478123,0.8394083103751555,0.832670952351442,0.8256944041794175,0.8184743002594008,0.8110082806098349,0.803296320672027,0.7953410108039485,0.7871477658975544,0.7787249476433336,0.7700838856515917,0.7612387887895546,0.752206544390725,0.7430064099507833,0.7336596089244295,0.7241888485977637,0.7146177830712219,0.7049704476036852,0.6952706915925384,0.6855416362072788,0.6758051793435715,0.6660815655631456,0.6563890326660928,0.6467435402349646,0.6371585796096302,0.6276450598956295,0.6182112611770086,0.6088628442585116,0.5996029059244774,0.590432069598176,0.5813486030125168,0.5723485566118548,0.5634259184784921,0.5545727832939197,0.54577953401056,0.5370350354672344,0.5283268391907886,0.5196413982294491,0.5109642902424067,0.5022804464058583,0.49357438313715735,0.48483043328399866,0.4760329733169373,0.4671666431930419,0.45821655588103327,0.4491684939876124,0.44000909142901923,0.43072599858595306,0.4213080298132679,0.4117452925158298,0.4020292972340894,0.39215304830810216,0.3821111147192577,0.3718996806647,0.36151657532428416,0.3509612811594568,0.3402349199633832,0.32934021578717865,0.31828143382296237,0.307064294355056,0.2956958610202389,0.28418440287043534,0.272539230129237,0.2607705040972915,0.24888902240587557,0.23690598174999933,0.2248327213476417,0.2126804516501529,0.20045997423113043,0.18818140024535424,0.17585387628953106,0.16348532780242223,0.15108223118195696,0.13864942642466271,0.1261899821563825,0.1137051242790792,0.10119423798738451,0.08865495053442743,0.07608329883565346,0.06347398185794301,0.05082069290872355,0.03811652167499403,0.025354410520687105,0.01252764456906771,-0.0003696490363831146,-0.013342020085264313,-0.02639226084454655,-0.03952104540296911,-0.052726666521966475,-0.0660048878995291,-0.07934892195076924,-0.09274953396448546,-0.1061952636094088,-0.11967274521279314,-0.1331671000665592,-0.1466623682249253,-0.16014194463689715,-0.17358898547110294,-0.1869867551728222,-0.2003188927015427,-0.21356958563840917,-0.22672365217985135,-0.23976654201044853,-0.25268427625625717,-0.2654633529762093,-0.278090647196269,-0.29055333312380965,-0.30283885128151783,-0.31493493577514997,-0.32682970801807537,-0.3385118343592905,-0.3499707374408016,-0.3611968456085779,-0.37218186165258493,-0.3829190313338293,-0.39340339291288984,-0.4036319903839283,-0.41360403463808676,-0.423320998066513,-0.43278662950863855,-0.4420068788510524,-0.45098972512835356,-0.4597449095596119,-0.4682835856702737,-0.47661791143185084,-0.4847606209539399,-0.4927246226991209,-0.5005226745583086,-0.5081671815672911,-0.5156701495199387,-0.5230433092420574,-0.5302984054268466,-0.5374476248273559,-0.5445041245885145,-0.5514826140031404,-0.5583999410351135,-0.5652756356579254,-0.5721323617888887,-0.5789962257111712,-0.585896881231399,-0.5928673636014012,-0.599943581595137,-0.607163407616123,-0.6145653356890419,-0.6221867290042459,-0.6300617483677073,-0.6382191293997689,-0.6466800428308559,-0.6554563098339321,-0.6645492371150226,-0.6739492769430144,-0.683636610108798,-0.6935826125163537,-0.7037520260647353,-0.7141055424180629,-0.7246024503112192,-0.7352030074218651,-0.7458702744682626,-0.7565712735789089,-0.7672774746254416,-0.7779647374423106,-0.7886129150999197,-0.7992053373302374,-0.8097283453056187,-0.8201709577800835,-0.8305246435653144,-0.8407830871394548,-0.8509417852206802,-0.8609973106108906,-0.8709461201183775,-0.8807828530120079,-0.8904981531971974,-0.9000761463515823,-0.9094918114482011,-0.9187085985037248,-0.9276767378884287,-0.9363327151672037,-0.9446002932549584,-0.9523932208371724,-0.9596194153581583,-0.9661860881874718,-0.9720051785449068,-0.9769987044692825,-0.9811041426851055,-0.9842803916139768,-0.9865148517372053,-0.987831529462285,-0.9882991959719793,-0.9880381441486259,-0.9872240086595279,-0.986086223037328,-0.9848961367576362,-0.9839386934251975,-0.9834672365320682,-0.9836518211792185,-0.9845431837454549,-0.9860888810391841,-0.9881985399991358,-0.9907046013923517,-0.993166206512315,-0.9950051934812981,-0.9960608755634731,-0.9966051929632278,-0.9969430278619481,-0.9972283611707742,-0.9975114382195336,-0.9978030546058465,-0.9981042611386164,-0.9984147910030245,-0.9987338420474459,-0.9990574561172403,-0.9993713848784288,-0.9996443055016084,-0.9998391830987953,-0.9999447107477304,-0.9999860482230845,-0.9999974903470575,-0.9999996891080857,-0.9999999748903368,-0.9999999988107886,-0.9999999999748872,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],"xOffsets":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"smoothing":0.42}},"pitch-elastic":{"edgeHandles":{"left":0,"right":0},"deformation":{"resolution":360,"curve":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"interior":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"xOffsets":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"smoothing":0.42}}}},"pitchEnvelope":null}});
const __XenNodalFactoryTroodleKey = 'nodal:factory:troodle';
// The offline Nodal room is lazy-loaded in its own function scope.
if (typeof window !== 'undefined') window.__XenNodalBuiltinTroodle = __XenNodalBuiltinTroodle;

// A generated network is ordinary Nodal data. No editor or installation is mutated.
function generateNodalInstrument(random=Math.random){
 const pick=values=>values[Math.floor(random()*values.length)],count=3+Math.floor(random()*3);
 const nodes=Array.from({length:count},(_,i)=>({id:'discovery-'+i,label:'Node '+(i+1),role:pick(__XenNodalModel.roles),
  x:.2+random()*.6,y:.2+random()*.6,ratio:i===0?1:Math.pow(2,random()*2),cents:0,radius:.4+random()*.3,
  strength:.4+random()*.8,excitation:i===0?.85:.25+random()*.5,pickup:.4+random()*.5,muted:false}));
 const blockedEdges=[];for(let i=1;i<count;i++)for(let j=i+1;j<count;j++)if(random()<.25)blockedEdges.push([nodes[i].id,nodes[j].id]);
 return __XenNodalModel.normalize({schema:__XenNodalModel.schema,schemaVersion:2,kernelVersion:'coupled-modal-v2',name:'Nodal discovery',referenceHz:220,
  seed:Math.floor(random()*4294967296),nodes,blockedEdges,excitation:{kind:pick(['tone','impulse','breath']),level:.55},coupling:.03+random()*.12,
  material:{wave:pick(['sine','triangle','saw','hollow','pulse']),richness:.3+random()*.65,body:random(),stretch:random()*1.2-.6,damping:.2+random()*.6,width:random()*.7},
  articulation:{durationSec:1.2,attackSec:.003+random()*.04,releaseSec:.1+random()*.7}});
}
