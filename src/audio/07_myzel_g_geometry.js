/* G2: one spatial language. X opens the spectrum; Y extends retention.
   Distances between differently labelled organs change the source material.
   IDs identify state only; they never seed random timbre. */
function myzelGSpatialFrame(snapshot, rootHz, cosmosAmount = 0) {
  const c = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
  const width = Math.max(1, snapshot.myzelAudioWidth || 1000);
  const height = Math.max(1, snapshot.myzelAudioHeight || 600);
  const sx=width/Math.min(width,height), sy=height/Math.min(width,height), diagonal=Math.hypot(sx,sy);
  const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
  const nodes = (snapshot.myzelAudioNodes || []).filter(n => !n.muted && n.frequency > 0)
    .map(n => ({id: String(n.id), type: n.config?.modules?.[0]?.type || '',
      custom: !!n.isCustomResident, frequency: c(n.frequency, 35, 8000),
      x: c(n.x / width), y: c(n.y / height),
      radius: Math.max(.035, c(n.config?.auraRadius || 150, 36, 300) / Math.min(width, height)),
      amount: c(n.config?.modules?.[0]?.intensity ?? .8), energy: c(n.energy)}))
    .sort((a,b) => a.frequency-b.frequency || a.x-b.x || a.y-b.y || a.type.localeCompare(b.type));
  const originals = nodes.filter(n => !n.custom).slice(0, 12);
  const bx = c(snapshot.cursorNormalizedX ?? .5), by = c(snapshot.cursorNormalizedY ?? .5);
  const weight = n => Math.exp(-Math.pow(distance(n,{x:bx,y:by}) / n.radius, 2) * 1.4);
  let localSum = 0, localX = 0, localY = 0;
  for (const n of originals) { n.weight = weight(n); localSum += n.weight; localX += n.x * n.weight; localY += n.y * n.weight; }
  const rank = originals.slice().sort((a, b) => b.weight - a.weight);
  const toneRank = nodes.map(n => ({...n, weight: weight(n)})).sort((a, b) => b.weight - a.weight);
  const primary = toneRank[0], secondary = toneRank.find(n => n.id !== primary?.id);
  let links = 0, distanceSum = 0, foldFormant = 0, delayResonance = 0, angular = 0, pairCount = 0;
  for (let i = 0; i < originals.length; i++) for (let j = i + 1; j < originals.length; j++) {
    const a = originals[i], b = originals[j], dx = (b.x - a.x)*sx, dy = (b.y - a.y)*sy;
    const distance = Math.hypot(dx, dy), reach = a.radius + b.radius;
    const proximity = Math.exp(-2 * (distance / Math.max(.04, reach)) ** 2);
    links += proximity; distanceSum += distance; pairCount++;
    const kinds = [a.type, b.type];
    if (kinds.includes('formant_filter') && (kinds.includes('wavefolder') || kinds.includes('drive'))) foldFormant += proximity;
    if (kinds.includes('resonator') && (kinds.includes('grain_blur') || kinds.includes('shimmer_delay') || kinds.includes('comb_filter'))) delayResonance += proximity;
    angular += proximity * Math.abs(dx) / Math.max(.001, distance);
  }
  // MYZEL-COSMOS-01: these are means over all pairs; over random layouts they
  // stay near their average (sd 0.03-0.08). With the constellation cosmos on
  // (Constellation Web > 0) their deviation from the average is widened up to
  // 2.4x, so the shared colour follows each constellation audibly. At 0 the
  // values are exactly the G2 values.
  const gainWide = 1 + 1.4 * c(cosmosAmount);
  const widen = (value, mean) => pairCount && cosmosAmount > 0 ? c(mean + (value - mean) * gainWide) : value;
  const rawDensity = pairCount ? c(links / pairCount) : 0;
  const density = widen(rawDensity, .276);
  const spread = pairCount ? widen(c(distanceSum / pairCount / diagonal), .28) : .4;
  const hollow = widen(c(.15 + (1-Math.exp(-foldFormant*.7))*.34 + (links ? angular / links : .5) * .35), .507);
  const bloom = widen(c(.12 + (1-Math.exp(-(delayResonance*.20+rawDensity*.75)))*.84), .398);
  const openness = localSum > 1e-6 ? localX / localSum : bx;
  const retention = localSum > 1e-6 ? localY / localSum : by;
  return {
    density, spread, hollow, bloom, openness, retention,
    // At most two locally competitive organs; stable identity selected in live bridge.
    organs: rank.slice(0, 2).map(n => ({id: n.id, type: n.type, frequency: n.frequency,
      weight: n.weight, amount: n.amount, x: n.x, y: n.y,
      memory: .28 + n.y * 2.8, coupling: density})),
    tone: primary ? {id: primary.id, frequency: primary.frequency, weight: primary.weight} : null,
    neighbour: secondary ? {id: secondary.id, frequency: secondary.frequency,
      weight: secondary.weight * Math.exp(-distance(secondary,primary)/diagonal * 3)} : null,
    nodeCount: originals.length
  };
}

/* MYZEL-COSMOS-01: the constellation cosmos. Positions, organ roles and JI
   pitches of one constellation define its own sound world: a web of links
   (every node to its two nearest neighbours), travel times along them, how
   long and how strongly the web carries energy, voice timbre and register.
   Raw features are ranked against their distribution over Rebuild Layout
   rolls (tables below, 4000 random layouts), so each roll lands anywhere in
   the full range instead of near an average. Pure geometry: no ID or random
   number seeds the result, a saved constellation brings back its cosmos.
   Recomputed only when the layout changes (key compare), never per sample. */
const MYZEL_COSMOS_RANKS=Object.freeze({
  nearest:[0.2018,0.3602,0.396,0.4222,0.4439,0.4636,0.4829,0.5081,0.5326,0.5661,0.7318],
  elongation:[0.006,0.111,0.1593,0.2,0.2348,0.2719,0.3079,0.3479,0.3973,0.4687,0.7843],
  vertical:[0.0008,0.228,0.4112,0.5368,0.6273,0.7009,0.7732,0.8448,0.9148,0.9744,1],
  vspread:[0.0955,0.1763,0.1927,0.2036,0.2115,0.2192,0.2279,0.2359,0.2458,0.2588,0.323],
  consonance:[0.2535,0.2829,0.2899,0.2952,0.2995,0.3037,0.3076,0.3118,0.3172,0.3243,0.3593],
  linkLength:[0.1608,0.2607,0.2803,0.2939,0.3068,0.3173,0.3292,0.3397,0.3528,0.371,0.444],
  centreX:[0.2882,0.4177,0.4439,0.4648,0.4849,0.502,0.52,0.537,0.5583,0.5869,0.7532],
  centreY:[0.2399,0.4159,0.4435,0.4651,0.4848,0.5006,0.5181,0.5364,0.5585,0.5862,0.7399],
  nonlinear:[0.2143,0.375,0.4,0.4286,0.4615,0.4706,0.5,0.5333,0.5625,0.6,0.875],
  resonant:[0,0.0588,0.0625,0.0667,0.0714,0.1176,0.125,0.1333,0.1765,0.2,0.4]});
const MYZEL_COSMOS_GROUPS=Object.freeze({wavefolder:'n',drive:'n',bitcrusher:'n',resonator:'r',comb_filter:'r',
  shimmer_delay:'r',grain_blur:'r',formant_filter:'s',spectral_tilt:'s',chorus:'s',sub_harmonic:'s'});
function myzelCosmosRank(table,value){
  if(!table||!Number.isFinite(value))return .5;
  const last=table.length-1;if(value<=table[0])return 0;if(value>=table[last])return 1;
  for(let i=1;i<=last;i++)if(value<=table[i]){const span=table[i]-table[i-1];return (i-1+(span>0?(value-table[i-1])/span:.5))/last;}
  return 1;
}
// Harmonic simplicity of an interval: 1 for 1/1 and 2/1, falling with the
// Tenney height of the nearest ratio p/q (p,q <= 16) within 14 cents.
function myzelCosmosAffinity(ratio){
  if(!(ratio>0)||!Number.isFinite(ratio))return 0;
  let r=ratio;while(r>=2)r/=2;while(r<1)r*=2;
  let best=0;
  for(let q=1;q<=16;q++)for(let p=q;p<2*q&&p<=32;p++){
    if(Math.abs(1200*Math.log2(r*q/p))>14)continue;
    let a=p,b=q;while(b){const t=a%b;a=b;b=t;}
    const height=Math.log2((p/a)*(q/a)),value=1/(1+Math.max(0,height)/2.6);
    if(value>best)best=value;
  }
  return best;
}
let __myzelCosmosCache=null,__myzelCosmosView=null,__myzelCosmosVersion=0;
function myzelGConstellationRaw(points){
  // points: [{X,Y,u,v,f,type,custom}], X/Y aspect-corrected (short side = 1).
  const n=points.length,c=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
  const dist=(a,b)=>Math.hypot(a.X-b.X,a.Y-b.Y);
  const edges=[],seen=new Set();
  for(let i=0;i<n;i++){
    const order=[];for(let j=0;j<n;j++)if(j!==i)order.push([dist(points[i],points[j]),j]);
    order.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    for(const [d,j] of order.slice(0,2)){const a=Math.min(i,j),b=Math.max(i,j),k=a*64+b;
      if(!seen.has(k)){seen.add(k);edges.push({a,b,d,affinity:myzelCosmosAffinity(points[a].f/points[b].f)});}}
  }
  // connected parts of the link graph
  const parent=points.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
  for(const e of edges)parent[find(e.a)]=find(e.b);
  let components=0;for(let i=0;i<n;i++)if(find(i)===i)components++;
  let nearest=0;for(let i=0;i<n;i++){let m=Infinity;for(let j=0;j<n;j++)if(j!==i)m=Math.min(m,dist(points[i],points[j]));if(Number.isFinite(m))nearest+=m;}
  const mean=k=>points.reduce((s,p)=>s+p[k],0)/Math.max(1,n);
  const mu=mean('u'),mv=mean('v');let suu=0,svv=0,suv=0;
  for(const p of points){suu+=(p.u-mu)**2;svv+=(p.v-mv)**2;suv+=(p.u-mu)*(p.v-mv);}
  suu/=Math.max(1,n);svv/=Math.max(1,n);suv/=Math.max(1,n);
  const tr=suu+svv,det=suu*svv-suv*suv,root=Math.sqrt(Math.max(0,tr*tr/4-det));
  const big=tr/2+root,small=Math.max(0,tr/2-root),angle=.5*Math.atan2(2*suv,suu-svv);
  let nonlinear=0,resonant=0,consonance=0,length=0;
  for(const e of edges){const ga=MYZEL_COSMOS_GROUPS[points[e.a].type],gb=MYZEL_COSMOS_GROUPS[points[e.b].type];
    if(ga==='n'||gb==='n')nonlinear++;if(ga==='r'&&gb==='r')resonant++;consonance+=e.affinity;length+=e.d;}
  const m=Math.max(1,edges.length),area=n?points[0].sx*points[0].sy:1;
  return {edges,components,raw:{
    nearest:n>1?nearest/n/Math.sqrt(area/n):.5,
    elongation:big>1e-9?1-Math.sqrt(small/big):0,
    vertical:Math.abs(Math.sin(angle)),
    vspread:Math.sqrt(svv),
    consonance:consonance/m,
    linkLength:length/m,
    centreX:mu,centreY:mv,
    nonlinear:nonlinear/m,resonant:resonant/m,components}};
}
function myzelGConstellation(snapshot){
  const list=snapshot?.myzelAudioNodes;if(!Array.isArray(list))return null;
  const width=Math.max(1,snapshot.myzelAudioWidth||1000),height=Math.max(1,snapshot.myzelAudioHeight||600);
  let key=width+'x'+height;
  for(const node of list)key+='|'+node.id+','+(node.muted?1:0)+','+Math.round(node.x*2)+','+Math.round(node.y*2)+','+
    Math.round((node.frequency||0)*100)+','+(node.config?.modules?.[0]?.type||'')+','+(node.isCustomResident?1:0)+','+Math.round(node.config?.auraRadius||150);
  if(__myzelCosmosCache?.key===key)return __myzelCosmosCache;
  const c=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
  const short=Math.min(width,height),sx=width/short,sy=height/short;
  const points=list.filter(node=>!node.muted&&node.frequency>0)
    .map(node=>({id:String(node.id),f:c(node.frequency,35,8000),u:c(node.x/width),v:c(node.y/height),
      type:node.config?.modules?.[0]?.type||'',custom:!!node.isCustomResident,
      radius:Math.max(.035,c(node.config?.auraRadius||150,36,300)/short),px:node.x,py:node.y,sx,sy}))
    .sort((a,b)=>a.f-b.f||a.u-b.u||a.v-b.v||a.id.localeCompare(b.id)).slice(0,16);
  for(const p of points){p.X=p.u*sx;p.Y=p.v*sy;}
  const R=MYZEL_COSMOS_RANKS,{edges,components,raw}=myzelGConstellationRaw(points);
  const few=points.length<3,q=(name,value)=>few?.5:myzelCosmosRank(R[name],value);
  const cluster=1-q('nearest',raw.nearest),elong=q('elongation',raw.elongation),vertical=q('vertical',raw.vertical);
  const cons=q('consonance',raw.consonance),reach=q('linkLength',raw.linkLength),cx=q('centreX',raw.centreX),cy=q('centreY',raw.centreY);
  const vspread=q('vspread',raw.vspread),nonlinear=q('nonlinear',raw.nonlinear),resonant=q('resonant',raw.resonant);
  const islands=few?.5:c((components-1)/2);
  const params={
    web:.15+.70*c(.55*cluster+.45*cons),
    travel:.16*2**(3.4*c(.6*elong+.4*reach)),
    attack:.004*2**(6.6*c(.6*(1-elong)+.4*cons)),
    decay:.18*2**(3.2*c(.5*cluster+.5*cy)),
    metal:c(1.1*(.65*(1-cons)+.35*nonlinear)-.1),
    hollow:c(.6*vertical+.4*resonant),
    bright:c(.6*cx+.4*(1-cluster)),
    detune:16*c(.55*(1-cons)+.45*islands)**1.6,
    span:3.2*vspread,
    sympathy:.35+.65*cons,
    glow:.10+.40*cluster};
  // Links: travel time grows with distance; a node passes on at most `web`
  // of each impulse, shared by proximity and interval simplicity.
  const out=points.map(()=>0),weight=e=>Math.exp(-e.d*1.2)*(.45+.55*e.affinity);
  for(const e of edges){out[e.a]+=weight(e);out[e.b]+=weight(e);}
  const links=edges.map(e=>({a:e.a,b:e.b,d:e.d,affinity:e.affinity,delay:Math.min(1.8,.03+e.d*params.travel),
    gainAB:params.web*weight(e)/Math.max(1e-9,out[e.a]),gainBA:params.web*weight(e)/Math.max(1e-9,out[e.b])}));
  // Resonator organs ring with the intervals of their two strongest links (folded into 2..4).
  const fold=r=>{let x=r;while(x>=4)x/=2;while(x<2)x*=2;return x;};
  const partners=new Map();
  points.forEach((p,i)=>{const own=links.filter(l=>l.a===i||l.b===i).sort((x,y)=>(y.a===i?y.gainAB:y.gainBA)-(x.a===i?x.gainAB:x.gainBA)).slice(0,2)
    .map(l=>fold(points[l.a===i?l.b:l.a].f/p.f));if(own.length)partners.set(p.id,own);});
  const nodes=points.map(p=>{const octave=Math.round((.5-p.v)*params.span);
    return {id:p.id,f:c(p.f*2**octave,40,2400),X:p.X,Y:p.Y,radius:p.radius,pan:c((p.u-.5)*1.7,-.85,.85),
      tau:params.decay*(.6+.8*p.v),detune:(p.u-.5)*2,octave,px:p.px,py:p.py};});
  const words=[params.web>.68?'resonant web':params.web<.45?'sparse web':'woven web',
    params.metal>.6?'metallic':params.metal<.3?'glassy':'bronze',
    params.attack<.02?'plucked':params.attack>.1?'swelling':'struck',
    params.travel>.75?'slow echoes':params.travel<.33?'quick echoes':'drifting echoes'];
  if(params.span>2.2)words.push('wide registers');else if(params.span<.8)words.push('one register');
  if(params.detune>7)words.push('beating');if(params.hollow>.62)words.push('hollow');
  if(components>1)words.push(components+' islands');
  const version=++__myzelCosmosVersion;
  __myzelCosmosCache={key,version,params,nodes,links,partners,components,summary:words.join(' · '),
    payload:{version,sx,sy,ids:nodes.map(n=>n.id),f:nodes.map(n=>n.f),X:nodes.map(n=>n.X),Y:nodes.map(n=>n.Y),
      radius:nodes.map(n=>n.radius),pan:nodes.map(n=>n.pan),tau:nodes.map(n=>n.tau),detune:nodes.map(n=>n.detune),
      links:links.flatMap(l=>[l.a,l.b,l.delay,l.gainAB,l.gainBA]),
      attack:params.attack,metal:params.metal,hollow:params.hollow,bright:params.bright,detuneCents:params.detune,
      sympathy:params.sympathy,glow:params.glow}};
  return __myzelCosmosCache;
}
// Canvas overlay: the links that carry sound, drawn while the hum is running.
function myzelGDrawCosmos(ctx){
  const view=__myzelCosmosView;if(!view||!ctx)return;
  const now=typeof performance!=='undefined'?performance.now():Date.now();if(now-view.at>600)return;
  const cosmos=view.cosmos;ctx.save();
  for(const l of cosmos.links){const a=cosmos.nodes[l.a],b=cosmos.nodes[l.b];if(!a||!b)continue;
    const g=Math.max(l.gainAB,l.gainBA);
    ctx.strokeStyle=`rgba(150,225,255,${(.10+g*.32).toFixed(3)})`;ctx.lineWidth=.6+g*2.2;
    ctx.setLineDash([2+l.delay*10,3]);ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke();}
  ctx.restore();
}
