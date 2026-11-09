/* Carrier snapshots have one owner. Hits retain only identity tokens and the
 * already prepared support, never a complete project or donor PCM. */
function __createForgeCarrierCapture({signature, Grid, buildPlan, freeze}) {
  const identities = new WeakMap();
  let nextIdentity = 0, lastInput = null, prepared = null;
  function identity(value) {
    let token = identities.get(value);
    if (token === undefined) { token = ++nextIdentity; identities.set(value, token); }
    return token;
  }
  function capture(state, durationSec, sampleRate, eligible) {
    const input = eligible ? {
      owner: identity(state), grid: identity(state.spectralData),
      // renderVersion is a publication counter, not a grid mutation revision.
      content: signature(state.spectralData),
      melodic: JSON.stringify(state.spectralData.melodicCarrier ?? null),
      width: state.spectralData.width, height: state.spectralData.height,
      durationSec, sampleRate
    } : null;
    const old = lastInput;
    if (input && old && input.owner === old.owner && input.grid === old.grid &&
        input.content === old.content && input.melodic === old.melodic &&
        input.width === old.width && input.height === old.height &&
        input.durationSec === old.durationSec && input.sampleRate === old.sampleRate)
      return prepared;
    // A stale owner or failed capture must not leave an earlier hit eligible.
    lastInput = null;
    const snapshot = state.createProjectSnapshot();
    const grid = new Grid(state.spectralData.width, state.spectralData.height);
    grid.restoreData(snapshot.spectralSnapshot);
    grid.melodicCarrier = snapshot.melodicCarrier ?? null;
    const key = JSON.stringify([signature(grid), snapshot.melodicCarrier ?? null, durationSec, sampleRate]);
    if (!prepared || prepared.key !== key) {
      const plan = buildPlan(grid, durationSec);
      if (!plan.bands.some(b => b.gainCurve.some(value => value > 0)))
        throw Error('The carrier figure is empty.');
      const length = Math.round(sampleRate * durationSec);
      prepared = Object.freeze({key, support: Object.freeze({
        plan: freeze(plan), length,
        activeAt: i => plan.bands.some(b => b.gainCurve[Math.round(i / Math.max(1, length - 1) * (b.gainCurve.length - 1))] > 0)
      })});
    }
    lastInput = input;
    return prepared;
  }
  return Object.freeze({capture});
}
