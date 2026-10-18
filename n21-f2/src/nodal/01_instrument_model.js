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
