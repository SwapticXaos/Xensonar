const y1e="triangle",S1e=.004,v1e=.2,A1e=.032,x1e=.72,M1e=.045,w1e=.24,R1e=1.15,C1e=.09,k1e=.42,P1e=.96,I1e=1.08,mL="xensonar-wave-starter-shadow-pilot",NW=.012,E1e=-38.4,zI=1,OW=96,_W=128,Uw=32,Kw=16,F1e=160,nS=8,T1e=`
class XensonarWaveStarterShadowPilot extends AudioWorkletProcessor {
  constructor() {
    super();
    this.messageCount = 0;
    this.readyMessageCount = 0;
    this.postedIntentCount = 0;
    this.ackedIntentCount = 0;
    this.rejectedIntentCount = 0;
    this.processQuantumCount = 0;
    this.renderedFrameCount = 0;
    this.activeRenderQuantumCount = 0;
    this.lastAcceptedSequence = 0;
    this.pendingIntentCount = 0;
    this.latestIntentReplacedCount = 0;
    this.activeFramesRemaining = 0;
    this.shapeFramesRemaining = 0;
    this.shapeFrameCount = 0;
    this.shapeQuantumCount = 0;
    this.shapeCompletedCount = 0;
    this.shapePeakAbs = 0;
    this.shapeLastFrequencyHz = 0;
    this.shapePhase = 0;
    this.shapePhaseStep = 0;
    this.shapeEnvelopeFrames = 384;
    this.shapeEnvelopeCursor = 0;
    this.shapeLastWorkletFrame = 0;
    this.parallelPilotEnabled = true;
    this.parallelPilotGain = ${NW};
    this.parallelPilotRequiredCompletedShapes = ${zI};
    this.parallelPilotMutedFrameCount = 0;
    this.parallelPilotRenderFrameCount = 0;
    this.parallelPilotQuantumCount = 0;
    this.parallelPilotPeakAbs = 0;
    this.parallelPilotLastWorkletFrame = 0;
    this.parallelPilotAutoMuteReason = 'shape-proof-required';
    this.parallelPilotRampAttackFrames = ${OW};
    this.parallelPilotRampReleaseFrames = ${_W};
    this.parallelPilotRampFrameCount = 0;
    this.parallelPilotRampQuantumCount = 0;
    this.parallelPilotRampPeakGain = 0;
    this.parallelPilotRampLastWorkletFrame = 0;
    this.voiceSpecMirrorAcceptedCount = 0;
    this.voiceSpecMirrorRejectedCount = 0;
    this.lastVoiceSpecKind = null;
    this.lastVoiceSpecId = null;
    this.lastVoiceSpecExactnessLevel = null;
    this.synthFailoverVoices = [];
    this.synthFailoverFreeVoices = [];
    this.synthFailoverMaxVoices = ${Uw};
    this.synthFailoverLastQueuedVoiceCount = 0;
    this.synthFailoverVoicePoolAllocatedCount = 0;
    this.synthFailoverVoicePoolReusedCount = 0;
    this.synthFailoverVoicePoolRecycledCount = 0;
    this.synthFailoverVoicePoolDisplacedCount = 0;
    this.synthFailoverVoicePoolPriorityDisplacedCount = 0;
    this.synthFailoverVoicePoolLastDisplacedScore = null;
    this.synthFailoverStealFadeTails = [];
    this.synthFailoverStealFadeTailQueuedCount = 0;
    this.synthFailoverStealFadeTailDroppedCount = 0;
    this.synthFailoverStealFadeTailRenderFrameCount = 0;
    this.stealFadeTailFrames = ${F1e};
    this.stealFadeMaxTails = ${nS};
    this.synthFailoverCandidateAcceptedCount = 0;
    this.synthFailoverCandidateRejectedCount = 0;
    this.synthFailoverRenderFrameCount = 0;
    this.synthFailoverRenderQuantumCount = 0;
    this.synthFailoverPeakAbs = 0;
    this.synthFailoverLastWorkletFrame = 0;
    this.synthFailoverLastSpecId = null;
    this.synthFailoverLastRejectReason = null;
    this.synthFailoverCandidateGainScale = 0;
    this.sampleBufferTokenShadows = new Map();
    this.sampleBufferTokenShadowAcceptedCount = 0;
    this.sampleBufferTokenShadowRejectedCount = 0;
    this.sampleBufferTokenHydratedCount = 0;
    this.sampleBufferLastToken = null;
    this.sampleBufferLastRejectReason = null;
    this.sampleBufferLastFrameCount = 0;
    this.sampleBufferLastChannelCount = 0;
    this.sampleFailoverVoices = [];
    this.sampleFailoverFreeVoices = [];
    this.sampleFailoverMaxVoices = ${Kw};
    this.sampleFailoverVoicePoolAllocatedCount = 0;
    this.sampleFailoverVoicePoolReusedCount = 0;
    this.sampleFailoverVoicePoolRecycledCount = 0;
    this.sampleFailoverVoicePoolDisplacedCount = 0;
    this.sampleFailoverVoicePoolPriorityDisplacedCount = 0;
    this.sampleFailoverVoicePoolLastDisplacedScore = null;
    this.sampleFailoverStealFadeTails = [];
    this.sampleFailoverStealFadeTailQueuedCount = 0;
    this.sampleFailoverStealFadeTailDroppedCount = 0;
    this.sampleFailoverStealFadeTailRenderFrameCount = 0;
    this.sampleFailoverCandidateAcceptedCount = 0;
    this.sampleFailoverCandidateRejectedCount = 0;
    this.sampleFailoverRenderFrameCount = 0;
    this.sampleFailoverRenderQuantumCount = 0;
    this.sampleFailoverPeakAbs = 0;
    this.sampleFailoverLastWorkletFrame = 0;
    this.sampleFailoverLastQueuedVoiceCount = 0;
    this.sampleFailoverLastSpecId = null;
    this.sampleFailoverLastToken = null;
    this.sampleFailoverLastRejectReason = null;
    this.processorRuntimeSynthVoicePostedCount = 0;
    this.processorRuntimeSampleVoicePostedCount = 0;
    this.processorRuntimeSynthVoiceAcceptedCount = 0;
    this.processorRuntimeSampleVoiceAcceptedCount = 0;
    this.processorRuntimeSynthVoiceRejectedCount = 0;
    this.processorRuntimeSampleVoiceRejectedCount = 0;
    this.processorRuntimeSegmentClockPulseAcceptedCount = 0;
    this.processorRuntimeApostropheSafeExtendAcceptedCount = 0;
    this.processorRuntimeRenderFrameCount = 0;
    this.processorRuntimeLastSourceIntent = null;
    this.processorRuntimeLastLane = null;
    this.processorRuntimeLastExtendPolicy = null;
    this.processorRuntimeLastVoiceSpecId = null;
    this.processorRuntimeLastRejectReason = null;
    this.processorRuntimeActiveSynthVoices = 0;
    this.processorRuntimeActiveSampleVoices = 0;
    this.processorRuntimeQueuePressureApprox = 0;
    this.processorRuntimePressureState = 'clear';
    this.processorRuntimeStolenVoiceCount = 0;
    this.processorRuntimeStealFadeTailPressure = 0;
    this.processorOwnedHoldGestures = new Map();
    this.processorOwnedHoldGestureStartPostedCount = 0;
    this.processorOwnedHoldGestureUpdatePostedCount = 0;
    this.processorOwnedHoldGestureReleasePostedCount = 0;
    this.processorOwnedHoldGestureStartAcceptedCount = 0;
    this.processorOwnedHoldGestureUpdateAcceptedCount = 0;
    this.processorOwnedHoldGestureReleaseAcceptedCount = 0;
    this.processorOwnedHoldGestureRejectedCount = 0;
    this.processorOwnedHoldGestureActiveCount = 0;
    this.processorOwnedHoldSegmentPulseCount = 0;
    this.processorOwnedHoldSynthVoiceCreatedCount = 0;
    this.processorOwnedHoldLastGestureId = null;
    this.processorOwnedHoldLastLane = null;
    this.processorOwnedHoldLastSegmentsPerBar = null;
    this.processorOwnedHoldLastPitchHz = null;
    this.processorOwnedHoldLastRejectReason = null;
    this.lastRejectedReason = null;
    this.latestIntent = null;
    this.port.onmessage = (event) => {
      const message = event.data || {};
      this.messageCount += 1;
      if (message.type === 'wave-starter-shadow-intent') {
        const sequence = Number(message.sequence) || 0;
        const frequencyHz = Number(message.frequencyHz) || 0;
        if (sequence <= this.lastAcceptedSequence) {
          this.rejectedIntentCount += 1;
          this.lastRejectedReason = 'stale-intent-sequence';
          this.port.postMessage({
            type: 'wave-starter-shadow-intent-rejected',
            sequence,
            reason: this.lastRejectedReason,
            rejectedIntentCount: this.rejectedIntentCount,
          });
          return;
        }
        if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
          this.rejectedIntentCount += 1;
          this.lastRejectedReason = 'invalid-frequency';
          this.port.postMessage({
            type: 'wave-starter-shadow-intent-rejected',
            sequence,
            reason: this.lastRejectedReason,
            rejectedIntentCount: this.rejectedIntentCount,
          });
          return;
        }
        if (this.latestIntent) this.latestIntentReplacedCount += 1;
        this.latestIntent = {
          sequence,
          frequencyHz,
          isSector: message.isSector === true,
          requestedAtMs: Number(message.requestedAtMs) || 0,
        };
        this.lastAcceptedSequence = sequence;
        this.postedIntentCount += 1;
        this.ackedIntentCount += 1;
        this.pendingIntentCount = 1;
        this.activeFramesRemaining = Math.max(this.activeFramesRemaining, 256);
        this.shapeFramesRemaining = Math.max(this.shapeFramesRemaining, this.shapeEnvelopeFrames);
        this.shapeEnvelopeCursor = 0;
        this.shapeLastFrequencyHz = frequencyHz;
        this.shapePhaseStep = (Math.PI * 2 * Math.max(20, Math.min(12000, frequencyHz))) / sampleRate;
        this.lastRejectedReason = null;
        this.port.postMessage({
          type: 'wave-starter-shadow-intent-ack',
          sequence,
          acceptedIntentCount: this.ackedIntentCount,
          latestIntentReplacedCount: this.latestIntentReplacedCount,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-voice-spec-shadow') {
        const sequence = Number(message.sequence) || 0;
        const kind = message.voiceSpecKind === 'sample' ? 'sample' : message.voiceSpecKind === 'synth' ? 'synth' : null;
        if (!kind) {
          this.voiceSpecMirrorRejectedCount += 1;
          this.port.postMessage({
            type: 'wave-starter-voice-spec-shadow-rejected',
            sequence,
            reason: 'invalid-voice-spec-kind',
            voiceSpecMirrorRejectedCount: this.voiceSpecMirrorRejectedCount,
          });
          return;
        }
        this.voiceSpecMirrorAcceptedCount += 1;
        this.lastVoiceSpecKind = kind;
        this.lastVoiceSpecId = typeof message.voiceSpecId === 'string' ? message.voiceSpecId : null;
        this.lastVoiceSpecExactnessLevel = typeof message.exactnessLevel === 'string' ? message.exactnessLevel : null;
        this.port.postMessage({
          type: 'wave-starter-voice-spec-shadow-ack',
          sequence,
          voiceSpecMirrorAcceptedCount: this.voiceSpecMirrorAcceptedCount,
          lastVoiceSpecKind: this.lastVoiceSpecKind,
          lastVoiceSpecId: this.lastVoiceSpecId,
          lastVoiceSpecExactnessLevel: this.lastVoiceSpecExactnessLevel,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-synth-failover-candidate' || message.type === 'wave-starter-synth-processor-runtime-voice') {
        const sequence = Number(message.sequence) || 0;
        const candidate = message.candidate || {};
        const processorRuntimeMessage = message.type === 'wave-starter-synth-processor-runtime-voice';
        if (processorRuntimeMessage) this.processorRuntimeSynthVoicePostedCount += 1;
        const voiceSpecId = typeof candidate.voiceSpecId === 'string' ? candidate.voiceSpecId : null;
        const tonePlans = Array.isArray(candidate.tonePlans) ? candidate.tonePlans : [];
        if (!voiceSpecId || candidate.candidateKind !== 'wave-starter-synth-failover-candidate') {
          this.synthFailoverCandidateRejectedCount += 1;
          this.synthFailoverLastRejectReason = 'invalid-synth-failover-candidate';
          this.markProcessorRuntimeRejected(message, 'synth', this.synthFailoverLastRejectReason, voiceSpecId);
          this.port.postMessage({
            type: 'wave-starter-synth-failover-candidate-rejected',
            sequence,
            reason: this.synthFailoverLastRejectReason,
            synthFailoverCandidateRejectedCount: this.synthFailoverCandidateRejectedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        if (tonePlans.length <= 0) {
          this.synthFailoverCandidateRejectedCount += 1;
          this.synthFailoverLastRejectReason = 'empty-synth-failover-tone-plan';
          this.markProcessorRuntimeRejected(message, 'synth', this.synthFailoverLastRejectReason, voiceSpecId);
          this.port.postMessage({
            type: 'wave-starter-synth-failover-candidate-rejected',
            sequence,
            reason: this.synthFailoverLastRejectReason,
            synthFailoverCandidateRejectedCount: this.synthFailoverCandidateRejectedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        const baseFrame = typeof currentFrame === 'number' ? currentFrame : 0;
        const boundedTones = tonePlans.slice(0, 10);
        for (let i = 0; i < boundedTones.length; i += 1) {
          const voice = this.createSynthFailoverVoice(boundedTones[i], baseFrame);
          if (voice && processorRuntimeMessage) voice.processorRuntimeOwned = true;
          if (voice) this.enqueueSynthFailoverVoice(voice);
        }
        this.synthFailoverCandidateAcceptedCount += 1;
        this.markProcessorRuntimeOwnership(message, 'synth', voiceSpecId);
        this.synthFailoverLastSpecId = voiceSpecId;
        this.synthFailoverLastRejectReason = null;
        this.synthFailoverCandidateGainScale = Number(candidate.candidateGainScale) || 1;
        this.port.postMessage({
          type: 'wave-starter-synth-failover-candidate-ack',
          sequence,
          synthFailoverCandidateAcceptedCount: this.synthFailoverCandidateAcceptedCount,
          synthFailoverLastSpecId: this.synthFailoverLastSpecId,
          synthFailoverCandidateGainScale: this.synthFailoverCandidateGainScale,
          queuedToneCount: boundedTones.length,
          synthFailoverLastQueuedVoiceCount: this.synthFailoverLastQueuedVoiceCount,
          synthFailoverVoicePoolDisplacedCount: this.synthFailoverVoicePoolDisplacedCount,
          synthFailoverVoicePoolPriorityDisplacedCount: this.synthFailoverVoicePoolPriorityDisplacedCount,
          synthFailoverVoicePoolLastDisplacedScore: this.synthFailoverVoicePoolLastDisplacedScore,
          synthFailoverStealFadeTailQueuedCount: this.synthFailoverStealFadeTailQueuedCount,
          synthFailoverStealFadeTailDroppedCount: this.synthFailoverStealFadeTailDroppedCount,
          processorRuntimeSynthVoiceAcceptedCount: this.processorRuntimeSynthVoiceAcceptedCount,
          processorRuntimeSegmentClockPulseAcceptedCount: this.processorRuntimeSegmentClockPulseAcceptedCount,
          processorRuntimeApostropheSafeExtendAcceptedCount: this.processorRuntimeApostropheSafeExtendAcceptedCount,
          processorRuntimeLastSourceIntent: this.processorRuntimeLastSourceIntent,
          processorRuntimeLastLane: this.processorRuntimeLastLane,
          processorRuntimeLastExtendPolicy: this.processorRuntimeLastExtendPolicy,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-sample-buffer-token-shadow') {
        const sequence = Number(message.sequence) || 0;
        const descriptor = message.descriptor || {};
        const token = typeof descriptor.bufferToken === 'string' ? descriptor.bufferToken : null;
        const channelData = Array.isArray(message.channelData) ? message.channelData : [];
        const copiedFrameCount = Number(descriptor.copiedFrameCount) || 0;
        const copiedChannelCount = Number(descriptor.copiedChannelCount) || channelData.length;
        if (!token || descriptor.shadowKind !== 'wave-starter-sample-buffer-token-shadow') {
          this.sampleBufferTokenShadowRejectedCount += 1;
          this.sampleBufferLastRejectReason = 'invalid-sample-buffer-token-shadow';
          this.port.postMessage({
            type: 'wave-starter-sample-buffer-token-shadow-rejected',
            sequence,
            reason: this.sampleBufferLastRejectReason,
            sampleBufferTokenShadowRejectedCount: this.sampleBufferTokenShadowRejectedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        if (channelData.length <= 0 || copiedFrameCount <= 0) {
          this.sampleBufferTokenShadowRejectedCount += 1;
          this.sampleBufferLastRejectReason = 'missing-sample-channel-data';
          this.port.postMessage({
            type: 'wave-starter-sample-buffer-token-shadow-rejected',
            sequence,
            reason: this.sampleBufferLastRejectReason,
            sampleBufferTokenShadowRejectedCount: this.sampleBufferTokenShadowRejectedCount,
            sampleBufferLastToken: token,
            workletTimeSec: currentTime,
          });
          return;
        }
        this.sampleBufferTokenShadows.set(token, {
          token,
          sampleId: typeof descriptor.sampleId === 'string' ? descriptor.sampleId : null,
          sampleRate: Number(descriptor.audioBufferSampleRate) || sampleRate,
          channelCount: copiedChannelCount,
          frameCount: copiedFrameCount,
          durationSec: Number(descriptor.copiedDurationSec) || 0,
          renderPilotOneShotEligible: true,
          renderPilotLoopDisabled: true,
          channelData,
        });
        this.sampleBufferTokenShadowAcceptedCount += 1;
        this.sampleBufferTokenHydratedCount = this.sampleBufferTokenShadows.size;
        this.sampleBufferLastToken = token;
        this.sampleBufferLastRejectReason = null;
        this.sampleBufferLastFrameCount = copiedFrameCount;
        this.sampleBufferLastChannelCount = copiedChannelCount;
        this.port.postMessage({
          type: 'wave-starter-sample-buffer-token-shadow-ack',
          sequence,
          sampleBufferTokenShadowAcceptedCount: this.sampleBufferTokenShadowAcceptedCount,
          sampleBufferTokenHydratedCount: this.sampleBufferTokenHydratedCount,
          sampleBufferLastToken: this.sampleBufferLastToken,
          sampleBufferLastFrameCount: this.sampleBufferLastFrameCount,
          sampleBufferLastChannelCount: this.sampleBufferLastChannelCount,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-sample-failover-candidate' || message.type === 'wave-starter-sample-processor-runtime-voice') {
        const sequence = Number(message.sequence) || 0;
        const candidate = message.candidate || {};
        const processorRuntimeMessage = message.type === 'wave-starter-sample-processor-runtime-voice';
        if (processorRuntimeMessage) this.processorRuntimeSampleVoicePostedCount += 1;
        const voiceSpecId = typeof candidate.voiceSpecId === 'string' ? candidate.voiceSpecId : null;
        const token = typeof candidate.bufferToken === 'string' ? candidate.bufferToken : null;
        if (!voiceSpecId || !token || candidate.candidateKind !== 'wave-starter-sample-failover-candidate') {
          this.sampleFailoverCandidateRejectedCount += 1;
          this.sampleFailoverLastRejectReason = 'invalid-sample-failover-candidate';
          this.markProcessorRuntimeRejected(message, 'sample', this.sampleFailoverLastRejectReason, voiceSpecId);
          this.sampleFailoverLastToken = token;
          this.port.postMessage({
            type: 'wave-starter-sample-failover-candidate-rejected',
            sequence,
            reason: this.sampleFailoverLastRejectReason,
            sampleFailoverCandidateRejectedCount: this.sampleFailoverCandidateRejectedCount,
            sampleFailoverLastToken: this.sampleFailoverLastToken,
            workletTimeSec: currentTime,
          });
          return;
        }
        const shadow = this.sampleBufferTokenShadows.get(token);
        if (!shadow) {
          this.sampleFailoverCandidateRejectedCount += 1;
          this.sampleFailoverLastRejectReason = 'missing-hydrated-sample-buffer-token';
          this.markProcessorRuntimeRejected(message, 'sample', this.sampleFailoverLastRejectReason, voiceSpecId);
          this.sampleFailoverLastSpecId = voiceSpecId;
          this.sampleFailoverLastToken = token;
          this.port.postMessage({
            type: 'wave-starter-sample-failover-candidate-rejected',
            sequence,
            reason: this.sampleFailoverLastRejectReason,
            sampleFailoverCandidateRejectedCount: this.sampleFailoverCandidateRejectedCount,
            sampleFailoverLastSpecId: this.sampleFailoverLastSpecId,
            sampleFailoverLastToken: this.sampleFailoverLastToken,
            sampleBufferTokenHydratedCount: this.sampleBufferTokenHydratedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        const voice = this.createSampleFailoverVoice(candidate, shadow, typeof currentFrame === 'number' ? currentFrame : 0);
        if (voice && processorRuntimeMessage) voice.processorRuntimeOwned = true;
        if (!voice) {
          this.sampleFailoverCandidateRejectedCount += 1;
          this.sampleFailoverLastRejectReason = 'invalid-sample-failover-render-voice';
          this.markProcessorRuntimeRejected(message, 'sample', this.sampleFailoverLastRejectReason, voiceSpecId);
          this.sampleFailoverLastSpecId = voiceSpecId;
          this.sampleFailoverLastToken = token;
          this.port.postMessage({
            type: 'wave-starter-sample-failover-candidate-rejected',
            sequence,
            reason: this.sampleFailoverLastRejectReason,
            sampleFailoverCandidateRejectedCount: this.sampleFailoverCandidateRejectedCount,
            sampleFailoverLastSpecId: this.sampleFailoverLastSpecId,
            sampleFailoverLastToken: this.sampleFailoverLastToken,
            sampleBufferTokenHydratedCount: this.sampleBufferTokenHydratedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        this.enqueueSampleFailoverVoice(voice);
        this.sampleFailoverCandidateAcceptedCount += 1;
        this.markProcessorRuntimeOwnership(message, 'sample', voiceSpecId);
        this.sampleFailoverLastSpecId = voiceSpecId;
        this.sampleFailoverLastToken = token;
        this.sampleFailoverLastRejectReason = null;
        this.port.postMessage({
          type: 'wave-starter-sample-failover-candidate-ack',
          sequence,
          sampleFailoverCandidateAcceptedCount: this.sampleFailoverCandidateAcceptedCount,
          sampleFailoverLastSpecId: this.sampleFailoverLastSpecId,
          sampleFailoverLastToken: this.sampleFailoverLastToken,
          sampleBufferTokenHydratedCount: this.sampleBufferTokenHydratedCount,
          sampleBufferLastFrameCount: shadow.frameCount || 0,
          sampleBufferLastChannelCount: shadow.channelCount || 0,
          sampleFailoverLastQueuedVoiceCount: this.sampleFailoverLastQueuedVoiceCount,
          sampleFailoverVoicePoolDisplacedCount: this.sampleFailoverVoicePoolDisplacedCount,
          sampleFailoverVoicePoolPriorityDisplacedCount: this.sampleFailoverVoicePoolPriorityDisplacedCount,
          sampleFailoverVoicePoolLastDisplacedScore: this.sampleFailoverVoicePoolLastDisplacedScore,
          sampleFailoverStealFadeTailQueuedCount: this.sampleFailoverStealFadeTailQueuedCount,
          sampleFailoverStealFadeTailDroppedCount: this.sampleFailoverStealFadeTailDroppedCount,
          renderPilotOneShotEnabled: true,
          loopDisabledInPilot: true,
          processorRuntimeSampleVoiceAcceptedCount: this.processorRuntimeSampleVoiceAcceptedCount,
          processorRuntimeSegmentClockPulseAcceptedCount: this.processorRuntimeSegmentClockPulseAcceptedCount,
          processorRuntimeApostropheSafeExtendAcceptedCount: this.processorRuntimeApostropheSafeExtendAcceptedCount,
          processorRuntimeLastSourceIntent: this.processorRuntimeLastSourceIntent,
          processorRuntimeLastLane: this.processorRuntimeLastLane,
          processorRuntimeLastExtendPolicy: this.processorRuntimeLastExtendPolicy,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-processor-hold-gesture-start' || message.type === 'wave-starter-processor-hold-gesture-update') {
        const sequence = Number(message.sequence) || 0;
        const gesture = message.gesture || {};
        const gestureId = typeof gesture.gestureId === 'string' && gesture.gestureId ? gesture.gestureId : null;
        const lane = gesture.lane === 'klaviatur' ? 'klaviatur' : gesture.lane === 'wellenstart' ? 'wellenstart' : null;
        const pitchHz = Math.max(10, Math.min(24000, Number(gesture.pitchHz) || 0));
        const segmentsPerBar = Math.max(1, Math.min(256, Math.round(Number(gesture.segmentsPerBar) || 24)));
        const intervalMs = Math.max(2, Math.min(4000, Number(gesture.intervalMs) || 60000 / 108));
        const intervalFrames = Math.max(8, Math.round(intervalMs * sampleRate / 1000));
        const rawActiveSteps = Array.isArray(gesture.activeSteps) ? gesture.activeSteps : [];
        const activeSteps = Array.from({ length: segmentsPerBar }, (_, index) => rawActiveSteps[index] === 0 ? 0 : 1);
        if (message.type === 'wave-starter-processor-hold-gesture-start') this.processorOwnedHoldGestureStartPostedCount += 1;
        else this.processorOwnedHoldGestureUpdatePostedCount += 1;
        if (!gestureId || !lane || !Number.isFinite(pitchHz) || pitchHz <= 0) {
          this.processorOwnedHoldGestureRejectedCount += 1;
          this.processorOwnedHoldLastRejectReason = 'invalid-processor-owned-hold-gesture';
          this.port.postMessage({
            type: 'wave-starter-processor-hold-gesture-rejected',
            sequence,
            reason: this.processorOwnedHoldLastRejectReason,
            processorOwnedHoldGestureRejectedCount: this.processorOwnedHoldGestureRejectedCount,
            workletTimeSec: currentTime,
          });
          return;
        }
        const existing = this.processorOwnedHoldGestures.get(gestureId);
        const next = existing || {
          gestureId,
          lane,
          phase: 0,
          nextSegmentFrame: (typeof currentFrame === 'number' ? currentFrame : 0) + intervalFrames,
          pulseCount: 0,
          active: true,
        };
        next.gestureId = gestureId;
        next.lane = lane;
        next.sourceIntent = typeof gesture.sourceIntent === 'string' ? gesture.sourceIntent : lane === 'klaviatur' ? 'keyboard-hold' : 'enter-hold';
        next.pitchHz = pitchHz;
        next.segmentsPerBar = segmentsPerBar;
        next.intervalFrames = intervalFrames;
        next.intervalMs = intervalMs;
        next.gain = Math.max(0.005, Math.min(0.22, Number(gesture.gain) || 0.035));
        next.forceSustainExtend = gesture.forceSustainExtend === true;
        next.extendPolicy = typeof gesture.extendPolicy === 'string' ? gesture.extendPolicy : next.forceSustainExtend ? 'apostrophe-safe-extend' : 'none';
        next.activeSteps = activeSteps;
        next.presetId = typeof gesture.presetId === 'string' ? gesture.presetId : '';
        next.active = true;
        if (!existing) this.processorOwnedHoldGestures.set(gestureId, next);
        this.processorOwnedHoldGestureActiveCount = this.processorOwnedHoldGestures.size;
        this.processorOwnedHoldLastGestureId = gestureId;
        this.processorOwnedHoldLastLane = lane;
        this.processorOwnedHoldLastSegmentsPerBar = segmentsPerBar;
        this.processorOwnedHoldLastPitchHz = pitchHz;
        this.processorOwnedHoldLastRejectReason = null;
        if (message.type === 'wave-starter-processor-hold-gesture-start') this.processorOwnedHoldGestureStartAcceptedCount += 1;
        else this.processorOwnedHoldGestureUpdateAcceptedCount += 1;
        this.port.postMessage({
          type: message.type === 'wave-starter-processor-hold-gesture-start' ? 'wave-starter-processor-hold-gesture-start-ack' : 'wave-starter-processor-hold-gesture-update-ack',
          sequence,
          processorOwnedHoldGestureStartAcceptedCount: this.processorOwnedHoldGestureStartAcceptedCount,
          processorOwnedHoldGestureUpdateAcceptedCount: this.processorOwnedHoldGestureUpdateAcceptedCount,
          processorOwnedHoldGestureActiveCount: this.processorOwnedHoldGestureActiveCount,
          processorOwnedHoldLastGestureId: this.processorOwnedHoldLastGestureId,
          processorOwnedHoldLastLane: this.processorOwnedHoldLastLane,
          processorOwnedHoldLastSegmentsPerBar: this.processorOwnedHoldLastSegmentsPerBar,
          processorOwnedHoldLastPitchHz: this.processorOwnedHoldLastPitchHz,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-processor-hold-gesture-release') {
        const sequence = Number(message.sequence) || 0;
        const gesture = message.gesture || {};
        const gestureId = typeof gesture.gestureId === 'string' && gesture.gestureId ? gesture.gestureId : null;
        this.processorOwnedHoldGestureReleasePostedCount += 1;
        if (gestureId && this.processorOwnedHoldGestures.has(gestureId)) {
          this.processorOwnedHoldGestures.delete(gestureId);
        }
        this.processorOwnedHoldGestureReleaseAcceptedCount += 1;
        this.processorOwnedHoldGestureActiveCount = this.processorOwnedHoldGestures.size;
        this.processorOwnedHoldLastGestureId = gestureId;
        this.port.postMessage({
          type: 'wave-starter-processor-hold-gesture-release-ack',
          sequence,
          processorOwnedHoldGestureReleaseAcceptedCount: this.processorOwnedHoldGestureReleaseAcceptedCount,
          processorOwnedHoldGestureActiveCount: this.processorOwnedHoldGestureActiveCount,
          processorOwnedHoldLastGestureId: this.processorOwnedHoldLastGestureId,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (message.type === 'wave-starter-shadow-ping') {
        this.readyMessageCount += 1;
        this.port.postMessage({
          type: 'wave-starter-shadow-ready',
          readyMessageCount: this.readyMessageCount,
          workletTimeSec: currentTime,
        });
      }
    };
    this.port.postMessage({ type: 'wave-starter-shadow-ready', readyMessageCount: 1, workletTimeSec: currentTime });
  }

  pumpProcessorOwnedHoldGestures(frames) {
    if (!this.processorOwnedHoldGestures || this.processorOwnedHoldGestures.size <= 0) {
      this.processorOwnedHoldGestureActiveCount = 0;
      return 0;
    }
    const baseFrame = typeof currentFrame === 'number' ? currentFrame : 0;
    const quantumEndFrame = baseFrame + Math.max(1, Number(frames) || 128);
    let created = 0;
    const maxCreatedThisQuantum = 6;
    for (const gesture of this.processorOwnedHoldGestures.values()) {
      if (!gesture || gesture.active !== true) continue;
      if (!Number.isFinite(gesture.nextSegmentFrame)) gesture.nextSegmentFrame = baseFrame + Math.max(8, Number(gesture.intervalFrames) || 256);
      let guard = 0;
      while (gesture.nextSegmentFrame <= quantumEndFrame && created < maxCreatedThisQuantum && guard < 4) {
        const intervalFrames = Math.max(8, Number(gesture.intervalFrames) || 256);
        const delaySec = Math.max(0, (gesture.nextSegmentFrame - baseFrame) / Math.max(1, sampleRate));
        const durationSec = gesture.forceSustainExtend === true
          ? Math.min(${k1e}, Math.max(${C1e}, intervalFrames / sampleRate * ${R1e}))
          : Math.min(${w1e}, Math.max(${M1e}, intervalFrames / sampleRate * ${x1e}));
        const activeSteps = Array.isArray(gesture.activeSteps) && gesture.activeSteps.length > 0 ? gesture.activeSteps : [1];
        const stepIndex = ((Number(gesture.pulseCount) || 0) + 1) % activeSteps.length;
        const stepActive = activeSteps[stepIndex] !== 0;
        const tone = {
          frequencyHz: gesture.pitchHz,
          gain: Math.max(${S1e}, Math.min(${v1e}, Number(gesture.gain) || ${A1e})),
          delaySec,
          durationSec,
          source: 'preset',
          prominence: gesture.forceSustainExtend === true ? ${I1e} : ${P1e},
          waveform: '${y1e}',
        };
        const voice = stepActive ? this.createSynthFailoverVoice(tone, baseFrame) : null;
        if (voice) {
          voice.processorRuntimeOwned = true;
          voice.processorOwnedHoldGesture = true;
          voice.processorOwnedHoldGestureId = gesture.gestureId;
          this.enqueueSynthFailoverVoice(voice);
          this.processorOwnedHoldSynthVoiceCreatedCount += 1;
          this.processorOwnedHoldSegmentPulseCount += 1;
          this.processorRuntimeSegmentClockPulseAcceptedCount += 1;
          this.processorRuntimeLastSourceIntent = gesture.sourceIntent || null;
          this.processorRuntimeLastLane = gesture.lane || null;
          this.processorRuntimeLastExtendPolicy = gesture.extendPolicy || null;
          this.processorRuntimeLastVoiceSpecId = 'processor-owned-hold:' + gesture.gestureId;
          if (gesture.forceSustainExtend === true) this.processorRuntimeApostropheSafeExtendAcceptedCount += 1;
          created += 1;
        }
        gesture.pulseCount = (Number(gesture.pulseCount) || 0) + 1;
        gesture.nextSegmentFrame += intervalFrames;
        guard += 1;
      }
      if (guard >= 4 && gesture.nextSegmentFrame < baseFrame) gesture.nextSegmentFrame = baseFrame + Math.max(8, Number(gesture.intervalFrames) || 256);
    }
    this.processorOwnedHoldGestureActiveCount = this.processorOwnedHoldGestures.size;
    return created;
  }

  markProcessorRuntimeOwnership(message, kind, voiceSpecId) {
    const processorRuntime = message && (
      message.type === 'wave-starter-synth-processor-runtime-voice' ||
      message.type === 'wave-starter-sample-processor-runtime-voice'
    );
    if (!processorRuntime) return false;
    const ownership = message.runtimeOwnership || {};
    this.processorRuntimeLastSourceIntent = typeof ownership.sourceIntent === 'string' ? ownership.sourceIntent : null;
    this.processorRuntimeLastLane = typeof ownership.lane === 'string' ? ownership.lane : null;
    this.processorRuntimeLastExtendPolicy = typeof ownership.extendPolicy === 'string' ? ownership.extendPolicy : null;
    this.processorRuntimeLastVoiceSpecId = typeof voiceSpecId === 'string' ? voiceSpecId : null;
    if (ownership.segmentClockOwnedByProcessor === true) this.processorRuntimeSegmentClockPulseAcceptedCount += 1;
    if (ownership.forceSustainExtend === true) this.processorRuntimeApostropheSafeExtendAcceptedCount += 1;
    if (kind === 'sample') this.processorRuntimeSampleVoiceAcceptedCount += 1;
    else this.processorRuntimeSynthVoiceAcceptedCount += 1;
    return true;
  }

  markProcessorRuntimeRejected(message, kind, reason, voiceSpecId) {
    const processorRuntime = message && (
      message.type === 'wave-starter-synth-processor-runtime-voice' ||
      message.type === 'wave-starter-sample-processor-runtime-voice'
    );
    if (!processorRuntime) return false;
    const ownership = message.runtimeOwnership || {};
    this.processorRuntimeLastSourceIntent = typeof ownership.sourceIntent === 'string' ? ownership.sourceIntent : null;
    this.processorRuntimeLastLane = typeof ownership.lane === 'string' ? ownership.lane : null;
    this.processorRuntimeLastExtendPolicy = typeof ownership.extendPolicy === 'string' ? ownership.extendPolicy : null;
    this.processorRuntimeLastVoiceSpecId = typeof voiceSpecId === 'string' ? voiceSpecId : null;
    this.processorRuntimeLastRejectReason = typeof reason === 'string' ? reason : 'processor-runtime-rejected';
    if (kind === 'sample') this.processorRuntimeSampleVoiceRejectedCount += 1;
    else this.processorRuntimeSynthVoiceRejectedCount += 1;
    return true;
  }

  borrowSynthFailoverVoice() {
    const pooled = this.synthFailoverFreeVoices.pop();
    if (pooled) {
      this.synthFailoverVoicePoolReusedCount += 1;
      return pooled;
    }
    this.synthFailoverVoicePoolAllocatedCount += 1;
    return {};
  }

  recycleSynthFailoverVoice(voice) {
    if (!voice) return;
    voice.channels = null;
    voice.framesRemaining = 0;
    voice.delayFramesRemaining = 0;
    if (this.synthFailoverFreeVoices.length < this.synthFailoverMaxVoices) {
      this.synthFailoverFreeVoices.push(voice);
      this.synthFailoverVoicePoolRecycledCount += 1;
    }
  }

  estimateSynthFailoverVoiceRetentionScore(voice) {
    if (!voice) return 0;
    const framesRemaining = Math.max(0, Number(voice.framesRemaining) || 0);
    const durationFrames = Math.max(1, Number(voice.durationFrames) || framesRemaining || 1);
    const remainingRatio = Math.max(0, Math.min(1, framesRemaining / durationFrames));
    const gainScore = Math.max(0, Math.min(1, (Number(voice.gain) || 0) / 1.4));
    const delayPenalty = Math.max(0, Math.min(0.24, (Number(voice.delayFramesRemaining) || 0) / Math.max(1, sampleRate * 0.04)));
    const ageProgress = Math.max(0, Math.min(1, (Number(voice.cursor) || 0) / durationFrames));
    return Math.max(0, remainingRatio * 0.42 + gainScore * 0.44 + (1 - ageProgress) * 0.14 - delayPenalty);
  }

  estimateSampleFailoverVoiceRetentionScore(voice) {
    if (!voice) return 0;
    const framesRemaining = Math.max(0, Number(voice.framesRemaining) || 0);
    const initialFrames = Math.max(1, Number(voice.initialFrames) || framesRemaining || 1);
    const remainingRatio = Math.max(0, Math.min(1, framesRemaining / initialFrames));
    const gainScore = Math.max(0, Math.min(1, (Number(voice.gain) || 0) / 0.42));
    const ageProgress = Math.max(0, Math.min(1, (Number(voice.cursor) || 0) / initialFrames));
    return Math.max(0, remainingRatio * 0.48 + gainScore * 0.40 + (1 - ageProgress) * 0.12);
  }

  selectLowestRetentionVoiceIndex(voices, estimator) {
    if (!Array.isArray(voices) || voices.length <= 0) return -1;
    let selectedIndex = 0;
    let selectedScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < voices.length; index += 1) {
      const score = estimator.call(this, voices[index]);
      if (score < selectedScore) {
        selectedScore = score;
        selectedIndex = index;
      }
    }
    return selectedIndex;
  }


  currentSynthFailoverEnvelope(voice) {
    if (!voice) return 0;
    const attack = Math.min(1, (Number(voice.cursor) || 0) / Math.max(1, Number(voice.attackFrames) || 1));
    const release = Math.min(1, (Number(voice.framesRemaining) || 0) / Math.max(1, Number(voice.releaseFrames) || 1));
    return Math.max(0, Math.min(1, attack, release));
  }

  currentSampleFailoverEnvelope(voice) {
    if (!voice) return 0;
    const attack = Math.min(1, (Number(voice.cursor) || 0) / Math.max(1, Number(voice.attackFrames) || 1));
    const release = Math.min(1, (Number(voice.framesRemaining) || 0) / Math.max(1, Number(voice.releaseFrames) || 1));
    return Math.max(0, Math.min(1, attack, release));
  }

  enqueueSynthStealFadeTail(displaced) {
    if (!displaced) return;
    const env = this.currentSynthFailoverEnvelope(displaced);
    const baseGain = Math.max(0, Math.min(0.95, (Number(displaced.gain) || 0) * env));
    if (baseGain <= 0.0005 || Number(displaced.framesRemaining) <= 0) return;
    if (this.synthFailoverStealFadeTails.length >= this.stealFadeMaxTails) {
      this.synthFailoverStealFadeTails.shift();
      this.synthFailoverStealFadeTailDroppedCount += 1;
    }
    this.synthFailoverStealFadeTails.push({
      waveform: displaced.waveform || 'triangle',
      phase: Number(displaced.phase) || 0,
      phaseStep: Number(displaced.phaseStep) || 0,
      gain: baseGain,
      framesRemaining: Math.min(this.stealFadeTailFrames, Math.max(1, Number(displaced.framesRemaining) || 1)),
      initialFrames: Math.min(this.stealFadeTailFrames, Math.max(1, Number(displaced.framesRemaining) || 1)),
    });
    this.synthFailoverStealFadeTailQueuedCount += 1;
  }

  enqueueSampleStealFadeTail(displaced) {
    if (!displaced || !Array.isArray(displaced.channels)) return;
    const env = this.currentSampleFailoverEnvelope(displaced);
    const baseGain = Math.max(0, Math.min(0.42, (Number(displaced.gain) || 0) * env));
    if (baseGain <= 0.0005 || Number(displaced.framesRemaining) <= 0) return;
    if (this.sampleFailoverStealFadeTails.length >= this.stealFadeMaxTails) {
      this.sampleFailoverStealFadeTails.shift();
      this.sampleFailoverStealFadeTailDroppedCount += 1;
    }
    this.sampleFailoverStealFadeTails.push({
      channels: displaced.channels,
      position: Number(displaced.position) || 0,
      endFrame: Number(displaced.endFrame) || 0,
      sourceStep: Number(displaced.sourceStep) || 1,
      gain: baseGain,
      framesRemaining: Math.min(this.stealFadeTailFrames, Math.max(1, Number(displaced.framesRemaining) || 1)),
      initialFrames: Math.min(this.stealFadeTailFrames, Math.max(1, Number(displaced.framesRemaining) || 1)),
    });
    this.sampleFailoverStealFadeTailQueuedCount += 1;
  }

  enqueueSynthFailoverVoice(voice) {
    if (this.synthFailoverVoices.length >= this.synthFailoverMaxVoices) {
      const displacedIndex = this.selectLowestRetentionVoiceIndex(
        this.synthFailoverVoices,
        this.estimateSynthFailoverVoiceRetentionScore,
      );
      const displaced = displacedIndex >= 0
        ? this.synthFailoverVoices.splice(displacedIndex, 1)[0]
        : this.synthFailoverVoices.shift();
      this.synthFailoverVoicePoolDisplacedCount += 1;
      this.synthFailoverVoicePoolPriorityDisplacedCount += 1;
      this.synthFailoverVoicePoolLastDisplacedScore = this.estimateSynthFailoverVoiceRetentionScore(displaced);
      this.enqueueSynthStealFadeTail(displaced);
      this.recycleSynthFailoverVoice(displaced);
    }
    this.synthFailoverVoices.push(voice);
    this.synthFailoverLastQueuedVoiceCount = this.synthFailoverVoices.length;
  }

  borrowSampleFailoverVoice() {
    const pooled = this.sampleFailoverFreeVoices.pop();
    if (pooled) {
      this.sampleFailoverVoicePoolReusedCount += 1;
      return pooled;
    }
    this.sampleFailoverVoicePoolAllocatedCount += 1;
    return {};
  }

  recycleSampleFailoverVoice(voice) {
    if (!voice) return;
    voice.channels = null;
    voice.framesRemaining = 0;
    voice.position = 0;
    if (this.sampleFailoverFreeVoices.length < this.sampleFailoverMaxVoices) {
      this.sampleFailoverFreeVoices.push(voice);
      this.sampleFailoverVoicePoolRecycledCount += 1;
    }
  }

  enqueueSampleFailoverVoice(voice) {
    if (this.sampleFailoverVoices.length >= this.sampleFailoverMaxVoices) {
      const displacedIndex = this.selectLowestRetentionVoiceIndex(
        this.sampleFailoverVoices,
        this.estimateSampleFailoverVoiceRetentionScore,
      );
      const displaced = displacedIndex >= 0
        ? this.sampleFailoverVoices.splice(displacedIndex, 1)[0]
        : this.sampleFailoverVoices.shift();
      this.sampleFailoverVoicePoolDisplacedCount += 1;
      this.sampleFailoverVoicePoolPriorityDisplacedCount += 1;
      this.sampleFailoverVoicePoolLastDisplacedScore = this.estimateSampleFailoverVoiceRetentionScore(displaced);
      this.enqueueSampleStealFadeTail(displaced);
      this.recycleSampleFailoverVoice(displaced);
    }
    this.sampleFailoverVoices.push(voice);
    this.sampleFailoverLastQueuedVoiceCount = this.sampleFailoverVoices.length;
  }

  createSampleFailoverVoice(candidate, shadow, baseFrame) {
    const channels = Array.isArray(shadow.channelData) ? shadow.channelData : [];
    if (channels.length <= 0 || !channels[0] || channels[0].length <= 1) return null;
    const sourceSampleRate = Number(shadow.sampleRate) || sampleRate;
    const playbackRate = Math.max(0.25, Math.min(4, Number(candidate.playbackRate) || 1));
    const sourceStep = playbackRate * sourceSampleRate / Math.max(1, sampleRate);
    if (!Number.isFinite(sourceStep) || sourceStep <= 0) return null;
    const cropStartSec = Math.max(0, Number(candidate.cropStartSec) || 0);
    const startOffsetSec = Math.max(0, Number(candidate.startOffsetSec) || 0);
    const cropStartFrame = Math.max(0, Math.min(channels[0].length - 1, Math.floor(cropStartSec * sourceSampleRate)));
    const explicitCropEndSec = Number(candidate.cropEndSec);
    const cropEndFrame = Number.isFinite(explicitCropEndSec) && explicitCropEndSec > cropStartSec
      ? Math.max(cropStartFrame + 1, Math.min(channels[0].length, Math.floor(explicitCropEndSec * sourceSampleRate)))
      : Math.min(channels[0].length, Number(shadow.frameCount) || channels[0].length);
    const offsetFrames = Math.max(0, Math.floor(startOffsetSec * sourceSampleRate));
    const startFrame = Math.max(cropStartFrame, Math.min(cropEndFrame - 1, cropStartFrame + offsetFrames));
    const endFrame = Math.max(startFrame + 1, Math.min(channels[0].length, cropEndFrame));
    const sourceFrameSpan = Math.max(1, endFrame - startFrame);
    const requestedFrames = Math.max(64, Math.floor((Number(candidate.durationMs) || 140) * sampleRate / 1000));
    const naturalFrames = Math.max(1, Math.floor(sourceFrameSpan / sourceStep));
    const maxPilotFrames = Math.max(64, Math.floor(sampleRate * 1.25));
    const framesRemaining = Math.min(requestedFrames, naturalFrames, maxPilotFrames);
    const gain = Math.max(0, Math.min(0.42, Number(candidate.gain) || 0));
    if (!Number.isFinite(gain) || gain <= 0 || framesRemaining <= 0) return null;
    const voice = this.borrowSampleFailoverVoice();
    voice.token = typeof candidate.bufferToken === 'string' ? candidate.bufferToken : null;
    voice.voiceSpecId = typeof candidate.voiceSpecId === 'string' ? candidate.voiceSpecId : null;
    voice.channels = channels;
    voice.sourceSampleRate = sourceSampleRate;
    voice.sourceStep = sourceStep;
    voice.position = startFrame;
    voice.endFrame = endFrame;
    voice.framesRemaining = framesRemaining;
    voice.initialFrames = framesRemaining;
    voice.cursor = 0;
    voice.gain = gain;
    voice.attackFrames = Math.max(16, Math.min(2048, Math.floor((Number(candidate.attackMs) || 8) * sampleRate / 1000)));
    voice.releaseFrames = Math.max(48, Math.min(4096, Math.floor((Number(candidate.releaseMs) || 24) * sampleRate / 1000)));
    voice.loop = false;
    voice.baseFrame = baseFrame;
    return voice;
  }

  createSynthFailoverVoice(tone, baseFrame) {
    const frequencyHz = Number(tone.frequencyHz) || 0;
    const gain = Number(tone.gain) || 0;
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || !Number.isFinite(gain) || gain <= 0) return null;
    const delayFrames = Math.max(0, Math.round((Number(tone.delaySec) || 0) * sampleRate));
    const durationFrames = Math.max(32, Math.round(Math.max(0.035, Number(tone.durationSec) || 0.18) * sampleRate));
    const voice = this.borrowSynthFailoverVoice();
    const source = tone.source === 'overtone' || tone.source === 'swell' || tone.source === 'fallback' ? tone.source : 'preset';
    const prominence = Math.max(0, Math.min(2, Number(tone.prominence) || 1));
    const sourceGainScale = source === 'overtone' ? 0.9 : source === 'swell' ? 0.78 : source === 'fallback' ? 0.92 : 1;
    const attackSec = source === 'swell'
      ? Math.min(0.022, Math.max(0.006, durationFrames / sampleRate * 0.08))
      : source === 'overtone'
        ? Math.min(0.010, Math.max(0.0015, durationFrames / sampleRate * 0.035))
        : Math.min(0.014, Math.max(0.002, durationFrames / sampleRate * 0.05));
    const releaseSec = source === 'swell'
      ? Math.min(0.14, Math.max(0.032, durationFrames / sampleRate * 0.34))
      : source === 'overtone'
        ? Math.min(0.075, Math.max(0.014, durationFrames / sampleRate * 0.19))
        : Math.min(0.105, Math.max(0.018, durationFrames / sampleRate * 0.25));
    voice.startFrame = baseFrame + delayFrames;
    voice.delayFramesRemaining = delayFrames;
    voice.durationFrames = durationFrames;
    voice.framesRemaining = durationFrames;
    voice.cursor = 0;
    voice.frequencyHz = Math.max(10, Math.min(24000, frequencyHz));
    voice.phase = 0;
    voice.phaseStep = (Math.PI * 2 * Math.max(10, Math.min(24000, frequencyHz))) / sampleRate;
    voice.gain = Math.max(0, Math.min(1.4, gain * sourceGainScale * Math.max(0.72, Math.min(1.18, prominence))));
    voice.source = source;
    voice.prominence = prominence;
    voice.waveform = tone.waveform === 'sine' || tone.waveform === 'square' || tone.waveform === 'sawtooth' || tone.waveform === 'triangle' ? tone.waveform : 'triangle';
    voice.attackFrames = Math.max(8, Math.round(attackSec * sampleRate));
    voice.releaseFrames = Math.max(16, Math.round(releaseSec * sampleRate));
    return voice;
  }

  oscillatorSample(waveform, phase) {
    if (waveform === 'square') return phase < Math.PI ? 1 : -1;
    if (waveform === 'sawtooth') return (phase / Math.PI) - 1;
    if (waveform === 'triangle') return 2 * Math.abs(2 * (phase / (Math.PI * 2) - Math.floor(phase / (Math.PI * 2) + 0.5))) - 1;
    return Math.sin(phase);
  }

  process(inputs, outputs) {
    this.processQuantumCount += 1;
    const output = outputs[0] || [];
    const frames = output[0] ? output[0].length : 128;
    for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
      const channel = output[channelIndex];
      if (!channel) continue;
      for (let i = 0; i < channel.length; i += 1) channel[i] = 0;
    }
    const processorOwnedHoldCreatedThisQuantum = this.pumpProcessorOwnedHoldGestures(frames);
    let shapeRenderedThisQuantum = false;
    let parallelRenderedThisQuantum = false;
    if (this.shapeFramesRemaining > 0) {
      shapeRenderedThisQuantum = true;
      this.shapeQuantumCount += 1;
      const shapeFrames = Math.min(frames, this.shapeFramesRemaining);
      const canRenderParallelPilot = this.parallelPilotEnabled === true && this.shapeCompletedCount >= this.parallelPilotRequiredCompletedShapes;
      if (!canRenderParallelPilot) this.parallelPilotAutoMuteReason = 'shape-proof-required';
      else this.parallelPilotAutoMuteReason = null;
      for (let i = 0; i < shapeFrames; i += 1) {
        const progress = Math.min(1, this.shapeEnvelopeCursor / Math.max(1, this.shapeEnvelopeFrames - 1));
        const attack = Math.min(1, progress / 0.12);
        const release = Math.max(0, 1 - progress);
        const envelope = attack * release * release;
        const sample = Math.sin(this.shapePhase) * envelope;
        const abs = Math.abs(sample);
        if (abs > this.shapePeakAbs) this.shapePeakAbs = abs;
        if (canRenderParallelPilot) {
          const attackRamp = Math.min(1, this.shapeEnvelopeCursor / Math.max(1, this.parallelPilotRampAttackFrames));
          const releaseRamp = Math.min(1, this.shapeFramesRemaining / Math.max(1, this.parallelPilotRampReleaseFrames));
          const rampGuardGain = Math.max(0, Math.min(1, attackRamp, releaseRamp));
          const pilotSample = sample * this.parallelPilotGain * rampGuardGain;
          const pilotAbs = Math.abs(pilotSample);
          if (pilotAbs > this.parallelPilotPeakAbs) this.parallelPilotPeakAbs = pilotAbs;
          if (rampGuardGain > this.parallelPilotRampPeakGain) this.parallelPilotRampPeakGain = rampGuardGain;
          for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
            const channel = output[channelIndex];
            if (channel && i < channel.length) channel[i] += pilotSample;
          }
          this.parallelPilotRenderFrameCount += 1;
          this.parallelPilotRampFrameCount += 1;
          parallelRenderedThisQuantum = true;
        } else {
          this.parallelPilotMutedFrameCount += 1;
        }
        this.shapePhase += this.shapePhaseStep;
        if (this.shapePhase > Math.PI * 2) this.shapePhase -= Math.PI * 2;
        this.shapeEnvelopeCursor += 1;
      }
      if (parallelRenderedThisQuantum) {
        this.parallelPilotQuantumCount += 1;
        this.parallelPilotRampQuantumCount += 1;
        this.parallelPilotLastWorkletFrame = typeof currentFrame === 'number' ? currentFrame : this.parallelPilotLastWorkletFrame;
        this.parallelPilotRampLastWorkletFrame = typeof currentFrame === 'number' ? currentFrame : this.parallelPilotRampLastWorkletFrame;
      }
      this.shapeFrameCount += shapeFrames;
      this.shapeFramesRemaining = Math.max(0, this.shapeFramesRemaining - shapeFrames);
      this.shapeLastWorkletFrame = typeof currentFrame === 'number' ? currentFrame : this.shapeLastWorkletFrame;
      if (this.shapeFramesRemaining === 0) this.shapeCompletedCount += 1;
    }
    let synthFailoverRenderedThisQuantum = false;
    if (this.synthFailoverVoices.length > 0) {
      const survivors = [];
      for (const voice of this.synthFailoverVoices) {
        let voiceRendered = false;
        for (let i = 0; i < frames; i += 1) {
          if (voice.delayFramesRemaining > 0) {
            voice.delayFramesRemaining -= 1;
            continue;
          }
          if (voice.framesRemaining <= 0) break;
          const attack = Math.min(1, voice.cursor / Math.max(1, voice.attackFrames));
          const release = Math.min(1, voice.framesRemaining / Math.max(1, voice.releaseFrames));
          const envelope = Math.max(0, Math.min(1, attack, release));
          const sample = this.oscillatorSample(voice.waveform, voice.phase) * voice.gain * envelope;
          const boundedSample = Math.max(-0.95, Math.min(0.95, sample));
          const abs = Math.abs(boundedSample);
          if (abs > this.synthFailoverPeakAbs) this.synthFailoverPeakAbs = abs;
          for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
            const channel = output[channelIndex];
            if (channel && i < channel.length) {
              const next = channel[i] + boundedSample;
              channel[i] = Math.max(-0.98, Math.min(0.98, next));
            }
          }
          voice.phase += voice.phaseStep;
          if (voice.phase > Math.PI * 2) voice.phase -= Math.PI * 2;
          voice.cursor += 1;
          voice.framesRemaining -= 1;
          this.synthFailoverRenderFrameCount += 1;
          if (voice.processorRuntimeOwned === true) this.processorRuntimeRenderFrameCount += 1;
          voiceRendered = true;
          synthFailoverRenderedThisQuantum = true;
        }
        if (voice.framesRemaining > 0 || voice.delayFramesRemaining > 0) survivors.push(voice);
        else if (!voiceRendered && voice.framesRemaining > 0) survivors.push(voice);
        else this.recycleSynthFailoverVoice(voice);
      }
      this.synthFailoverVoices = survivors;
      this.synthFailoverLastQueuedVoiceCount = this.synthFailoverVoices.length;
      if (synthFailoverRenderedThisQuantum) {
        this.synthFailoverRenderQuantumCount += 1;
        this.synthFailoverLastWorkletFrame = typeof currentFrame === 'number' ? currentFrame : this.synthFailoverLastWorkletFrame;
      }
    }
    let sampleFailoverRenderedThisQuantum = false;
    if (this.sampleFailoverVoices.length > 0) {
      const survivors = [];
      for (const voice of this.sampleFailoverVoices) {
        let voiceRendered = false;
        for (let i = 0; i < frames; i += 1) {
          if (voice.framesRemaining <= 0 || voice.position >= voice.endFrame - 1) break;
          const attack = Math.min(1, voice.cursor / Math.max(1, voice.attackFrames));
          const release = Math.min(1, voice.framesRemaining / Math.max(1, voice.releaseFrames));
          const envelope = Math.max(0, Math.min(1, attack, release));
          for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
            const channel = output[channelIndex];
            if (!channel || i >= channel.length) continue;
            const sourceChannel = voice.channels[Math.min(channelIndex, voice.channels.length - 1)] || voice.channels[0];
            if (!sourceChannel) continue;
            const index0 = Math.max(0, Math.min(sourceChannel.length - 1, Math.floor(voice.position)));
            const index1 = Math.max(0, Math.min(sourceChannel.length - 1, index0 + 1));
            const frac = Math.max(0, Math.min(1, voice.position - index0));
            const raw = (sourceChannel[index0] || 0) * (1 - frac) + (sourceChannel[index1] || 0) * frac;
            const sample = raw * voice.gain * envelope;
            const boundedSample = Math.max(-0.95, Math.min(0.95, sample));
            const next = channel[i] + boundedSample;
            channel[i] = Math.max(-0.98, Math.min(0.98, next));
            const abs = Math.abs(boundedSample);
            if (abs > this.sampleFailoverPeakAbs) this.sampleFailoverPeakAbs = abs;
          }
          voice.position += voice.sourceStep;
          voice.cursor += 1;
          voice.framesRemaining -= 1;
          this.sampleFailoverRenderFrameCount += 1;
          if (voice.processorRuntimeOwned === true) this.processorRuntimeRenderFrameCount += 1;
          voiceRendered = true;
          sampleFailoverRenderedThisQuantum = true;
        }
        if (voice.framesRemaining > 0 && voice.position < voice.endFrame - 1) survivors.push(voice);
        else if (!voiceRendered && voice.framesRemaining > 0) survivors.push(voice);
        else this.recycleSampleFailoverVoice(voice);
      }
      this.sampleFailoverVoices = survivors;
      this.sampleFailoverLastQueuedVoiceCount = this.sampleFailoverVoices.length;
      if (sampleFailoverRenderedThisQuantum) {
        this.sampleFailoverRenderQuantumCount += 1;
        this.sampleFailoverLastWorkletFrame = typeof currentFrame === 'number' ? currentFrame : this.sampleFailoverLastWorkletFrame;
      }
    }
    let synthStealFadeRenderedThisQuantum = false;
    if (this.synthFailoverStealFadeTails.length > 0) {
      const tailSurvivors = [];
      for (const tail of this.synthFailoverStealFadeTails) {
        for (let i = 0; i < frames; i += 1) {
          if (tail.framesRemaining <= 0) break;
          const fade = Math.max(0, Math.min(1, tail.framesRemaining / Math.max(1, tail.initialFrames)));
          const sample = this.oscillatorSample(tail.waveform, tail.phase) * tail.gain * fade * fade;
          const boundedSample = Math.max(-0.55, Math.min(0.55, sample));
          for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
            const channel = output[channelIndex];
            if (channel && i < channel.length) channel[i] = Math.max(-0.98, Math.min(0.98, channel[i] + boundedSample));
          }
          tail.phase += tail.phaseStep;
          if (tail.phase > Math.PI * 2) tail.phase -= Math.PI * 2;
          tail.framesRemaining -= 1;
          this.synthFailoverStealFadeTailRenderFrameCount += 1;
          synthStealFadeRenderedThisQuantum = true;
        }
        if (tail.framesRemaining > 0) tailSurvivors.push(tail);
      }
      this.synthFailoverStealFadeTails = tailSurvivors;
    }
    let sampleStealFadeRenderedThisQuantum = false;
    if (this.sampleFailoverStealFadeTails.length > 0) {
      const tailSurvivors = [];
      for (const tail of this.sampleFailoverStealFadeTails) {
        for (let i = 0; i < frames; i += 1) {
          if (tail.framesRemaining <= 0 || tail.position >= tail.endFrame - 1) break;
          const fade = Math.max(0, Math.min(1, tail.framesRemaining / Math.max(1, tail.initialFrames)));
          for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
            const channel = output[channelIndex];
            if (!channel || i >= channel.length) continue;
            const sourceChannel = tail.channels[Math.min(channelIndex, tail.channels.length - 1)] || tail.channels[0];
            if (!sourceChannel) continue;
            const index0 = Math.max(0, Math.min(sourceChannel.length - 1, Math.floor(tail.position)));
            const index1 = Math.max(0, Math.min(sourceChannel.length - 1, index0 + 1));
            const frac = Math.max(0, Math.min(1, tail.position - index0));
            const raw = (sourceChannel[index0] || 0) * (1 - frac) + (sourceChannel[index1] || 0) * frac;
            const boundedSample = Math.max(-0.42, Math.min(0.42, raw * tail.gain * fade * fade));
            channel[i] = Math.max(-0.98, Math.min(0.98, channel[i] + boundedSample));
          }
          tail.position += tail.sourceStep;
          tail.framesRemaining -= 1;
          this.sampleFailoverStealFadeTailRenderFrameCount += 1;
          sampleStealFadeRenderedThisQuantum = true;
        }
        if (tail.framesRemaining > 0 && tail.position < tail.endFrame - 1) tailSurvivors.push(tail);
      }
      this.sampleFailoverStealFadeTails = tailSurvivors;
    }
    if (this.activeFramesRemaining > 0) {
      this.activeRenderQuantumCount += 1;
      this.renderedFrameCount += frames;
      this.activeFramesRemaining = Math.max(0, this.activeFramesRemaining - frames);
      if (this.activeFramesRemaining === 0) {
        this.pendingIntentCount = 0;
        this.latestIntent = null;
      }
    }
    const processorRuntimeActiveSynthVoices = this.synthFailoverVoices.filter((voice) => voice && voice.processorRuntimeOwned === true && Number(voice.framesRemaining) > 0).length;
    const processorRuntimeActiveSampleVoices = this.sampleFailoverVoices.filter((voice) => voice && voice.processorRuntimeOwned === true && Number(voice.framesRemaining) > 0).length;
    const processorRuntimeAcceptedVoices = this.processorRuntimeSynthVoiceAcceptedCount + this.processorRuntimeSampleVoiceAcceptedCount;
    const processorRuntimeRejectedVoices = this.processorRuntimeSynthVoiceRejectedCount + this.processorRuntimeSampleVoiceRejectedCount;
    const processorRuntimeStolenVoiceCount = this.synthFailoverVoicePoolPriorityDisplacedCount + this.sampleFailoverVoicePoolPriorityDisplacedCount;
    const processorRuntimeStealFadeTailPressure = Math.max(0, Math.min(1, (this.synthFailoverStealFadeTails.length + this.sampleFailoverStealFadeTails.length) / Math.max(1, this.stealFadeMaxTails * 2)));
    const processorRuntimeActiveVoicePressure = Math.max(
      processorRuntimeActiveSynthVoices / Math.max(1, this.synthFailoverMaxVoices),
      processorRuntimeActiveSampleVoices / Math.max(1, this.sampleFailoverMaxVoices),
    );
    const processorRuntimeRejectPressure = processorRuntimeRejectedVoices / Math.max(1, processorRuntimeAcceptedVoices + processorRuntimeRejectedVoices);
    this.processorRuntimeQueuePressureApprox = Math.max(
      processorRuntimeActiveVoicePressure,
      processorRuntimeStealFadeTailPressure,
      Math.min(1, processorRuntimeRejectPressure * 0.7),
      Math.min(1, processorOwnedHoldCreatedThisQuantum / 6),
    );
    this.processorRuntimePressureState = this.processorRuntimeQueuePressureApprox >= 0.92
      ? 'critical'
      : this.processorRuntimeQueuePressureApprox >= 0.72
        ? 'brake'
        : this.processorRuntimeQueuePressureApprox >= 0.46
          ? 'watch'
          : 'clear';
    this.processorRuntimeActiveSynthVoices = processorRuntimeActiveSynthVoices;
    this.processorRuntimeActiveSampleVoices = processorRuntimeActiveSampleVoices;
    this.processorRuntimeStolenVoiceCount = processorRuntimeStolenVoiceCount;
    this.processorRuntimeStealFadeTailPressure = processorRuntimeStealFadeTailPressure;
    if (this.processQuantumCount % 16 === 0 || this.activeFramesRemaining > 0 || shapeRenderedThisQuantum || synthFailoverRenderedThisQuantum || sampleFailoverRenderedThisQuantum || synthStealFadeRenderedThisQuantum || sampleStealFadeRenderedThisQuantum || processorOwnedHoldCreatedThisQuantum > 0 || this.processorOwnedHoldGestureActiveCount > 0) {
      this.port.postMessage({
        type: 'wave-starter-shadow-throughput',
        processQuantumCount: this.processQuantumCount,
        renderedFrameCount: this.renderedFrameCount,
        activeRenderQuantumCount: this.activeRenderQuantumCount,
        audioShapeProbeFrameCount: this.shapeFrameCount,
        audioShapeProbeQuantumCount: this.shapeQuantumCount,
        audioShapeProbePeakAbs: this.shapePeakAbs,
        audioShapeProbeCompletedCount: this.shapeCompletedCount,
        audioShapeProbeLastFrequencyHz: this.shapeLastFrequencyHz || null,
        audioShapeProbeLastWorkletFrame: this.shapeLastWorkletFrame || null,
        parallelPilotMutedFrameCount: this.parallelPilotMutedFrameCount,
        parallelPilotRenderFrameCount: this.parallelPilotRenderFrameCount,
        parallelPilotRenderQuantumCount: this.parallelPilotQuantumCount,
        parallelPilotPeakAbs: this.parallelPilotPeakAbs,
        parallelPilotLastWorkletFrame: this.parallelPilotLastWorkletFrame || null,
        parallelPilotAutoMuteReason: this.parallelPilotAutoMuteReason,
        parallelPilotRampGuardAttackFrames: this.parallelPilotRampAttackFrames,
        parallelPilotRampGuardReleaseFrames: this.parallelPilotRampReleaseFrames,
        parallelPilotRampGuardFrameCount: this.parallelPilotRampFrameCount,
        parallelPilotRampGuardQuantumCount: this.parallelPilotRampQuantumCount,
        parallelPilotRampGuardPeakGain: this.parallelPilotRampPeakGain,
        parallelPilotRampGuardLastWorkletFrame: this.parallelPilotRampLastWorkletFrame || null,
        pendingIntentCount: this.pendingIntentCount,
        lastAcceptedSequence: this.lastAcceptedSequence,
        latestIntentReplacedCount: this.latestIntentReplacedCount,
        voiceSpecMirrorAcceptedCount: this.voiceSpecMirrorAcceptedCount,
        voiceSpecMirrorRejectedCount: this.voiceSpecMirrorRejectedCount,
        lastVoiceSpecKind: this.lastVoiceSpecKind,
        lastVoiceSpecId: this.lastVoiceSpecId,
        lastVoiceSpecExactnessLevel: this.lastVoiceSpecExactnessLevel,
        synthFailoverCandidateAcceptedCount: this.synthFailoverCandidateAcceptedCount,
        synthFailoverCandidateRejectedCount: this.synthFailoverCandidateRejectedCount,
        synthFailoverRenderFrameCount: this.synthFailoverRenderFrameCount,
        synthFailoverRenderQuantumCount: this.synthFailoverRenderQuantumCount,
        synthFailoverPeakAbs: this.synthFailoverPeakAbs,
        synthFailoverLastWorkletFrame: this.synthFailoverLastWorkletFrame || null,
        synthFailoverLastSpecId: this.synthFailoverLastSpecId,
        synthFailoverLastRejectReason: this.synthFailoverLastRejectReason,
        synthFailoverCandidateGainScale: this.synthFailoverCandidateGainScale,
        synthFailoverLastQueuedVoiceCount: this.synthFailoverLastQueuedVoiceCount,
        synthFailoverVoicePoolMaxVoices: this.synthFailoverMaxVoices,
        synthFailoverVoicePoolAllocatedCount: this.synthFailoverVoicePoolAllocatedCount,
        synthFailoverVoicePoolReusedCount: this.synthFailoverVoicePoolReusedCount,
        synthFailoverVoicePoolRecycledCount: this.synthFailoverVoicePoolRecycledCount,
        synthFailoverVoicePoolDisplacedCount: this.synthFailoverVoicePoolDisplacedCount,
        synthFailoverVoicePoolPriorityDisplacedCount: this.synthFailoverVoicePoolPriorityDisplacedCount,
        synthFailoverVoicePoolLastDisplacedScore: this.synthFailoverVoicePoolLastDisplacedScore,
        synthFailoverStealFadeTailQueuedCount: this.synthFailoverStealFadeTailQueuedCount,
        synthFailoverStealFadeTailDroppedCount: this.synthFailoverStealFadeTailDroppedCount,
        synthFailoverStealFadeTailRenderFrameCount: this.synthFailoverStealFadeTailRenderFrameCount,
        synthFailoverStealFadeTailMaxTails: this.stealFadeMaxTails,
        synthFailoverVoicePoolFreeCount: this.synthFailoverFreeVoices.length,
        sampleBufferTokenShadowAcceptedCount: this.sampleBufferTokenShadowAcceptedCount,
        sampleBufferTokenShadowRejectedCount: this.sampleBufferTokenShadowRejectedCount,
        sampleBufferTokenHydratedCount: this.sampleBufferTokenHydratedCount,
        sampleBufferLastToken: this.sampleBufferLastToken,
        sampleBufferLastRejectReason: this.sampleBufferLastRejectReason,
        sampleBufferLastFrameCount: this.sampleBufferLastFrameCount,
        sampleBufferLastChannelCount: this.sampleBufferLastChannelCount,
        sampleFailoverCandidateAcceptedCount: this.sampleFailoverCandidateAcceptedCount,
        sampleFailoverCandidateRejectedCount: this.sampleFailoverCandidateRejectedCount,
        sampleFailoverLastSpecId: this.sampleFailoverLastSpecId,
        sampleFailoverLastToken: this.sampleFailoverLastToken,
        sampleFailoverLastRejectReason: this.sampleFailoverLastRejectReason,
        sampleFailoverRenderFrameCount: this.sampleFailoverRenderFrameCount,
        sampleFailoverRenderQuantumCount: this.sampleFailoverRenderQuantumCount,
        sampleFailoverPeakAbs: this.sampleFailoverPeakAbs,
        sampleFailoverLastWorkletFrame: this.sampleFailoverLastWorkletFrame || null,
        sampleFailoverLastQueuedVoiceCount: this.sampleFailoverLastQueuedVoiceCount,
        sampleFailoverVoicePoolMaxVoices: this.sampleFailoverMaxVoices,
        sampleFailoverVoicePoolAllocatedCount: this.sampleFailoverVoicePoolAllocatedCount,
        sampleFailoverVoicePoolReusedCount: this.sampleFailoverVoicePoolReusedCount,
        sampleFailoverVoicePoolRecycledCount: this.sampleFailoverVoicePoolRecycledCount,
        sampleFailoverVoicePoolDisplacedCount: this.sampleFailoverVoicePoolDisplacedCount,
        sampleFailoverVoicePoolPriorityDisplacedCount: this.sampleFailoverVoicePoolPriorityDisplacedCount,
        sampleFailoverVoicePoolLastDisplacedScore: this.sampleFailoverVoicePoolLastDisplacedScore,
        sampleFailoverStealFadeTailQueuedCount: this.sampleFailoverStealFadeTailQueuedCount,
        sampleFailoverStealFadeTailDroppedCount: this.sampleFailoverStealFadeTailDroppedCount,
        sampleFailoverStealFadeTailRenderFrameCount: this.sampleFailoverStealFadeTailRenderFrameCount,
        sampleFailoverStealFadeTailMaxTails: this.stealFadeMaxTails,
        sampleFailoverVoicePoolFreeCount: this.sampleFailoverFreeVoices.length,
        processorRuntimeSynthVoicePostedCount: this.processorRuntimeSynthVoicePostedCount,
        processorRuntimeSampleVoicePostedCount: this.processorRuntimeSampleVoicePostedCount,
        processorRuntimeSynthVoiceAcceptedCount: this.processorRuntimeSynthVoiceAcceptedCount,
        processorRuntimeSampleVoiceAcceptedCount: this.processorRuntimeSampleVoiceAcceptedCount,
        processorRuntimeSynthVoiceRejectedCount: this.processorRuntimeSynthVoiceRejectedCount,
        processorRuntimeSampleVoiceRejectedCount: this.processorRuntimeSampleVoiceRejectedCount,
        processorRuntimeSegmentClockPulseAcceptedCount: this.processorRuntimeSegmentClockPulseAcceptedCount,
        processorRuntimeApostropheSafeExtendAcceptedCount: this.processorRuntimeApostropheSafeExtendAcceptedCount,
        processorRuntimeRenderFrameCount: this.processorRuntimeRenderFrameCount,
        processorRuntimeLastSourceIntent: this.processorRuntimeLastSourceIntent,
        processorRuntimeLastLane: this.processorRuntimeLastLane,
        processorRuntimeLastExtendPolicy: this.processorRuntimeLastExtendPolicy,
        processorRuntimeLastVoiceSpecId: this.processorRuntimeLastVoiceSpecId,
        processorRuntimeLastRejectReason: this.processorRuntimeLastRejectReason,
        processorRuntimeActiveSynthVoices: this.processorRuntimeActiveSynthVoices,
        processorRuntimeActiveSampleVoices: this.processorRuntimeActiveSampleVoices,
        processorRuntimeQueuePressureApprox: this.processorRuntimeQueuePressureApprox,
        processorRuntimePressureState: this.processorRuntimePressureState,
        processorRuntimeStolenVoiceCount: this.processorRuntimeStolenVoiceCount,
        processorRuntimeStealFadeTailPressure: this.processorRuntimeStealFadeTailPressure,
        processorOwnedHoldGestureStartPostedCount: this.processorOwnedHoldGestureStartPostedCount,
        processorOwnedHoldGestureUpdatePostedCount: this.processorOwnedHoldGestureUpdatePostedCount,
        processorOwnedHoldGestureReleasePostedCount: this.processorOwnedHoldGestureReleasePostedCount,
        processorOwnedHoldGestureStartAcceptedCount: this.processorOwnedHoldGestureStartAcceptedCount,
        processorOwnedHoldGestureUpdateAcceptedCount: this.processorOwnedHoldGestureUpdateAcceptedCount,
        processorOwnedHoldGestureReleaseAcceptedCount: this.processorOwnedHoldGestureReleaseAcceptedCount,
        processorOwnedHoldGestureRejectedCount: this.processorOwnedHoldGestureRejectedCount,
        processorOwnedHoldGestureActiveCount: this.processorOwnedHoldGestureActiveCount,
        processorOwnedHoldSegmentPulseCount: this.processorOwnedHoldSegmentPulseCount,
        processorOwnedHoldSynthVoiceCreatedCount: this.processorOwnedHoldSynthVoiceCreatedCount,
        processorOwnedHoldLastGestureId: this.processorOwnedHoldLastGestureId,
        processorOwnedHoldLastLane: this.processorOwnedHoldLastLane,
        processorOwnedHoldLastSegmentsPerBar: this.processorOwnedHoldLastSegmentsPerBar,
        processorOwnedHoldLastPitchHz: this.processorOwnedHoldLastPitchHz,
        processorOwnedHoldLastRejectReason: this.processorOwnedHoldLastRejectReason,
        workletTimeSec: currentTime,
      });
    }
    return true;
  }
}
registerProcessor('${mL}', XensonarWaveStarterShadowPilot);
`,L1e=mL,Nb=450;function Ob(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now()}const zW="__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__";function B1e(){return typeof window<"u"&&window.location?.protocol==="file:"}function Nn(e={}){const t=e.status??"unstarted",n=e.processorErrorCount??0,r=e.renderedFrameCount??0,a=e.lastFrameAdvanceAtMs??null,o=a!==null&&Ob()-a<=Nb;let i=e.decision??"not-requested";return t==="unsupported"?i="unsupported-fallback":t==="loading"?i="shadow-pilot-loading":t==="failed"||n>0?i="processor-error-fallback":(e.sampleFailoverCandidateRejectedCount??0)>0?i="sample-failover-candidate-rejected":(e.sampleFailoverRenderFrameCount??0)>0&&(e.sampleFailoverLastRenderAtMs??null)!==null&&Ob()-(e.sampleFailoverLastRenderAtMs??0)<=Nb?i="sample-failover-candidate-rendered":(e.sampleFailoverCandidateAcceptedCount??0)>0?i="sample-failover-candidate-accepted":(e.sampleFailoverCandidatePostedCount??0)>0?i="sample-failover-candidate-posted":(e.sampleBufferTokenShadowRejectedCount??0)>0?i="sample-buffer-token-shadow-rejected":(e.sampleBufferTokenShadowAcceptedCount??0)>0?i="sample-buffer-token-shadow-accepted":(e.sampleBufferTokenShadowPostedCount??0)>0?i="sample-buffer-token-shadow-posted":(e.synthFailoverRenderFrameCount??0)>0&&(e.synthFailoverLastRenderAtMs??null)!==null&&Ob()-(e.synthFailoverLastRenderAtMs??0)<=Nb?i="synth-failover-candidate-rendered":(e.synthFailoverCandidateAcceptedCount??0)>0?i="synth-failover-candidate-accepted":(e.synthFailoverCandidatePostedCount??0)>0?i="synth-failover-candidate-posted":(e.parallelPilotRenderFrameCount??0)>0&&(e.parallelPilotLastRenderAtMs??null)!==null&&Ob()-(e.parallelPilotLastRenderAtMs??0)<=Nb?i="parallel-pilot-mix-rendered":(e.audioShapeProbeCompletedCount??0)>=zI&&t==="loaded"?i="parallel-pilot-armed":(e.audioShapeProbeFrameCount??0)>0&&(e.audioShapeProbeLastRenderAtMs??null)!==null&&Ob()-(e.audioShapeProbeLastRenderAtMs??0)<=Nb?i="shadow-audio-shape-rendered":r>0&&o?i="frame-advance-observed":(e.ackedIntentCount??0)>0?i="intent-acked":t==="loaded"&&(i="shadow-pilot-ready"),{version:1,reportKind:"xensonar-wave-starter-worklet-pilot-report",generatedAtIso:new Date().toISOString(),status:t,decision:i,processorName:L1e,requestedAtMs:e.requestedAtMs??null,completedAtMs:e.completedAtMs??null,lastMessageAtMs:e.lastMessageAtMs??null,lastIntentPostedAtMs:e.lastIntentPostedAtMs??null,lastIntentAckAtMs:e.lastIntentAckAtMs??null,lastFrameAdvanceAtMs:a,readyMessageCount:e.readyMessageCount??0,postedIntentCount:e.postedIntentCount??0,ackedIntentCount:e.ackedIntentCount??0,rejectedIntentCount:e.rejectedIntentCount??0,processorErrorCount:n,processQuantumCount:e.processQuantumCount??0,renderedFrameCount:r,renderedFrameDelta:e.renderedFrameDelta??0,activeRenderQuantumCount:e.activeRenderQuantumCount??0,audioShapeProbeEnabled:!0,audioShapeProbeSilenceOnly:!0,audioShapeProbeFrameCount:e.audioShapeProbeFrameCount??0,audioShapeProbeFrameDelta:e.audioShapeProbeFrameDelta??0,audioShapeProbeQuantumCount:e.audioShapeProbeQuantumCount??0,audioShapeProbePeakAbs:e.audioShapeProbePeakAbs??0,audioShapeProbeCompletedCount:e.audioShapeProbeCompletedCount??0,audioShapeProbeLastRenderAtMs:e.audioShapeProbeLastRenderAtMs??null,audioShapeProbeLastFrequencyHz:e.audioShapeProbeLastFrequencyHz??null,audioShapeProbeLastWorkletFrame:e.audioShapeProbeLastWorkletFrame??null,parallelPilotMixEnabled:!0,parallelPilotPreservesLegacyReference:!0,parallelPilotRequiresShapeProof:!0,parallelPilotGain:e.parallelPilotGain??NW,parallelPilotGainDb:e.parallelPilotGainDb??E1e,parallelPilotRequiredCompletedShapes:e.parallelPilotRequiredCompletedShapes??zI,parallelPilotMutedFrameCount:e.parallelPilotMutedFrameCount??0,parallelPilotRenderFrameCount:e.parallelPilotRenderFrameCount??0,parallelPilotRenderFrameDelta:e.parallelPilotRenderFrameDelta??0,parallelPilotRenderQuantumCount:e.parallelPilotRenderQuantumCount??0,parallelPilotPeakAbs:e.parallelPilotPeakAbs??0,parallelPilotLastRenderAtMs:e.parallelPilotLastRenderAtMs??null,parallelPilotLastWorkletFrame:e.parallelPilotLastWorkletFrame??null,parallelPilotAutoMuteReason:e.parallelPilotAutoMuteReason??null,parallelPilotRampGuardEnabled:!0,parallelPilotRampGuardAttackFrames:e.parallelPilotRampGuardAttackFrames??OW,parallelPilotRampGuardReleaseFrames:e.parallelPilotRampGuardReleaseFrames??_W,parallelPilotRampGuardFrameCount:e.parallelPilotRampGuardFrameCount??0,parallelPilotRampGuardQuantumCount:e.parallelPilotRampGuardQuantumCount??0,parallelPilotRampGuardPeakGain:e.parallelPilotRampGuardPeakGain??0,parallelPilotRampGuardLastRenderAtMs:e.parallelPilotRampGuardLastRenderAtMs??null,parallelPilotRampGuardLastWorkletFrame:e.parallelPilotRampGuardLastWorkletFrame??null,voiceSpecMirrorAcceptedCount:e.voiceSpecMirrorAcceptedCount??0,voiceSpecMirrorRejectedCount:e.voiceSpecMirrorRejectedCount??0,lastVoiceSpecKind:e.lastVoiceSpecKind??null,lastVoiceSpecId:e.lastVoiceSpecId??null,lastVoiceSpecExactnessLevel:e.lastVoiceSpecExactnessLevel??null,lastVoiceSpecMirrorAtMs:e.lastVoiceSpecMirrorAtMs??null,synthFailoverCandidatePostedCount:e.synthFailoverCandidatePostedCount??0,synthFailoverCandidateAcceptedCount:e.synthFailoverCandidateAcceptedCount??0,synthFailoverCandidateRejectedCount:e.synthFailoverCandidateRejectedCount??0,synthFailoverRenderFrameCount:e.synthFailoverRenderFrameCount??0,synthFailoverRenderFrameDelta:e.synthFailoverRenderFrameDelta??0,synthFailoverRenderQuantumCount:e.synthFailoverRenderQuantumCount??0,synthFailoverPeakAbs:e.synthFailoverPeakAbs??0,synthFailoverLastRenderAtMs:e.synthFailoverLastRenderAtMs??null,synthFailoverLastWorkletFrame:e.synthFailoverLastWorkletFrame??null,synthFailoverLastSpecId:e.synthFailoverLastSpecId??null,synthFailoverLastRejectReason:e.synthFailoverLastRejectReason??null,synthFailoverCandidateGainScale:e.synthFailoverCandidateGainScale??0,synthFailoverLastQueuedVoiceCount:e.synthFailoverLastQueuedVoiceCount??0,synthFailoverVoicePoolMaxVoices:e.synthFailoverVoicePoolMaxVoices??Uw,synthFailoverVoicePoolAllocatedCount:e.synthFailoverVoicePoolAllocatedCount??0,synthFailoverVoicePoolReusedCount:e.synthFailoverVoicePoolReusedCount??0,synthFailoverVoicePoolRecycledCount:e.synthFailoverVoicePoolRecycledCount??0,synthFailoverVoicePoolDisplacedCount:e.synthFailoverVoicePoolDisplacedCount??0,synthFailoverVoicePoolPriorityDisplacedCount:e.synthFailoverVoicePoolPriorityDisplacedCount??0,synthFailoverVoicePoolLastDisplacedScore:e.synthFailoverVoicePoolLastDisplacedScore??null,synthFailoverStealFadeTailQueuedCount:e.synthFailoverStealFadeTailQueuedCount??0,synthFailoverStealFadeTailDroppedCount:e.synthFailoverStealFadeTailDroppedCount??0,synthFailoverStealFadeTailRenderFrameCount:e.synthFailoverStealFadeTailRenderFrameCount??0,synthFailoverStealFadeTailMaxTails:e.synthFailoverStealFadeTailMaxTails??nS,synthFailoverVoicePoolFreeCount:e.synthFailoverVoicePoolFreeCount??0,synthFailoverVoicePoolCompactionEnabled:!0,synthFailoverVoicePoolPriorityDisplacementEnabled:!0,synthFailoverLegacyDropOnly:!0,sampleFailoverBlockedUntilBufferToken:!0,sampleFailoverBlockedUntilHydratedToken:!0,sampleRenderingDisabledUntilPilot:!1,sampleFailoverPilotRendererEnabled:!0,sampleFailoverPilotOneShotOnly:!0,sampleFailoverPilotLoopDisabled:!0,sampleFailoverCandidatePostedCount:e.sampleFailoverCandidatePostedCount??0,sampleFailoverCandidateAcceptedCount:e.sampleFailoverCandidateAcceptedCount??0,sampleFailoverCandidateRejectedCount:e.sampleFailoverCandidateRejectedCount??0,sampleFailoverLastSpecId:e.sampleFailoverLastSpecId??null,sampleFailoverLastToken:e.sampleFailoverLastToken??null,sampleFailoverLastRejectReason:e.sampleFailoverLastRejectReason??null,sampleFailoverRenderingDisabledUntilPilot:!1,sampleFailoverHydratedTokenRequired:!0,sampleFailoverRenderFrameCount:e.sampleFailoverRenderFrameCount??0,sampleFailoverRenderFrameDelta:e.sampleFailoverRenderFrameDelta??0,sampleFailoverRenderQuantumCount:e.sampleFailoverRenderQuantumCount??0,sampleFailoverPeakAbs:e.sampleFailoverPeakAbs??0,sampleFailoverLastRenderAtMs:e.sampleFailoverLastRenderAtMs??null,sampleFailoverLastWorkletFrame:e.sampleFailoverLastWorkletFrame??null,sampleFailoverLastQueuedVoiceCount:e.sampleFailoverLastQueuedVoiceCount??0,sampleFailoverVoicePoolMaxVoices:e.sampleFailoverVoicePoolMaxVoices??Kw,sampleFailoverVoicePoolAllocatedCount:e.sampleFailoverVoicePoolAllocatedCount??0,sampleFailoverVoicePoolReusedCount:e.sampleFailoverVoicePoolReusedCount??0,sampleFailoverVoicePoolRecycledCount:e.sampleFailoverVoicePoolRecycledCount??0,sampleFailoverVoicePoolDisplacedCount:e.sampleFailoverVoicePoolDisplacedCount??0,sampleFailoverVoicePoolPriorityDisplacedCount:e.sampleFailoverVoicePoolPriorityDisplacedCount??0,sampleFailoverVoicePoolLastDisplacedScore:e.sampleFailoverVoicePoolLastDisplacedScore??null,sampleFailoverStealFadeTailQueuedCount:e.sampleFailoverStealFadeTailQueuedCount??0,sampleFailoverStealFadeTailDroppedCount:e.sampleFailoverStealFadeTailDroppedCount??0,sampleFailoverStealFadeTailRenderFrameCount:e.sampleFailoverStealFadeTailRenderFrameCount??0,sampleFailoverStealFadeTailMaxTails:e.sampleFailoverStealFadeTailMaxTails??nS,sampleFailoverVoicePoolFreeCount:e.sampleFailoverVoicePoolFreeCount??0,sampleFailoverVoicePoolCompactionEnabled:!0,sampleFailoverVoicePoolPriorityDisplacementEnabled:!0,processorRuntimeOwnershipEnabled:!0,processorRuntimeLegacyReferencePreserved:!0,processorRuntimeVoicePoolReusesExistingRenderer:!0,processorRuntimeSynthVoicePostedCount:e.processorRuntimeSynthVoicePostedCount??0,processorRuntimeSampleVoicePostedCount:e.processorRuntimeSampleVoicePostedCount??0,processorRuntimeSynthVoiceAcceptedCount:e.processorRuntimeSynthVoiceAcceptedCount??0,processorRuntimeSampleVoiceAcceptedCount:e.processorRuntimeSampleVoiceAcceptedCount??0,processorRuntimeSynthVoiceRejectedCount:e.processorRuntimeSynthVoiceRejectedCount??0,processorRuntimeSampleVoiceRejectedCount:e.processorRuntimeSampleVoiceRejectedCount??0,processorRuntimeSegmentClockPulseAcceptedCount:e.processorRuntimeSegmentClockPulseAcceptedCount??0,processorRuntimeApostropheSafeExtendAcceptedCount:e.processorRuntimeApostropheSafeExtendAcceptedCount??0,processorRuntimeRenderFrameCount:e.processorRuntimeRenderFrameCount??0,processorRuntimeRenderFrameDelta:e.processorRuntimeRenderFrameDelta??0,processorRuntimeLastSourceIntent:e.processorRuntimeLastSourceIntent??null,processorRuntimeLastLane:e.processorRuntimeLastLane??null,processorRuntimeLastExtendPolicy:e.processorRuntimeLastExtendPolicy??null,processorRuntimeLastVoiceSpecId:e.processorRuntimeLastVoiceSpecId??null,processorRuntimeLastRejectReason:e.processorRuntimeLastRejectReason??null,processorRuntimeActiveSynthVoices:e.processorRuntimeActiveSynthVoices??0,processorRuntimeActiveSampleVoices:e.processorRuntimeActiveSampleVoices??0,processorRuntimeQueuePressureApprox:e.processorRuntimeQueuePressureApprox??0,processorRuntimePressureState:e.processorRuntimePressureState??"clear",processorRuntimeStolenVoiceCount:e.processorRuntimeStolenVoiceCount??0,processorRuntimeStealFadeTailPressure:e.processorRuntimeStealFadeTailPressure??0,processorOwnedHoldSchedulerEnabled:!0,processorOwnedHoldGestureStartPostedCount:e.processorOwnedHoldGestureStartPostedCount??0,processorOwnedHoldGestureUpdatePostedCount:e.processorOwnedHoldGestureUpdatePostedCount??0,processorOwnedHoldGestureReleasePostedCount:e.processorOwnedHoldGestureReleasePostedCount??0,processorOwnedHoldGestureStartAcceptedCount:e.processorOwnedHoldGestureStartAcceptedCount??0,processorOwnedHoldGestureUpdateAcceptedCount:e.processorOwnedHoldGestureUpdateAcceptedCount??0,processorOwnedHoldGestureReleaseAcceptedCount:e.processorOwnedHoldGestureReleaseAcceptedCount??0,processorOwnedHoldGestureRejectedCount:e.processorOwnedHoldGestureRejectedCount??0,processorOwnedHoldGestureActiveCount:e.processorOwnedHoldGestureActiveCount??0,processorOwnedHoldSegmentPulseCount:e.processorOwnedHoldSegmentPulseCount??0,processorOwnedHoldSynthVoiceCreatedCount:e.processorOwnedHoldSynthVoiceCreatedCount??0,processorOwnedHoldSchedulerActive:e.processorOwnedHoldSchedulerActive??!1,processorOwnedHoldLastGestureId:e.processorOwnedHoldLastGestureId??null,processorOwnedHoldLastLane:e.processorOwnedHoldLastLane??null,processorOwnedHoldLastSegmentsPerBar:e.processorOwnedHoldLastSegmentsPerBar??null,processorOwnedHoldLastPitchHz:e.processorOwnedHoldLastPitchHz??null,processorOwnedHoldLastRejectReason:e.processorOwnedHoldLastRejectReason??null,sampleBufferTokenShadowPostedCount:e.sampleBufferTokenShadowPostedCount??0,sampleBufferTokenShadowAcceptedCount:e.sampleBufferTokenShadowAcceptedCount??0,sampleBufferTokenShadowRejectedCount:e.sampleBufferTokenShadowRejectedCount??0,sampleBufferTokenHydratedCount:e.sampleBufferTokenHydratedCount??0,sampleBufferLastToken:e.sampleBufferLastToken??null,sampleBufferLastRejectReason:e.sampleBufferLastRejectReason??null,sampleBufferLastFrameCount:e.sampleBufferLastFrameCount??0,sampleBufferLastChannelCount:e.sampleBufferLastChannelCount??0,lastAcceptedSequence:e.lastAcceptedSequence??0,lastPostedSequence:e.lastPostedSequence??0,lastRejectedReason:e.lastRejectedReason??null,pendingIntentCount:e.pendingIntentCount??0,latestIntentReplacedCount:e.latestIntentReplacedCount??0,keepAliveConnected:e.keepAliveConnected??!1,outputConnected:e.outputConnected??!1,silentShadowOnly:!1,preservesMainThreadReferencePath:!0,fileOriginLikelyBlocked:e.fileOriginLikelyBlocked??B1e(),detail:e.detail??null,errorMessage:e.errorMessage??null}}function On(e){return typeof window<"u"&&(window[zW]=e),e}function D1e(){if(typeof window>"u")return null;const e=window[zW];return e&&typeof e=="object"?e:null}let i8=0,s8=0,l8=0,c8=0,u8=0,d8=0,m8=0,p8=0,h8=0,f8=0,g8=0,b8=0,y8=0;function N1e(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now()}