function createEcho(ctx: AudioContext) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  const feedback = ctx.createGain();
  const delayA = ctx.createDelay(1.5);
  const delayB = ctx.createDelay(1.5);
  delayA.delayTime.value = 0.27;
  delayB.delayTime.value = 0.41;
  feedback.gain.value = 0.28;
  wet.gain.value = 0.22;
  dry.gain.value = 1;

  input.connect(dry);
  input.connect(delayA);
  delayA.connect(delayB);
  delayB.connect(feedback);
  feedback.connect(delayA);
  delayB.connect(wet);
  dry.connect(output);
  wet.connect(output);

  return { input, output, wet, dry, feedback };
}
