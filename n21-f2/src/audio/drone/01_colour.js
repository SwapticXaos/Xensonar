/* Bounded, context-owned source colours for the opt-in Xenpolar Drone.
   Changing colour keeps the running oscillator and its phase. No extra voice,
   worklet, timer or audio-callback allocation is introduced. */
const __xenDroneColourBanks = new WeakMap();
function __xenDroneColour(ctx, oscillator, value, owner) {
  if (!ctx.createPeriodicWave || !oscillator.setPeriodicWave) {
    if (oscillator.type !== 'triangle') oscillator.type = 'triangle';
    return;
  }
  const slot = Math.round(Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 32);
  const previous = owner.__droneColour;
  if (previous?.oscillator === oscillator && previous.context === ctx && previous.slot === slot && oscillator.type === 'custom') return;
  let bank = __xenDroneColourBanks.get(ctx);
  if (!bank) { bank = new Map(); __xenDroneColourBanks.set(ctx, bank); }
  let wave = bank.get(slot);
  if (!wave) {
    const real = new Float32Array(17), imag = new Float32Array(17), blend = slot / 32 * .72;
    for (let harmonic = 1; harmonic <= 16; harmonic++) {
      const triangle = harmonic % 2 ? (harmonic % 4 === 1 ? 1 : -1) / (harmonic * harmonic) : 0;
      const softSaw = Math.exp(-(harmonic - 1) / 10) / harmonic;
      imag[harmonic] = triangle * (1 - blend) + softSaw * blend;
    }
    wave = ctx.createPeriodicWave(real, imag);
    bank.set(slot, wave);
  }
  oscillator.setPeriodicWave(wave);
  owner.__droneColour = {context:ctx, oscillator, slot};
}
