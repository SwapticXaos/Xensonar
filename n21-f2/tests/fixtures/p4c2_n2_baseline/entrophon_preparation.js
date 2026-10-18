const __entConfigCache = new WeakMap();
function __entPreparedConfig(config) {
  let prepared = __entConfigCache.get(config);
  if (prepared) return prepared;
  const count = Math.max(1, Math.min(6, Math.round(config.unison)));
  const unison = [];
  for (let i = 0; i < count; i++) {
    const cents = count === 1 ? 0 : config.unisonSpread > 0 ?
      Zie(i, count, config.detune, config.unisonSpread) : (i - (count - 1) / 2) * config.detune;
    unison.push(Math.pow(2, cents / 1200));
  }
  const colorSet = config.colorSet === "default" ? null : Wie[config.colorSet];
  const colorRatios = colorSet ? colorSet.ratios : [0.5, Math.pow(2,19/31), Math.pow(2,7/31)];
  const colorLevel = config.enabled ? config.colorAmount * config.engineAmount : 0;
  const colorGains = (colorSet ? colorSet.gains : [0.24,0.2,0.14]).map(g => g * colorLevel);
  prepared = {unison, colorRatios, colorGains};
  __entConfigCache.set(config, prepared);
  return prepared;
}

