export function audioPass(test) {
  return test?.reference?.finite===true && test?.candidate?.finite===true
    && test.reference.peak>0.001 && test.candidate.peak>0.001
    && test.compare?.lengthEqual===true
    && Number.isFinite(test.compare?.maxAbs) && test.compare.maxAbs<=1e-3
    && Number.isFinite(test.compare?.rms) && test.compare.rms<=1e-3;
}
export function assessBrowserResult(result) {
  const t=result.tests,sr=result.environment.sampleRate;
  return Boolean(audioPass(t.referenceNormal)&&audioPass(t.referenceHeld)&&audioPass(t.referenceChord)
    &&t.stall500?.frameAdvance>sr*.35&&t.stall500?.programStartsAdvance>=1&&t.stall500.programStartsAdvance<=12
    &&t.staleAttack?.startsAfter===t.staleAttack?.startsBefore&&t.staleAttack?.expired>t.staleAttack?.expiredBefore
    &&t.releaseBeforeStart?.startsAfter===t.releaseBeforeStart?.startsBefore&&t.releaseBeforeStart?.cancelled>t.releaseBeforeStart?.cancelledBefore
    &&t.stateHighWater?.stateRevision===t.stateHighWater?.expectedRevision
    &&t.panic?.ownerClosed===1&&t.panic.programRunning===0&&t.panic.activeVoices===0&&t.panic.pendingGroups===0&&t.panic.peak===0
    &&t.panic.frame>t.panic.requestedFrame+Math.ceil(sr*.005)
    &&result.faults?.length===0);
}
