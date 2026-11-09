import * as React from 'react';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { SampleTempoModeDraft } from './sampleInspectorMenuActions';
import { formatSampleDurationDraft } from './sampleDisplayText';

export type SampleContextMenuState = { sampleId: string; x: number; y: number } | null;

function defaultSampleInspectorPosition() {
  if (typeof window === 'undefined') return { x: 260, y: 120 };
  return {
    x: Math.max(80, Math.round(window.innerWidth * 0.5 - 180)),
    y: Math.max(80, Math.round(window.innerHeight * 0.18)),
  };
}

export function useMelodicSampleInspectorState(samples: SavedMelodicSampleMeta[]) {
  const sampleContextMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [sampleContextMenu, setSampleContextMenu] = React.useState<SampleContextMenuState>(null);
  const [sampleBaseHzDraft, setSampleBaseHzDraft] = React.useState('');
  const [sampleDurationDraft, setSampleDurationDraft] = React.useState('');
  const [sampleTempoModeDraft, setSampleTempoModeDraft] = React.useState<SampleTempoModeDraft>('linked');

  React.useEffect(() => {
    if (!sampleContextMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (sampleContextMenuRef.current?.contains(event.target as Node | null)) return;
      setSampleContextMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSampleContextMenu(null);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [sampleContextMenu]);

  const selectedContextSample = React.useMemo(() => {
    if (!sampleContextMenu) return null;
    return samples.find((entry) => entry.id === sampleContextMenu.sampleId) ?? null;
  }, [samples, sampleContextMenu]);

  React.useEffect(() => {
    if (!selectedContextSample) return;
    setSampleBaseHzDraft(selectedContextSample.baseHz ? selectedContextSample.baseHz.toFixed(2) : '');
    setSampleDurationDraft(formatSampleDurationDraft(selectedContextSample));
    setSampleTempoModeDraft(selectedContextSample.tempoPitchLinked ? 'linked' : 'decoupled');
  }, [selectedContextSample]);

  const openSampleContextMenu = React.useCallback((sampleId: string, x: number, y: number) => {
    setSampleContextMenu({ sampleId, x, y });
  }, []);

  const openSampleContextMenuAtDefaultPosition = React.useCallback((sampleId: string) => {
    const position = defaultSampleInspectorPosition();
    setSampleContextMenu({ sampleId, ...position });
  }, []);

  const closeSampleContextMenu = React.useCallback(() => setSampleContextMenu(null), []);

  return {
    sampleContextMenuRef,
    sampleContextMenu,
    selectedContextSample,
    sampleBaseHzDraft,
    setSampleBaseHzDraft,
    sampleDurationDraft,
    setSampleDurationDraft,
    sampleTempoModeDraft,
    setSampleTempoModeDraft,
    openSampleContextMenu,
    openSampleContextMenuAtDefaultPosition,
    closeSampleContextMenu,
  };
}
