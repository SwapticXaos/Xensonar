import { useRef,useState } from 'react';
import { type SpectralData } from '../spectralForge/audio/SpectralData';

export type CanonicalForgeWarpProxyStateArgs = {
  initialProxyBaselineSnapshot: Float32Array | null;
  spectralWidth: number;
};

export function useCanonicalForgeWarpProxyState({
  initialProxyBaselineSnapshot,
  spectralWidth,
}: CanonicalForgeWarpProxyStateArgs) {
  const proxyBaselineSnapshotRef = useRef<Float32Array | null>(initialProxyBaselineSnapshot);
  const warpTimeColumnsRef = useRef<Float32Array | null>(null);
  const warpPitchColumnsRef = useRef<Float32Array | null>(null);
  const [warpVersion, setWarpVersion] = useState(0);

  const applyWarpSnapshot = (warpTime: Float32Array | null, warpPitch: Float32Array | null) => {
    warpTimeColumnsRef.current = warpTime && warpTime.length === spectralWidth ? warpTime : null;
    warpPitchColumnsRef.current = warpPitch && warpPitch.length === spectralWidth ? warpPitch : null;
    setWarpVersion((version) => version + 1);
  };

  const resetWarpFields = () => {
    warpTimeColumnsRef.current = null;
    warpPitchColumnsRef.current = null;
    setWarpVersion((version) => version + 1);
  };

  const ensureWarpFields = () => {
    if (!warpTimeColumnsRef.current || warpTimeColumnsRef.current.length !== spectralWidth) {
      warpTimeColumnsRef.current = new Float32Array(spectralWidth);
    }
    if (!warpPitchColumnsRef.current || warpPitchColumnsRef.current.length !== spectralWidth) {
      warpPitchColumnsRef.current = new Float32Array(spectralWidth);
    }
    return {
      time: warpTimeColumnsRef.current,
      pitch: warpPitchColumnsRef.current,
    };
  };

  const updateProxyBaselineSnapshot = (next: SpectralData | null) => {
    proxyBaselineSnapshotRef.current = next ? next.cloneData() : null;
    resetWarpFields();
  };

  return {
    proxyBaselineSnapshotRef,
    warpTimeColumnsRef,
    warpPitchColumnsRef,
    warpVersion,
    setWarpVersion,
    applyWarpSnapshot,
    ensureWarpFields,
    updateProxyBaselineSnapshot,
  };
}
