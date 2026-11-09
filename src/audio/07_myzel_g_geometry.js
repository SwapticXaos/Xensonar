/* G2: one spatial language. X opens the spectrum; Y extends retention.
   Distances between differently labelled organs change the source material.
   IDs identify state only; they never seed random timbre. */
function myzelGSpatialFrame(snapshot, rootHz) {
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
  const density = pairCount ? c(links / pairCount) : 0;
  const spread = pairCount ? c(distanceSum / pairCount / diagonal) : .4;
  const hollow = c(.15 + (1-Math.exp(-foldFormant*.7))*.34 + (links ? angular / links : .5) * .35);
  const bloom = c(.12 + (1-Math.exp(-(delayResonance*.20+density*.75)))*.84);
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
