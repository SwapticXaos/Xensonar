
class XensonarRootFollowWorkletShadowBridge extends AudioWorkletProcessor {
  constructor() {
    super();
    this.messageCount = 0;
    this.directPilotMessageCount = 0;
    this.granularPlanMessageCount = 0;
    this.bufferTransferMessageCount = 0;
    this.granularPilotMessageCount = 0;
    this.stableLaneMessageCount = 0;
    this.bridgeSessionId = 0;
    this.processorGeneration = 0;
    this.stableLaneBufferAckCount = 0;
    this.stableLaneBufferRejectCount = 0;
    this.stableLanePlanAckCount = 0;
    this.stableLanePlanRejectCount = 0;
    this.stableLaneLastAcceptedPlanSequence = 0;
    this.stableLanePlanTransportAcceptedCount = 0;
    this.stableLanePlanTransportDroppedStaleCount = 0;
    this.stableLaneLastRejectedReason = null;
    this.processQuantumCount = 0;
    this.renderedFrameCount = 0;
    this.renderedSampleCount = 0;
    this.activeRenderQuantumCount = 0;
    this.directRenderedFrameCount = 0;
    this.granularRenderedFrameCount = 0;
    this.stableLaneRenderedFrameCount = 0;
    this.stableLaneActiveRenderQuantumCount = 0;
    this.processHotPathCompactionCount = 0;
    this.processHotPathDroppedDirectCount = 0;
    this.processHotPathDroppedGranularCount = 0;
    this.processHotPathRetainedDirectCount = 0;
    this.processHotPathRetainedGranularCount = 0;
    this.stableLaneHoldQuantumCount = 0;
    this.stableLaneCrossfadeFrameCount = 0;
    this.stableLaneGainRampFrameCount = 0;
    this.stableLanePlanCount = 0;
    this.stableLaneRetuneCount = 0;
    this.lastThroughputReportAtWorkletTimeSec = 0;
    this.stableLaneSyntheticSilentProbeAttemptCount = 0;
    this.stableLaneSyntheticSilentProbeAckCount = 0;
    this.stableLaneSyntheticSilentProbeLastResult = null;
    this.directPilotActive = false;
    this.granularPilotActive = false;
    this.stableLaneActive = false;
    this.stableLane = null;
    this.previousStableLane = null;
    this.stableLaneGain = 0;
    this.stableLanePlaybackRate = 1;
    this.stableLaneFadeFrames = Math.max(128, Math.floor(sampleRate * 0.010));
    this.stableLaneSeamFadeFrames = Math.max(64, Math.min(512, Math.floor(sampleRate * 0.006)));
    this.stableLaneSeamGuardFrameCount = 0;
    this.events = [];
    this.granularEvents = [];
    this.phaseById = new Map();
    this.sampleBuffers = new Map();
    this.makeStableLaneBufferKey = (entryId, bufferGeneration) => String(entryId || '') + ':' + String(Math.max(0, Number(bufferGeneration) || 0));
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'root-follow-worklet-ping') {
        this.port.postMessage({
          type: 'root-follow-worklet-pong',
          processQuantumCount: this.processQuantumCount,
          renderedFrameCount: this.renderedFrameCount,
          stableLanePlanCount: this.stableLanePlanCount,
          stableLaneActive: this.stableLaneActive,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-shadow-plan') {
        this.messageCount += 1;
        this.port.postMessage({
          type: 'root-follow-worklet-shadow-ack',
          messageCount: this.messageCount,
          eventCount: Number(data.eventCount) || 0,
          audioNowSec: Number(data.audioNowSec) || 0,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-granular-shadow-plan') {
        this.granularPlanMessageCount += 1;
        const windows = Array.isArray(data.plan && data.plan.windows) ? data.plan.windows : [];
        this.port.postMessage({
          type: 'root-follow-worklet-granular-shadow-ack',
          messageCount: this.granularPlanMessageCount,
          windowCount: windows.length,
          activeAudioPath: Boolean(data.plan && data.plan.activeAudioPath),
          hasSampleBufferTransfer: Boolean(data.plan && data.plan.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-stable-lane-buffer-transfer') {
        this.bufferTransferMessageCount += 1;
        const transfer = data.transfer || {};
        const bridgeSessionId = Math.max(0, Number(data.bridgeSessionId) || 0);
        const processorGeneration = Math.max(0, Number(data.processorGeneration) || 0);
        const bufferGeneration = Math.max(1, Number(data.bufferGeneration) || Number(transfer.bufferGeneration) || 1);
        const channels = Array.isArray(transfer.channels) ? transfer.channels : [];
        let copiedFrameCount = 0;
        let copiedByteLength = 0;
        for (let index = 0; index < channels.length; index += 1) {
          const channel = channels[index] || {};
          const dataArray = channel.data;
          copiedFrameCount += Number(channel.frameCount) || (dataArray && dataArray.length) || 0;
          copiedByteLength += dataArray && dataArray.byteLength ? dataArray.byteLength : 0;
        }
        const entryId = String(transfer.entryId || '');
        const channelData = channels.map((channel) => channel && channel.data).filter(Boolean);
        let ok = false;
        let rejectedReason = 'ok';
        if (!entryId) rejectedReason = 'missing-entry-id';
        else if (channelData.length === 0 || copiedFrameCount <= 0) rejectedReason = 'empty-buffer';
        else if (bridgeSessionId !== 0 && this.bridgeSessionId !== 0 && bridgeSessionId !== this.bridgeSessionId) rejectedReason = 'stale-session';
        else if (processorGeneration !== 0 && this.processorGeneration !== 0 && processorGeneration !== this.processorGeneration) rejectedReason = 'stale-generation';
        else {
          ok = true;
          rejectedReason = 'ok';
          this.bridgeSessionId = bridgeSessionId || this.bridgeSessionId;
          this.processorGeneration = processorGeneration || this.processorGeneration;
          const bufferState = {
            entryId,
            bufferGeneration,
            bridgeSessionId,
            processorGeneration,
            transferSignature: String(transfer.transferSignature || ''),
            sampleRate: Math.max(1, Number(transfer.sampleRate) || sampleRate),
            transferStartFrame: Math.max(0, Number(transfer.transferStartFrame) || 0),
            transferFrameCount: Math.max(0, Number(transfer.transferFrameCount) || 0),
            channels: channelData,
          };
          this.sampleBuffers.set(this.makeStableLaneBufferKey(entryId, bufferGeneration), bufferState);
          this.sampleBuffers.set(entryId, bufferState);
          this.stableLaneBufferAckCount += 1;
        }
        if (!ok) {
          this.stableLaneBufferRejectCount += 1;
          this.stableLaneLastRejectedReason = rejectedReason;
        }
        this.port.postMessage({
          type: 'root-follow-worklet-stable-lane-buffer-ack',
          messageCount: this.bufferTransferMessageCount,
          bridgeSessionId,
          processorGeneration,
          entryId,
          bufferGeneration,
          ok,
          rejectedReason,
          channelCount: channels.length,
          copiedFrameCount,
          copiedByteLength,
          activeAudioPath: Boolean(transfer.activeAudioPath),
          hasSampleBufferTransfer: Boolean(transfer.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-buffer-shadow-transfer') {
        this.bufferTransferMessageCount += 1;
        const transfer = data.transfer || {};
        const channels = Array.isArray(transfer.channels) ? transfer.channels : [];
        let copiedFrameCount = 0;
        let copiedByteLength = 0;
        for (let index = 0; index < channels.length; index += 1) {
          const channel = channels[index] || {};
          const dataArray = channel.data;
          copiedFrameCount += Number(channel.frameCount) || (dataArray && dataArray.length) || 0;
          copiedByteLength += dataArray && dataArray.byteLength ? dataArray.byteLength : 0;
        }
        const entryId = String(transfer.entryId || '');
        if (entryId && channels.length > 0) {
          this.sampleBuffers.set(entryId, {
            entryId,
            bufferGeneration: 0,
            transferSignature: String(transfer.transferSignature || ''),
            sampleRate: Math.max(1, Number(transfer.sampleRate) || sampleRate),
            transferStartFrame: Math.max(0, Number(transfer.transferStartFrame) || 0),
            transferFrameCount: Math.max(0, Number(transfer.transferFrameCount) || 0),
            channels: channels.map((channel) => channel && channel.data).filter(Boolean),
          });
        }
        this.port.postMessage({
          type: 'root-follow-worklet-buffer-shadow-ack',
          messageCount: this.bufferTransferMessageCount,
          entryId,
          transferSignature: String(transfer.transferSignature || ''),
          channelCount: channels.length,
          copiedFrameCount,
          copiedByteLength,
          activeAudioPath: Boolean(transfer.activeAudioPath),
          hasSampleBufferTransfer: Boolean(transfer.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-granular-pilot-plan') {
        this.granularPilotMessageCount += 1;
        this.granularPilotActive = data.active === true;
        const plan = data.plan || {};
        const windows = Array.isArray(plan.windows) ? plan.windows : [];
        const entryId = String(plan.entryId || '');
        const buffer = this.sampleBuffers.get(entryId);
        const safeNow = Number(data.audioNowSec) || currentTime;
        const maxEnd = safeNow + 2.5;
        const kept = [];
        if (buffer && this.granularPilotActive) {
          for (let index = 0; index < windows.length && kept.length < 48; index += 1) {
            const raw = windows[index] || {};
            const startSec = Math.max(safeNow - 0.02, Math.min(Number(raw.windowStartSec) || safeNow, maxEnd));
            const durationSec = Math.max(0.012, Math.min(Number(raw.windowDurationSec) || 0.08, 0.45));
            const endSec = Math.max(startSec + 0.012, Math.min(startSec + durationSec, maxEnd));
            const sourceOffsetSec = Math.max(0, Number(raw.sourceOffsetSec) || 0);
            const playbackRate = Math.max(0.03125, Math.min(8, Number(raw.playbackRate) || 1));
            const densityScale = Math.max(0, Math.min(1, Number(raw.densityScale) || 1));
            kept.push({
              id: String(raw.id || (entryId + ':granular-pilot:' + this.granularPilotMessageCount + ':' + index)),
              entryId,
              startSec,
              endSec,
              sourceOffsetSec,
              playbackRate,
              gain: Math.max(0, Math.min(0.22, 0.045 * (0.5 + densityScale * 0.5))),
            });
          }
        }
        this.compactAndAppendBoundedEvents(this.granularEvents, kept, currentTime - 0.05, 96);
        this.port.postMessage({
          type: 'root-follow-worklet-granular-pilot-ack',
          messageCount: this.granularPilotMessageCount,
          acceptedWindowCount: kept.length,
          active: this.granularPilotActive,
          bufferAvailable: Boolean(buffer),
          entryId,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-stable-lane-plan') {
        this.stableLaneMessageCount += 1;
        const plan = data.plan || {};
        const isSyntheticSilentProbe = data.probeKind === 'stable-lane-synthetic-silent-plan' || plan.probeKind === 'stable-lane-synthetic-silent-plan';
        if (isSyntheticSilentProbe) this.stableLaneSyntheticSilentProbeAttemptCount += 1;
        const bridgeSessionId = Math.max(0, Number(data.bridgeSessionId) || 0);
        const processorGeneration = Math.max(0, Number(data.processorGeneration) || 0);
        const entryId = String(plan.entryId || '');
        const bufferGeneration = Math.max(1, Number(data.bufferGeneration) || Number(plan.bufferGeneration) || 1);
        const bufferKey = this.makeStableLaneBufferKey(entryId, bufferGeneration);
        const buffer = this.sampleBuffers.get(bufferKey) || null;
        const planSequence = Math.max(0, Number(plan.planSequence) || this.stableLaneMessageCount);
        let ok = false;
        let rejectedReason = 'ok';
        if (data.active !== true) rejectedReason = 'inactive-plan';
        else if (!entryId) rejectedReason = 'missing-entry-id';
        else if (!buffer) rejectedReason = 'missing-buffer';
        else if (bridgeSessionId !== 0 && buffer.bridgeSessionId !== 0 && bridgeSessionId !== buffer.bridgeSessionId) rejectedReason = 'stale-session';
        else if (processorGeneration !== 0 && buffer.processorGeneration !== 0 && processorGeneration !== buffer.processorGeneration) rejectedReason = 'stale-generation';
        else if (buffer.bufferGeneration !== bufferGeneration) rejectedReason = 'stale-buffer-generation';
        else if (planSequence < this.stableLaneLastAcceptedPlanSequence) rejectedReason = 'stale-plan-sequence';
        else ok = true;
        if (ok) {
          this.stableLaneLastAcceptedPlanSequence = Math.max(this.stableLaneLastAcceptedPlanSequence, planSequence);
          this.stableLanePlanTransportAcceptedCount += 1;
          const loopStartSec = Math.max(0, Number(plan.loopStartSec) || 0);
          const loopEndSec = Math.max(loopStartSec + 0.02, Number(plan.loopEndSec) || (loopStartSec + 0.25));
          const sourceOffsetSec = Math.max(loopStartSec, Math.min(loopEndSec - 0.005, Number(plan.sourceOffsetSec) || loopStartSec));
          const playbackRate = Math.max(0.03125, Math.min(8, Number(plan.playbackRate) || 1));
          const targetGain = Math.max(0, Math.min(0.28, Number(plan.gain) || 0.035));
          const previous = this.stableLane;
          const offsetJumpSec = previous ? Math.abs((previous.sourceOffsetSec || 0) - sourceOffsetSec) : 0;
          const bufferChanged = previous ? (previous.entryId !== entryId || previous.bufferGeneration !== bufferGeneration) : false;
          const shouldCrossfade = Boolean(previous && (bufferChanged || offsetJumpSec > 0.018));
          if (previous && Math.abs((previous.targetPlaybackRate || previous.playbackRate || 1) - playbackRate) > 0.0005) this.stableLaneRetuneCount += 1;
          if (shouldCrossfade) {
            this.previousStableLane = {
              ...previous,
              fadeFramesRemaining: this.stableLaneFadeFrames,
              fadeFramesTotal: this.stableLaneFadeFrames,
              fadeOutGain: this.stableLaneGain,
            };
            this.stableLaneGain = 0;
          }
          this.stableLanePlaybackRate = previous
            ? previous.playbackRate + (playbackRate - previous.playbackRate) * 0.35
            : playbackRate;
          this.stableLane = {
            entryId,
            bufferGeneration,
            bridgeSessionId,
            processorGeneration,
            anchorTimeSec: Number(data.audioNowSec) || currentTime,
            sourceOffsetSec,
            loopStartSec,
            loopEndSec,
            playbackRate: this.stableLanePlaybackRate,
            targetPlaybackRate: playbackRate,
            targetGain,
            lastPlanWorkletTimeSec: currentTime,
            planSequence,
            fadeInFramesRemaining: shouldCrossfade ? this.stableLaneFadeFrames : 0,
            fadeInFramesTotal: this.stableLaneFadeFrames,
          };
          this.stableLaneActive = true;
          this.stableLanePlanCount += 1;
          this.stableLanePlanAckCount += 1;
          if (isSyntheticSilentProbe) {
            this.stableLaneSyntheticSilentProbeAckCount += 1;
            this.stableLaneSyntheticSilentProbeLastResult = 'ack-ok';
          }
          this.stableLaneLastRejectedReason = null;
        } else {
          this.stableLanePlanRejectCount += 1;
          if (rejectedReason === 'stale-plan-sequence') this.stableLanePlanTransportDroppedStaleCount += 1;
          if (isSyntheticSilentProbe) this.stableLaneSyntheticSilentProbeLastResult = rejectedReason;
          this.stableLaneLastRejectedReason = rejectedReason;
        }
        this.port.postMessage({
          type: 'root-follow-worklet-stable-lane-ack',
          messageCount: this.stableLaneMessageCount,
          bridgeSessionId,
          processorGeneration,
          entryId,
          bufferGeneration,
          planSequence,
          ok,
          active: ok,
          bufferAvailable: Boolean(buffer),
          rejectedReason: ok ? null : rejectedReason,
          stableLaneLastAcceptedPlanSequence: this.stableLaneLastAcceptedPlanSequence,
          stableLanePlanTransportAcceptedCount: this.stableLanePlanTransportAcceptedCount,
          stableLanePlanTransportDroppedStaleCount: this.stableLanePlanTransportDroppedStaleCount,
          probeKind: isSyntheticSilentProbe ? 'stable-lane-synthetic-silent-plan' : null,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-direct-pilot-events') {
        this.directPilotMessageCount += 1;
        this.directPilotActive = data.active === true;
        const incoming = Array.isArray(data.events) ? data.events : [];
        const safeNow = Number(data.audioNowSec) || currentTime;
        const maxEnd = safeNow + 2.5;
        const kept = [];
        for (let index = 0; index < incoming.length && kept.length < 64; index += 1) {
          const raw = incoming[index] || {};
          const startSec = Math.max(safeNow - 0.02, Math.min(Number(raw.startSec) || safeNow, maxEnd));
          const endSec = Math.max(startSec + 0.018, Math.min(Number(raw.endSec) || (startSec + 0.12), maxEnd));
          const frequencyHz = Math.max(20, Math.min(12000, Number(raw.frequencyHz) || 220));
          const gain = Math.max(0, Math.min(0.18, Number(raw.gain) || 0.035));
          kept.push({
            id: String(raw.id || ('pilot-' + this.directPilotMessageCount + '-' + index)),
            startSec,
            endSec,
            frequencyHz,
            gain,
          });
        }
        this.compactAndAppendBoundedEvents(this.events, kept, currentTime - 0.05, 128);
        this.port.postMessage({
          type: 'root-follow-worklet-direct-pilot-ack',
          messageCount: this.directPilotMessageCount,
          acceptedEventCount: kept.length,
          active: this.directPilotActive,
        });
      }
    };
    this.port.postMessage({ type: 'root-follow-worklet-shadow-ready' });
  }

  compactAndAppendBoundedEvents(queue, incoming, minEndSec, maxLength) {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < queue.length; readIndex += 1) {
      const item = queue[readIndex];
      if (item && item.endSec > minEndSec) {
        if (writeIndex !== readIndex) queue[writeIndex] = item;
        writeIndex += 1;
      }
    }
    const overflow = Math.max(0, writeIndex + incoming.length - maxLength);
    if (overflow > 0) {
      for (let readIndex = overflow; readIndex < writeIndex; readIndex += 1) {
        queue[readIndex - overflow] = queue[readIndex];
      }
      writeIndex -= overflow;
    }
    for (let index = 0; index < incoming.length && writeIndex < maxLength; index += 1) {
      queue[writeIndex] = incoming[index];
      writeIndex += 1;
    }
    queue.length = writeIndex;
    return writeIndex;
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) {
      this.processQuantumCount += 1;
      return true;
    }
    const left = output[0];
    const right = output[1] || null;
    this.processQuantumCount += 1;
    this.renderedFrameCount += left.length;
    this.renderedSampleCount += left.length * (right ? 2 : 1);
    left.fill(0);
    if (right) right.fill(0);
    const hasDirectEvents = this.directPilotActive && this.events.length > 0;
    const hasGranularEvents = this.granularPilotActive && this.granularEvents.length > 0;
    const hasStableLane = this.stableLaneActive && this.stableLane !== null;
    const hasPreviousStableLane = this.previousStableLane !== null;
    let directFramesThisQuantum = 0;
    let granularFramesThisQuantum = 0;
    const reportThroughput = () => {
      // Stable Lane is a resident renderer; it should not create an 80 ms
      // diagnostic message clock merely because audio is healthy. 180 ms is
      // still well inside the 450/900 ms liveness windows used by the host.
      const minInterval = (hasStableLane || hasPreviousStableLane)
        ? 0.18
        : (hasDirectEvents || hasGranularEvents)
          ? 0.08
          : 0.28;
      if (currentTime - this.lastThroughputReportAtWorkletTimeSec < minInterval) return;
      this.lastThroughputReportAtWorkletTimeSec = currentTime;
      this.port.postMessage({
        type: 'root-follow-worklet-throughput-meter',
        processorAlive: true,
        processorReady: true,
        processQuantumCount: this.processQuantumCount,
        renderedFrameCount: this.renderedFrameCount,
        renderedSampleCount: this.renderedSampleCount,
        activeRenderQuantumCount: this.activeRenderQuantumCount,
        directRenderedFrameCount: this.directRenderedFrameCount,
        granularRenderedFrameCount: this.granularRenderedFrameCount,
        stableLaneRenderedFrameCount: this.stableLaneRenderedFrameCount,
        stableLaneActiveRenderQuantumCount: this.stableLaneActiveRenderQuantumCount,
        processHotPathCompactionCount: this.processHotPathCompactionCount,
        processHotPathDroppedDirectCount: this.processHotPathDroppedDirectCount,
        processHotPathDroppedGranularCount: this.processHotPathDroppedGranularCount,
        processHotPathRetainedDirectCount: this.processHotPathRetainedDirectCount,
        processHotPathRetainedGranularCount: this.processHotPathRetainedGranularCount,
        stableLaneHoldQuantumCount: this.stableLaneHoldQuantumCount,
        stableLaneCrossfadeFrameCount: this.stableLaneCrossfadeFrameCount,
        stableLaneGainRampFrameCount: this.stableLaneGainRampFrameCount,
        stableLanePlanCount: this.stableLanePlanCount,
        stableLaneRetuneCount: this.stableLaneRetuneCount,
        stableLaneSeamGuardFrameCount: this.stableLaneSeamGuardFrameCount,
        stableLaneBufferAckCount: this.stableLaneBufferAckCount,
        stableLaneBufferRejectCount: this.stableLaneBufferRejectCount,
        stableLanePlanAckCount: this.stableLanePlanAckCount,
        stableLanePlanRejectCount: this.stableLanePlanRejectCount,
        stableLaneLastAcceptedPlanSequence: this.stableLaneLastAcceptedPlanSequence,
        stableLanePlanTransportAcceptedCount: this.stableLanePlanTransportAcceptedCount,
        stableLanePlanTransportDroppedStaleCount: this.stableLanePlanTransportDroppedStaleCount,
        stableLaneRejectedReason: this.stableLaneLastRejectedReason,
        stableLaneActive: this.stableLaneActive,
        bridgeSessionId: this.bridgeSessionId,
        processorGeneration: this.processorGeneration,
        directQueueLength: this.events.length,
        granularQueueLength: this.granularEvents.length,
        sampleBufferCount: this.sampleBuffers.size,
        workletTimeSec: currentTime,
      });
    };
    if (!hasDirectEvents && !hasGranularEvents && !hasStableLane && !hasPreviousStableLane) {
      reportThroughput();
      return true;
    }
    const twoPi = 6.283185307179586;
    if (hasStableLane || hasPreviousStableLane) {
      let stableFramesThisQuantum = 0;
      let stableCrossfadeFramesThisQuantum = 0;
      let stableGainRampFramesThisQuantum = 0;

      const previousLane = this.previousStableLane;
      const previousBuffer = previousLane
        ? (this.sampleBuffers.get(this.makeStableLaneBufferKey(previousLane.entryId, previousLane.bufferGeneration)) || this.sampleBuffers.get(previousLane.entryId))
        : null;
      if (previousLane && previousBuffer && previousBuffer.channels && previousBuffer.channels.length > 0 && previousLane.fadeFramesRemaining > 0) {
        const leftData = previousBuffer.channels[0];
        const rightData = previousBuffer.channels[1] || leftData;
        const loopStartFrame = Math.max(0, Math.floor(previousLane.loopStartSec * previousBuffer.sampleRate) - previousBuffer.transferStartFrame);
        const loopEndFrame = Math.max(loopStartFrame + 2, Math.min(leftData.length - 1, Math.floor(previousLane.loopEndSec * previousBuffer.sampleRate) - previousBuffer.transferStartFrame));
        const loopFrameCount = Math.max(2, loopEndFrame - loopStartFrame);
        for (let i = 0; i < left.length && previousLane.fadeFramesRemaining > 0; i += 1) {
          const t = currentTime + i / sampleRate;
          const elapsed = Math.max(0, t - previousLane.anchorTimeSec);
          const rawSourceFrame = (previousLane.sourceOffsetSec * previousBuffer.sampleRate - previousBuffer.transferStartFrame) + elapsed * previousLane.playbackRate * previousBuffer.sampleRate;
          const loopLocalFrame = (((rawSourceFrame - loopStartFrame) % loopFrameCount) + loopFrameCount) % loopFrameCount;
          const wrappedFrame = loopStartFrame + loopLocalFrame;
          if (wrappedFrame < 0 || wrappedFrame >= leftData.length - 1) continue;
          const idx = Math.floor(wrappedFrame);
          const frac = wrappedFrame - idx;
          const fade = Math.max(0, Math.min(1, previousLane.fadeFramesRemaining / Math.max(1, previousLane.fadeFramesTotal)));
          const gain = previousLane.fadeOutGain * fade;
          let lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
          let rv = rightData[idx] * (1 - frac) + rightData[idx + 1] * frac;
          const seamFadeFrames = Math.min(this.stableLaneSeamFadeFrames, Math.max(2, Math.floor(loopFrameCount * 0.25)));
          if (seamFadeFrames > 2 && loopLocalFrame >= loopFrameCount - seamFadeFrames) {
            const seamPos = loopLocalFrame - (loopFrameCount - seamFadeFrames);
            const seamMix = Math.max(0, Math.min(1, seamPos / Math.max(1, seamFadeFrames)));
            const headFrame = loopStartFrame + seamPos;
            if (headFrame >= 0 && headFrame < leftData.length - 1) {
              const headIdx = Math.floor(headFrame);
              const headFrac = headFrame - headIdx;
              const headLv = leftData[headIdx] * (1 - headFrac) + leftData[headIdx + 1] * headFrac;
              const headRv = rightData[headIdx] * (1 - headFrac) + rightData[headIdx + 1] * headFrac;
              lv = lv * (1 - seamMix) + headLv * seamMix;
              rv = rv * (1 - seamMix) + headRv * seamMix;
              this.stableLaneSeamGuardFrameCount += 1;
            }
          }
          left[i] += lv * gain;
          if (right) right[i] += rv * gain;
          previousLane.fadeFramesRemaining -= 1;
          stableCrossfadeFramesThisQuantum += 1;
        }
        if (previousLane.fadeFramesRemaining <= 0) this.previousStableLane = null;
      } else if (previousLane && previousLane.fadeFramesRemaining <= 0) {
        this.previousStableLane = null;
      }

      const lane = this.stableLane;
      const buffer = lane ? (this.sampleBuffers.get(this.makeStableLaneBufferKey(lane.entryId, lane.bufferGeneration)) || this.sampleBuffers.get(lane.entryId)) : null;
      if (lane && buffer && buffer.channels && buffer.channels.length > 0) {
        const leftData = buffer.channels[0];
        const rightData = buffer.channels[1] || leftData;
        const loopStartFrame = Math.max(0, Math.floor(lane.loopStartSec * buffer.sampleRate) - buffer.transferStartFrame);
        const loopEndFrame = Math.max(loopStartFrame + 2, Math.min(leftData.length - 1, Math.floor(lane.loopEndSec * buffer.sampleRate) - buffer.transferStartFrame));
        const loopFrameCount = Math.max(2, loopEndFrame - loopStartFrame);
        lane.playbackRate += (lane.targetPlaybackRate - lane.playbackRate) * 0.018;
        for (let i = 0; i < left.length; i += 1) {
          const t = currentTime + i / sampleRate;
          const elapsed = Math.max(0, t - lane.anchorTimeSec);
          const rawSourceFrame = (lane.sourceOffsetSec * buffer.sampleRate - buffer.transferStartFrame) + elapsed * lane.playbackRate * buffer.sampleRate;
          const loopLocalFrame = (((rawSourceFrame - loopStartFrame) % loopFrameCount) + loopFrameCount) % loopFrameCount;
          const wrappedFrame = loopStartFrame + loopLocalFrame;
          if (wrappedFrame < 0 || wrappedFrame >= leftData.length - 1) continue;
          const idx = Math.floor(wrappedFrame);
          const frac = wrappedFrame - idx;
          const fadeIn = lane.fadeInFramesRemaining > 0
            ? Math.max(0, Math.min(1, 1 - lane.fadeInFramesRemaining / Math.max(1, lane.fadeInFramesTotal)))
            : 1;
          const targetGain = lane.targetGain * fadeIn;
          const beforeGain = this.stableLaneGain;
          this.stableLaneGain += (targetGain - this.stableLaneGain) * 0.0065;
          if (Math.abs(this.stableLaneGain - beforeGain) > 0.000001) stableGainRampFramesThisQuantum += 1;
          if (lane.fadeInFramesRemaining > 0) lane.fadeInFramesRemaining -= 1;
          let lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
          let rv = rightData[idx] * (1 - frac) + rightData[idx + 1] * frac;
          const seamFadeFrames = Math.min(this.stableLaneSeamFadeFrames, Math.max(2, Math.floor(loopFrameCount * 0.25)));
          if (seamFadeFrames > 2 && loopLocalFrame >= loopFrameCount - seamFadeFrames) {
            const seamPos = loopLocalFrame - (loopFrameCount - seamFadeFrames);
            const seamMix = Math.max(0, Math.min(1, seamPos / Math.max(1, seamFadeFrames)));
            const headFrame = loopStartFrame + seamPos;
            if (headFrame >= 0 && headFrame < leftData.length - 1) {
              const headIdx = Math.floor(headFrame);
              const headFrac = headFrame - headIdx;
              const headLv = leftData[headIdx] * (1 - headFrac) + leftData[headIdx + 1] * headFrac;
              const headRv = rightData[headIdx] * (1 - headFrac) + rightData[headIdx + 1] * headFrac;
              lv = lv * (1 - seamMix) + headLv * seamMix;
              rv = rv * (1 - seamMix) + headRv * seamMix;
              this.stableLaneSeamGuardFrameCount += 1;
            }
          }
          const outGain = this.stableLaneGain;
          left[i] += lv * outGain;
          if (right) right[i] += rv * outGain;
          stableFramesThisQuantum += 1;
        }
        if (stableFramesThisQuantum > 0) {
          this.activeRenderQuantumCount += 1;
          this.stableLaneActiveRenderQuantumCount += 1;
          this.stableLaneRenderedFrameCount += stableFramesThisQuantum;
          if (currentTime - lane.lastPlanWorkletTimeSec > 0.18) this.stableLaneHoldQuantumCount += 1;
        }
      } else if (lane) {
        this.stableLaneActive = false;
        this.stableLane = null;
      }
      if (stableCrossfadeFramesThisQuantum > 0) this.stableLaneCrossfadeFrameCount += stableCrossfadeFramesThisQuantum;
      if (stableGainRampFramesThisQuantum > 0) this.stableLaneGainRampFrameCount += stableGainRampFramesThisQuantum;
      if (stableFramesThisQuantum === 0 && stableCrossfadeFramesThisQuantum > 0) this.activeRenderQuantumCount += 1;
    }
    if (hasGranularEvents) {
      let granularWriteIndex = 0;
      let granularDroppedThisQuantum = 0;
      const granularQueueLength = this.granularEvents.length;
      for (let eventIndex = 0; eventIndex < granularQueueLength; eventIndex += 1) {
        const item = this.granularEvents[eventIndex];
        const buffer = item ? this.sampleBuffers.get(item.entryId) : null;
        let used = false;
        if (buffer && buffer.channels && buffer.channels.length > 0) {
          const duration = Math.max(0.012, item.endSec - item.startSec);
          const leftData = buffer.channels[0];
          const rightData = buffer.channels[1] || leftData;
          for (let i = 0; i < left.length; i += 1) {
            const t = currentTime + i / sampleRate;
            if (t < item.startSec || t > item.endSec) continue;
            const elapsed = Math.max(0, t - item.startSec);
            const sourceFrame = (item.sourceOffsetSec + elapsed * item.playbackRate) * buffer.sampleRate - buffer.transferStartFrame;
            if (sourceFrame < 0 || sourceFrame >= leftData.length - 1) continue;
            const idx = Math.floor(sourceFrame);
            const frac = sourceFrame - idx;
            const lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
            const rv = rightData[idx] * (1 - frac) + rightData[idx + 1] * frac;
            const pos = Math.max(0, Math.min(1, elapsed / duration));
            const attack = Math.min(1, pos / 0.12);
            const release = Math.min(1, (1 - pos) / 0.24);
            const env = Math.max(0, Math.min(attack, release));
            left[i] += lv * item.gain * env;
            if (right) right[i] += rv * item.gain * env;
            used = true;
            granularFramesThisQuantum += 1;
          }
        }
        if (item && item.endSec > currentTime && (used || item.startSec > currentTime)) {
          if (granularWriteIndex !== eventIndex) this.granularEvents[granularWriteIndex] = item;
          granularWriteIndex += 1;
        } else {
          granularDroppedThisQuantum += 1;
        }
      }
      if (granularWriteIndex < granularQueueLength) this.granularEvents.length = granularWriteIndex;
      this.processHotPathRetainedGranularCount = granularWriteIndex;
      if (granularDroppedThisQuantum > 0) {
        this.processHotPathCompactionCount += 1;
        this.processHotPathDroppedGranularCount += granularDroppedThisQuantum;
      }
    }
    if (!hasDirectEvents) {
      if (granularFramesThisQuantum > 0) {
        this.activeRenderQuantumCount += 1;
        this.granularRenderedFrameCount += granularFramesThisQuantum;
      }
      reportThroughput();
      return true;
    }
    let directWriteIndex = 0;
    let directDroppedThisQuantum = 0;
    const directQueueLength = this.events.length;
    for (let eventIndex = 0; eventIndex < directQueueLength; eventIndex += 1) {
      const item = this.events[eventIndex];
      if (!item) continue;
      const duration = Math.max(0.018, item.endSec - item.startSec);
      let phase = this.phaseById.get(item.id) || 0;
      let used = false;
      for (let i = 0; i < left.length; i += 1) {
        const t = currentTime + i / sampleRate;
        if (t < item.startSec || t > item.endSec) continue;
        const pos = Math.max(0, Math.min(1, (t - item.startSec) / duration));
        const attack = Math.min(1, pos / 0.08);
        const release = Math.min(1, (1 - pos) / 0.18);
        const env = Math.max(0, Math.min(attack, release));
        const value = Math.sin(phase) * item.gain * env;
        phase += twoPi * item.frequencyHz / sampleRate;
        if (phase > twoPi) phase -= twoPi;
        left[i] += value;
        if (right) right[i] += value;
        used = true;
        directFramesThisQuantum += 1;
      }
      this.phaseById.set(item.id, phase);
      if (item.endSec > currentTime && (used || item.startSec > currentTime)) {
        if (directWriteIndex !== eventIndex) this.events[directWriteIndex] = item;
        directWriteIndex += 1;
      } else {
        this.phaseById.delete(item.id);
        directDroppedThisQuantum += 1;
      }
    }
    if (directWriteIndex < directQueueLength) this.events.length = directWriteIndex;
    this.processHotPathRetainedDirectCount = directWriteIndex;
    if (directDroppedThisQuantum > 0) {
      this.processHotPathCompactionCount += 1;
      this.processHotPathDroppedDirectCount += directDroppedThisQuantum;
    }
    if (directFramesThisQuantum > 0 || granularFramesThisQuantum > 0) {
      this.activeRenderQuantumCount += 1;
      this.directRenderedFrameCount += directFramesThisQuantum;
      this.granularRenderedFrameCount += granularFramesThisQuantum;
    }
    reportThroughput();
    return true;
  }
}

registerProcessor('${iL}', XensonarRootFollowWorkletShadowBridge);
