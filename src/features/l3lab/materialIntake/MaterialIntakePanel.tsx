import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporterTypes';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpectralForgeEntryScrollIntent, SpectralForgeExternalAudioOrigin } from '../contracts/spectralForgeEntryIntent';
import { intersectRanges, isRangeFullyVisible, rangeEnd } from './selectionMath';
import { FeedbackButton } from './materialIntakePanel/FeedbackButton';
import type { CommittedLoopPayload, IntakeSource, MaterialIntakeExportMeta, MaterialIntakeMeterConfig, MaterialSourceAdapter, MaterialTargetAdapter } from './types';
import { useMaterialIntakeController } from './useMaterialIntakeController';
import { useMaterialIntakeActionFeedback } from './useMaterialIntakeActionFeedback';
import { useMaterialIntakeEntryGateway } from './useMaterialIntakeEntryGateway';
import { useMaterialIntakeCanvasRuntime } from './materialIntakePanel/useMaterialIntakeCanvasRuntime';

export interface MaterialIntakePanelProps {
  sourceAdapters: MaterialSourceAdapter[];
  targetAdapter: MaterialTargetAdapter;
  rawTargetAdapter?: MaterialTargetAdapter;
  rawRootFollowTargetAdapter?: MaterialTargetAdapter;
  rawMelodicPinkLaneTargetAdapter?: MaterialTargetAdapter;
  rawMelodicSampleTargetAdapter?: MaterialTargetAdapter;
  onMetaPatch?: (patch: Partial<MaterialIntakeExportMeta>) => void;
  exportMeta?: MaterialIntakeExportMeta;
  meter?: MaterialIntakeMeterConfig;
  persistenceKey?: string;
  externalLoadFile?: File | null;
  onExternalLoadConsumed?: () => void;
  externalLoadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onEntryScrollIntentConsumed?: (token: string) => void;
  loadButtonLabel?: string;
  onExtractTimbre?: (payload: CommittedLoopPayload) => boolean | Promise<boolean>;
  onApplyTimbre?: (payload: CommittedLoopPayload) => boolean | Promise<boolean>;
  onDonorInputChange?: (source: AudioSourceAsset | null, startSec: number, durationSec: number) => void;
  onEmbodyTimbre?: (payload: CommittedLoopPayload) => boolean | Promise<boolean>;
  timbreStatusLabel?: string;
  embodimentStatusLabel?: string;
}



function deriveDefaultLoopSampleTitle(source: IntakeSource | null) {
  const raw = (source?.sourceAsset?.fileName || source?.label || '').trim();
  const withoutExtension = raw.replace(/\.[a-z0-9]{1,8}$/i, '').trim();
  return withoutExtension || raw || 'Audio-Auswahl';
}

export default function MaterialIntakePanel({
  sourceAdapters,
  targetAdapter,
  rawTargetAdapter,
  rawRootFollowTargetAdapter,
  rawMelodicPinkLaneTargetAdapter,
  rawMelodicSampleTargetAdapter,
  onMetaPatch,
  exportMeta,
  meter,
  persistenceKey,
  externalLoadFile,
  onExternalLoadConsumed,
  externalLoadOrigin = null,
  entryScrollIntent = null,
  onEntryScrollIntentConsumed,
  loadButtonLabel = 'Quelle laden',
  onExtractTimbre,
  onApplyTimbre,
  onDonorInputChange,
  onEmbodyTimbre,
  timbreStatusLabel,
  embodimentStatusLabel,
}: MaterialIntakePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intakeGatewayRef = useRef<HTMLDivElement | null>(null);
  const {
    source,
    selection,
    repairResult,
    hasRepairUndo,
    status,
    busy,
    previewPlaying,
    readMode,
    sourceAdapterId,
    activeSourceAdapter,
    setSourceAdapterId,
    setReadMode,
    loadSourceFromFile,
    setDetailViewport,
    setFineLoopRange,
    clearRepairUndo,
    fitViewportToFineLoop,
    repairLoop,
    undoRepairLoop,
    applyRepairCandidate,
    togglePreview,
    scrubPreviewAt,
    updateActivePreviewRange,
    commitToTarget,
    sendRawToAdapter,
    sendRawToTarget,
  } = useMaterialIntakeController({ sourceAdapters, targetAdapter, rawTargetAdapter, onMetaPatch, meter, persistenceKey });

  const [loopSampleTitle, setLoopSampleTitle] = useState(() => deriveDefaultLoopSampleTitle(source));

  useEffect(() => {
    setLoopSampleTitle(deriveDefaultLoopSampleTitle(source));
  }, [source?.id]);

  const effectiveLoopSampleTitle = loopSampleTitle.trim() || deriveDefaultLoopSampleTitle(source);

  const { pendingMap, successMap, runActionWithFeedback } = useMaterialIntakeActionFeedback();

  useMaterialIntakeEntryGateway({
    sourceReady: !!source,
    intakeGatewayRef,
    externalLoadFile,
    externalLoadOrigin,
    entryScrollIntent,
    onExternalLoadConsumed,
    onEntryScrollIntentConsumed,
    loadSourceFromFile,
    runActionWithFeedback,
  });

  useEffect(() => {
    onDonorInputChange?.(source?.sourceAsset ?? null, selection?.fineLoopRange.startSec ?? 0, selection?.fineLoopRange.durationSec ?? 0);
  }, [source?.sourceAsset, selection?.fineLoopRange.startSec, selection?.fineLoopRange.durationSec, onDonorInputChange]);

  const canvasRuntime = useMaterialIntakeCanvasRuntime({
    source,
    selection,
    previewPlaying,
    meter,
    setDetailViewport,
    setFineLoopRange,
    clearRepairUndo,
    scrubPreviewAt,
    updateActivePreviewRange,
  });
  const {
    overviewRef, detailRef, playstripRef, overviewCursor, detailCursor, updateOverviewCursor, updateDetailCursor,
    resetOverviewCursor, resetDetailCursor, beginOverviewDrag, beginDetailDrag,
  } = canvasRuntime;

  const buildCommittedPayload = (): CommittedLoopPayload | null => {
    if (!source || !selection) return null;
    return {
      source,
      selection,
      readMode,
      repairResult,
      exportTitle: effectiveLoopSampleTitle,
    };
  };

  const fineLoopDurationSec = selection?.fineLoopRange.durationSec ?? 0;
  const rawSampleLengthOk = fineLoopDurationSec > 0 && fineLoopDurationSec <= 5;

  const sendRawRootFollowLoop = async (): Promise<boolean> => {
    if (!rawRootFollowTargetAdapter || !source || !selection) return false;
    return sendRawToAdapter(rawRootFollowTargetAdapter, {
      success: 'Der Loop wurde als Root-Follow-Loop vorbereitet.',
      failure: 'Root-Follow-Loop-Sendung fehlgeschlagen.',
    }, effectiveLoopSampleTitle);
  };

  const sendRawToMelodicPinkLane = async (): Promise<boolean> => {
    if (!rawMelodicPinkLaneTargetAdapter || !source || !selection) return false;
    return sendRawToAdapter(rawMelodicPinkLaneTargetAdapter, {
      success: 'Raw Audio wurde direkt als pinke Spur an Melodic Loop gesendet.',
      failure: 'Direkter Raw-Audio-Import nach Melodic Loop fehlgeschlagen.',
    }, effectiveLoopSampleTitle);
  };

  const sendRawSampleToMelodicLoop = async (): Promise<boolean> => {
    if (!rawMelodicSampleTargetAdapter || !source || !selection || !rawSampleLengthOk) return false;
    return sendRawToAdapter(rawMelodicSampleTargetAdapter, {
      success: 'Das Roh-Sample wurde an Melodic Loop gesendet.',
      failure: 'Roh-Sample an Melodic Loop fehlgeschlagen.',
    }, effectiveLoopSampleTitle);
  };




  const detailVisibility = useMemo(() => {
    if (!selection) return { text: 'Noch keine Feinauswahl.' };
    const full = isRangeFullyVisible(selection.fineLoopRange, selection.detailViewport);
    const overlap = intersectRanges(selection.fineLoopRange, selection.detailViewport);
    if (full) return { text: 'Die untere Maske ist vollständig im aktuellen Sichtfenster.' };
    if (overlap) return { text: 'Die untere Maske bleibt erhalten und ragt teilweise über das aktuelle Sichtfenster hinaus.' };
    return { text: 'Die untere Maske ist gespeichert, liegt aber aktuell vollständig außerhalb des sichtbaren Detailfensters.' };
  }, [selection]);

  const handleChooseFile = () => {
    if (activeSourceAdapter?.canImportFile) fileInputRef.current?.click();
  };

  const candidateButtons = repairResult?.candidates ?? [];
  const viewportLabel = selection ? `${selection.detailViewport.startSec.toFixed(2)}s → ${rangeEnd(selection.detailViewport).toFixed(2)}s` : '–';
  const fineLabel = selection ? `${selection.fineLoopRange.startSec.toFixed(2)}s → ${rangeEnd(selection.fineLoopRange).toFixed(2)}s` : '–';

  return (
    <div ref={intakeGatewayRef} data-material-intake-gateway="true" data-cut-upload-entry-target="true" className="scroll-mt-3 border-t border-neutral-800 bg-neutral-950/80 p-3 text-xs text-neutral-300">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void runActionWithFeedback('load', () => loadSourceFromFile(file));
          event.currentTarget.value = '';
        }}
      />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Material Intake - Loop Gateway</div>
          <div className="mt-1 max-w-3xl text-[11px] leading-relaxed text-neutral-400">
            Mitte = ganze WAV und sichtbarer Arbeitsbereich. Unten = eigenständige Loopmaske. Die obere Maske darf verschoben werden, ohne die untere Auswahl zu löschen; übernommen wird erst die untere Maske.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sourceAdapterId}
            onChange={(event) => setSourceAdapterId(event.target.value)}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100"
          >
            {sourceAdapters.map((adapter) => (
              <option key={adapter.id} value={adapter.id}>{adapter.label}</option>
            ))}
          </select>
          <FeedbackButton
            tone="cyan"
            onClick={handleChooseFile}
            disabled={busy || !activeSourceAdapter?.canImportFile}
            pending={!!pendingMap.load}
            success={!!successMap.load}
            className="py-1.5"
          >
            {loadButtonLabel}
          </FeedbackButton>
          <select
            value={readMode}
            onChange={(event) => setReadMode(event.target.value as 'legacy' | 'transient' | 'hybrid')}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100"
            title="Legt fest, wie der übernommene Loop in die spektrale Werkbank projiziert wird."
          >
            <option value="legacy">Forge-Lesart: Legacy</option>
            <option value="transient">Forge-Lesart: Transient</option>
            <option value="hybrid">Forge-Lesart: Hybrid</option>
          </select>
        </div>
      </div>

      {!source && activeSourceAdapter?.unavailableReason && (
        <div className="mb-3 rounded border border-amber-900/40 bg-amber-950/15 px-3 py-2 text-[11px] text-amber-100/85">
          {activeSourceAdapter.unavailableReason}
        </div>
      )}

      {source ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>Gesamte Datei</span>
            <span>{source.label} · {source.durationSec.toFixed(2)}s</span>
          </div>
          <canvas
            ref={overviewRef}
            width={1200}
            height={102}
            className="w-full border border-neutral-800 bg-black"
            style={{ cursor: overviewCursor }}
            onPointerMove={updateOverviewCursor}
            onPointerLeave={resetOverviewCursor}
            onPointerDown={beginOverviewDrag}
          />
          <div className="grid gap-3 md:grid-cols-[11rem_11rem_minmax(0,1fr)]">
            <div>
              <div className="uppercase tracking-[0.2em] text-neutral-500">Sichtfenster</div>
              <div className="mt-1 rounded border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-neutral-100">{viewportLabel}</div>
            </div>
            <div>
              <div className="uppercase tracking-[0.2em] text-neutral-500">Feinauswahl</div>
              <div className="mt-1 rounded border border-neutral-800 bg-neutral-900/60 px-2 py-1 text-neutral-100">{fineLabel}</div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-[11px] text-neutral-400">
              Die obere Maske bestimmt nur, was unten vergrößert sichtbar wird. Die untere Maske ist der eigentliche Loop für Vorhörung, Reparatur, Rohsendung und Übernahme in die spektrale Forge-3-Arbeitsfläche.
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>Detailzoom / untere Maske bleibt eigenständig</span>
            <span>{detailVisibility.text}</span>
          </div>
          <canvas
            ref={detailRef}
            width={1200}
            height={124}
            className="w-full border border-neutral-800 bg-black"
            style={{ cursor: detailCursor }}
            onPointerMove={updateDetailCursor}
            onPointerLeave={resetDetailCursor}
            onPointerDown={beginDetailDrag}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              <span>Taktometer / Loop-Zuordnung</span>
              <span>Startkante der unteren Maske = 1 · sichtbarer Kontext bleibt am Detailfenster orientiert</span>
            </div>
            <canvas
              ref={playstripRef}
              width={1200}
              height={34}
              className="w-full border border-neutral-800 bg-black"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-stretch gap-2">
              <FeedbackButton
                tone="neutral"
                onClick={() => { void runActionWithFeedback('fit', () => fitViewportToFineLoop()); }}
                disabled={!selection || busy}
                pending={!!pendingMap.fit}
                success={!!successMap.fit}
                className="min-h-[5rem] min-w-[9.25rem] justify-center text-center"
              >
                Auswahl laden
              </FeedbackButton>
              <FeedbackButton
                tone="cyan"
                onClick={() => {
                  void runActionWithFeedback('repair', () => (hasRepairUndo ? undoRepairLoop() : repairLoop()));
                }}
                disabled={!selection || busy}
                pending={!!pendingMap.repair}
                success={!!successMap.repair}
                active={hasRepairUndo}
                className="min-h-[5rem] min-w-[10.5rem] justify-center text-center"
              >
                {hasRepairUndo ? 'Undo Loop korrigieren' : 'Loop korrigieren'}
              </FeedbackButton>
              <FeedbackButton
                tone="violet"
                onClick={() => { void runActionWithFeedback('commit', () => commitToTarget()); }}
                disabled={!selection || busy}
                pending={!!pendingMap.commit}
                success={!!successMap.commit}
                className="min-h-[5rem] min-w-[6.25rem] justify-center text-center"
              >
                Übernehmen
              </FeedbackButton>
              {onEmbodyTimbre ? (
                <FeedbackButton
                  tone="violet"
                  onClick={() => {
                    void runActionWithFeedback('embody-timbre', async () => {
                      const payload = buildCommittedPayload();
                      if (!payload || !onEmbodyTimbre) return false;
                      return await onEmbodyTimbre(payload);
                    });
                  }}
                  disabled={!selection || busy || !onEmbodyTimbre}
                  pending={!!pendingMap['embody-timbre']}
                  success={!!successMap['embody-timbre']}
                  className="min-h-[5rem] min-w-[11rem] justify-center text-center"
                >
                  Timbre extrahieren
                </FeedbackButton>
              ) : (
                <>
                  <FeedbackButton
                    tone="cyan"
                    onClick={() => {
                      void runActionWithFeedback('extract-timbre', async () => {
                        const payload = buildCommittedPayload();
                        if (!payload || !onExtractTimbre) return false;
                        return await onExtractTimbre(payload);
                      });
                    }}
                    disabled={!selection || busy || !onExtractTimbre}
                    pending={!!pendingMap['extract-timbre']}
                    success={!!successMap['extract-timbre']}
                    className="min-h-[5rem] min-w-[9rem] justify-center text-center"
                  >
                    Timbre extrahieren
                  </FeedbackButton>
                  <FeedbackButton
                    tone="violet"
                    onClick={() => {
                      void runActionWithFeedback('apply-timbre', async () => {
                        const payload = buildCommittedPayload();
                        if (!payload || !onApplyTimbre) return false;
                        return await onApplyTimbre(payload);
                      });
                    }}
                    disabled={!selection || busy || !onApplyTimbre}
                    pending={!!pendingMap['apply-timbre']}
                    success={!!successMap['apply-timbre']}
                    className="min-h-[5rem] min-w-[9rem] justify-center text-center"
                  >
                    Timbre anwenden
                  </FeedbackButton>
                </>
              )}
              <FeedbackButton
                tone="emerald"
                onClick={() => { void runActionWithFeedback('preview', () => togglePreview()); }}
                disabled={!selection || busy}
                active={previewPlaying}
                pending={!!pendingMap.preview}
                success={!!successMap.preview && !previewPlaying}
                className="min-h-[5rem] min-w-[6.5rem] justify-center text-center"
              >
                {previewPlaying ? 'Stop' : 'Loop hören'}
              </FeedbackButton>
              {rawTargetAdapter && (
                <FeedbackButton
                  tone="amber"
                  onClick={() => { void runActionWithFeedback('raw', () => sendRawToTarget(effectiveLoopSampleTitle)); }}
                  disabled={!selection || busy}
                  pending={!!pendingMap.raw}
                  success={!!successMap.raw}
                  className="min-h-[5rem] min-w-[11.25rem] justify-center text-center"
                >
                  Als Loop roh an die Materialspur (Hauptraum) senden
                </FeedbackButton>
              )}

              {rawMelodicPinkLaneTargetAdapter && (
                <FeedbackButton
                  tone="pink"
                  onClick={() => { void runActionWithFeedback('raw-melodic-pink', () => sendRawToMelodicPinkLane()); }}
                  disabled={!selection || busy}
                  pending={!!pendingMap['raw-melodic-pink']}
                  success={!!successMap['raw-melodic-pink']}
                  className="min-h-[5rem] min-w-[9.5rem] justify-center text-center"
                >
                  Als pinke Spur nach Melodic Loop senden
                </FeedbackButton>
              )}

              {rawRootFollowTargetAdapter && (
                <FeedbackButton
                  tone="violet"
                  onClick={() => { void runActionWithFeedback('raw-root-follow', () => sendRawRootFollowLoop()); }}
                  disabled={!selection || busy}
                  pending={!!pendingMap['raw-root-follow']}
                  success={!!successMap['raw-root-follow']}
                  className="min-h-[5rem] min-w-[6rem] justify-center text-center"
                >
                  Als Root-Follow-Loop verwenden
                </FeedbackButton>
              )}
            </div>

            <div className="grid gap-2 lg:grid-cols-[10rem_minmax(13rem,18rem)_minmax(12rem,18rem)_minmax(0,1fr)] lg:items-stretch">
              {rawMelodicSampleTargetAdapter && (
                <FeedbackButton
                  tone="violet"
                  onClick={() => { void runActionWithFeedback('raw-sample', () => sendRawSampleToMelodicLoop()); }}
                  disabled={!selection || busy || !rawSampleLengthOk}
                  pending={!!pendingMap['raw-sample']}
                  success={!!successMap['raw-sample']}
                  className={`min-h-[11.5rem] w-full justify-center text-center ${rawSampleLengthOk ? '' : 'opacity-60'}`}
                >
                  <span className="block leading-snug">
                    Als Sample speichern
                    <span className="mt-2 block text-[10px] leading-relaxed text-violet-100/65">(für Melodic Loop Komposition, Wellenstarter und Partikel)</span>
                  </span>
                </FeedbackButton>
              )}

              <label className="rounded border border-violet-900/50 bg-violet-950/15 px-3 py-2 text-[11px] text-violet-100/85">
                <span className="block uppercase tracking-[0.18em] text-violet-300/80">Loop/Sample betiteln</span>
                <input
                  value={loopSampleTitle}
                  onChange={(event) => setLoopSampleTitle(event.target.value)}
                  placeholder={deriveDefaultLoopSampleTitle(source)}
                  className="mt-2 w-full rounded border border-violet-800/70 bg-neutral-950 px-2 py-2 text-sm text-violet-50 outline-none focus:border-violet-500"
                />
                <span className="mt-2 block text-[10px] leading-relaxed text-violet-100/60">Dieser Titel wird für Materialspur, direkten Melodic-Loop-Pinkspur-Import, Root-Follow und Sample-Speichern der lila Maske verwendet.</span>
              </label>

              <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">
                <div>{status}</div>
                {timbreStatusLabel ? <div className="mt-1 text-cyan-300">Timbre: {timbreStatusLabel}</div> : null}
                {embodimentStatusLabel ? <div className="mt-1 text-violet-300">Verkörperung: {embodimentStatusLabel}</div> : null}
                {rawMelodicSampleTargetAdapter && selection ? (
                  <div className="mt-2 text-neutral-500">
                    Samples können in Melodic Loop komponiert oder als Wellenstarter- oder Partikel-Sound live improvisiert werden.
                  </div>
                ) : null}
              </div>

              {exportMeta && onMetaPatch ? (
                <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-300">
                  <div className="mb-2 uppercase tracking-[0.22em] text-neutral-500">Material-Metadaten (Archiv)</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-[11px] text-neutral-400 sm:col-span-2">
                      <span className="block uppercase tracking-[0.18em] text-neutral-500">Archiv-Materialname</span>
                      <input
                        value={exportMeta.name}
                        onChange={(event) => onMetaPatch({ name: event.target.value })}
                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-neutral-400 sm:col-span-2">
                      <span className="block uppercase tracking-[0.18em] text-neutral-500">Rolle</span>
                      <select
                        value={exportMeta.role}
                        onChange={(event) => onMetaPatch({ role: event.target.value as MaterialIntakeExportMeta['role'] })}
                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                      >
                        <option value="loop">Loop</option>
                        <option value="waveMaterial">Wellenstarter-Material</option>
                        <option value="particleExciter">Partikel-Exciter</option>
                        <option value="droneTexture">Drone-Textur</option>
                      </select>
                    </label>
                    <div className="space-y-1 text-[11px] text-neutral-400">
                      <span className="block uppercase tracking-[0.18em] text-neutral-500">Ursprüngliches Tempo</span>
                      <div className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-neutral-300">
                        {selection && exportMeta.bars > 0 && selection.fineLoopRange.durationSec > 0
                          ? `${((exportMeta.bars * 4 * 60) / Math.max(0.001, selection.fineLoopRange.durationSec)).toFixed(1)} BPM · aus ${exportMeta.bars} Takt(en) / ${selection.fineLoopRange.durationSec.toFixed(2)} s berechnet`
                          : 'Noch nicht berechnet'}
                      </div>
                    </div>
                    <label className="space-y-1 text-[11px] text-neutral-400">
                      <span className="block uppercase tracking-[0.18em] text-neutral-500">Anzahl Takte</span>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={exportMeta.bars}
                        onChange={(event) => onMetaPatch({ bars: Math.max(1, Math.min(16, Number(event.target.value) || 1)) })}
                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-neutral-400">
                      <span className="block uppercase tracking-[0.18em] text-neutral-500">Taktsegmente (Orientierungsmarker)</span>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={exportMeta.guideSegments}
                        onChange={(event) => onMetaPatch({ guideSegments: Math.max(1, Math.min(16, Number(event.target.value) || 1)) })}
                        className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {candidateButtons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-[11px] text-neutral-400">
              <span className="uppercase tracking-[0.2em] text-neutral-500">Alternative Taktdeutungen</span>
              {candidateButtons.map((candidate, index) => (
                <FeedbackButton
                  key={`${candidate.bars}-${index}`}
                  tone="neutral"
                  onClick={() => { void runActionWithFeedback(`candidate-${index}`, () => applyRepairCandidate(candidate)); }}
                  pending={!!pendingMap[`candidate-${index}`]}
                  success={!!successMap[`candidate-${index}`]}
                  className="px-2 py-1"
                >
                  {candidate.bars}T · {candidate.durationSec.toFixed(2)}s{candidate.fitScore != null ? ` · ${(candidate.fitScore * 100).toFixed(0)}%` : ''}
                </FeedbackButton>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded border border-neutral-800 bg-neutral-900/40 px-3 py-6 text-[11px] text-neutral-500">
          Lade eine Audioquelle, um oben einen großzügigen Sichtbereich und unten eine eigenständige Loopmaske aufzubauen. Der Fremdgerät-Slot ist bereits als Adapter-Platzhalter vorhanden.
        </div>
      )}
    </div>
  );
}
