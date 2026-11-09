import { useEffect, useState } from "react";
import type { RecordingExportScope, RecordingState } from "../domain/runtimeTypes";
import type { RecordingTakePanelProps } from "../recording/recordingTakePanelContracts";
import { MASTER_RECORDING_RACK_ATTR } from "../recording/recordingRackScrollBridge";

export function RecordingTakePanel({
  recordingSourceMode,
  setRecordingSourceMode,
  recordingState,
  stopRecording,
  startRecording,
  formatDuration,
  addRecordingMarker,
  setRecordingState,
  recordingMarkers,
  maxRecordingMs,
  downloadRecordingWav,
  downloadRecordingCropWav,
  sendRecordingToMaterialForge,
  recordingCrop,
  recordingPreviewUrl,
  recordingPreviewAudioRef,
  recordingTimelineRef,
  handleTimelinePointerDown,
  recordingWaveform,
  recordingCropDraft,
  recordingPlayheadMs,
}: RecordingTakePanelProps) {
  const [exportScope, setExportScope] = useState<RecordingExportScope>("full");
  const cropAvailable = !!recordingCrop;
  const canExportSelected = recordingState.hasTake && (exportScope === "full" || cropAvailable);

  useEffect(() => {
    if (exportScope === "crop" && !cropAvailable) setExportScope("full");
  }, [cropAvailable, exportScope]);

  const downloadSelectedExport = () => {
    if (exportScope === "crop") {
      if (!cropAvailable) return;
      downloadRecordingCropWav();
      return;
    }
    downloadRecordingWav();
  };

  const sendSelectedExportToMaterialForge = () => {
    if (exportScope === "crop" && !cropAvailable) return;
    sendRecordingToMaterialForge(exportScope);
  };

  return (
    <div {...{ [MASTER_RECORDING_RACK_ATTR]: "true" }} className="mt-4 bg-neutral-900/50 p-4 border border-neutral-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3 border-b border-neutral-800 pb-1">
        <div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Master Aufnahme (WAV)</div>
          <div className="text-sm text-neutral-400">Nimmt den aktuellen Gesamtmix auf (max. 15 Minuten) auf. Waehrenddessen setzen F9, das Logo oder die grossen Flaechen links/rechts neben dem Panel gruene Marker.</div>
          <div className="mt-2 text-[11px] text-neutral-500">{recordingSourceMode === "without_drums" ? "Aufnahmequelle: Mix ohne Drums, Live-Drums bleiben hoerbar." : "Aufnahmequelle: kompletter Mix inklusive Drums."}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-1">
            <span className="px-1 text-[10px] uppercase tracking-widest text-neutral-500">Drums im Take</span>
            <button
              type="button"
              onClick={() => setRecordingSourceMode("with_drums")}
              disabled={recordingState.isRecording}
              className={`px-2 py-1 text-xs border ${recordingSourceMode === "with_drums" ? "border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-100" : "border-neutral-800 text-neutral-400"} ${recordingState.isRecording ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              mit
            </button>
            <button
              type="button"
              onClick={() => setRecordingSourceMode("without_drums")}
              disabled={recordingState.isRecording}
              className={`px-2 py-1 text-xs border ${recordingSourceMode === "without_drums" ? "border-emerald-500 bg-emerald-950/40 text-emerald-100" : "border-neutral-800 text-neutral-400"} ${recordingState.isRecording ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              ohne
            </button>
          </div>
          <button
            onClick={() => { if (recordingState.isRecording) stopRecording(); else void startRecording(); }}
            className={`px-3 py-1.5 border text-sm ${recordingState.isRecording ? "border-red-500 bg-red-950/50 text-red-100" : "border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-100"}`}
          >
            {recordingState.isRecording ? `Stop (${formatDuration(recordingState.durationMs)})` : "Rec"}
          </button>
          <button
            onClick={() => addRecordingMarker("logo")}
            disabled={!recordingState.isRecording}
            className={`px-3 py-1.5 border text-sm ${recordingState.isRecording ? "border-emerald-500 bg-emerald-950/40 text-emerald-100" : "border-neutral-800 text-neutral-600 cursor-not-allowed"}`}
          >
            marker (F9 / Rand)
          </button>
          <input
            value={recordingState.filenameBase}
            onChange={(e) => setRecordingState((prev: RecordingState) => ({ ...prev, filenameBase: e.target.value || "xensonar-take" }))}
            className="bg-neutral-950 border border-neutral-700 px-2 py-1 text-sm text-neutral-200"
            placeholder="Dateiname"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-neutral-300">
            {recordingState.hasTake ? `Take: ${formatDuration(recordingState.durationMs)} · Marker: ${recordingMarkers.length}` : recordingState.isRecording ? `Aufnahme laeuft: ${formatDuration(recordingState.durationMs)} / ${formatDuration(maxRecordingMs)}` : "Noch keine Take"}
            <div className={`text-xs mt-1 ${recordingState.exportStatus === "error" ? "text-red-300" : recordingState.exportStatus === "ready" ? "text-emerald-300" : "text-neutral-500"}`}>
              {recordingState.exportMessage || "Recorder bereit."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-800 bg-neutral-950/45 p-2">
            <span className="px-1 text-[10px] uppercase tracking-widest text-neutral-500">Export:</span>
            <div className="flex items-center gap-1 rounded border border-neutral-800 bg-neutral-950/70 p-1">
              <button
                type="button"
                onClick={() => setExportScope("full")}
                disabled={!recordingState.hasTake}
                className={`px-2 py-1 text-xs border ${exportScope === "full" ? "border-cyan-500 bg-cyan-950/40 text-cyan-100" : "border-neutral-800 text-neutral-400"} ${!recordingState.hasTake ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setExportScope("crop")}
                disabled={!recordingState.hasTake || !cropAvailable}
                className={`px-2 py-1 text-xs border ${exportScope === "crop" ? "border-emerald-500 bg-emerald-950/40 text-emerald-100" : "border-neutral-800 text-neutral-400"} ${!recordingState.hasTake || !cropAvailable ? "opacity-60 cursor-not-allowed" : ""}`}
                title={cropAvailable ? "Crop exportieren" : "Erst einen Crop in der Take-Leiste setzen"}
              >
                Crop
              </button>
            </div>
            <button
              type="button"
              onClick={downloadSelectedExport}
              disabled={!canExportSelected}
              className="px-3 py-1.5 border border-neutral-700 text-neutral-200 disabled:text-neutral-600 disabled:border-neutral-800 hover:bg-neutral-800"
              title={exportScope === "crop" ? "Crop herunterladen" : "Ganzen Take herunterladen"}
            >
              ⤓ Download
            </button>
            <button
              type="button"
              onClick={sendSelectedExportToMaterialForge}
              disabled={!canExportSelected}
              className="px-3 py-1.5 border border-amber-700/80 text-amber-100 disabled:text-neutral-600 disabled:border-neutral-800 hover:bg-amber-950/35"
              title={exportScope === "crop" ? "Crop zur Materialschmiede senden" : "Ganzen Take zur Materialschmiede senden"}
            >
              ➔ Materialschmiede
            </button>
          </div>
        </div>

        {recordingState.hasTake && recordingPreviewUrl && (
          <div className="flex flex-col gap-3">
            <audio ref={recordingPreviewAudioRef} src={recordingPreviewUrl} controls className="w-full h-10" />
            <div
              ref={recordingTimelineRef}
              onMouseDown={handleTimelinePointerDown}
              className="w-full h-28 border border-neutral-800 bg-black/70 cursor-crosshair select-none relative"
              title="Klick & Ziehen = Crop-Auswahl. Klick = Abspielposition setzen."
            >
              <svg viewBox={`0 0 ${Math.max(1, recordingWaveform.length)} 100`} preserveAspectRatio="none" className="w-full h-full block">
                <rect x="0" y="0" width={Math.max(1, recordingWaveform.length)} height="100" fill="rgba(0,0,0,0.82)" />
                {(() => {
                  const activeCrop = recordingCropDraft ?? recordingCrop;
                  if (!activeCrop || !recordingState.durationMs) return null;
                  const x = (activeCrop.startMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length);
                  const w = ((activeCrop.endMs - activeCrop.startMs) / recordingState.durationMs) * Math.max(1, recordingWaveform.length);
                  return <rect x={x} y={0} width={Math.max(1, w)} height={100} fill="rgba(52, 211, 153, 0.18)" stroke="rgba(52, 211, 153, 0.75)" strokeWidth={1} />;
                })()}
                {recordingWaveform.map((peak, i) => {
                  const height = Math.max(1, peak * 42);
                  const y1 = 50 - height;
                  const y2 = 50 + height;
                  return <line key={`wf-${i}`} x1={i + 0.5} y1={y1} x2={i + 0.5} y2={y2} stroke="rgba(216, 180, 254, 0.75)" strokeWidth={0.9} />;
                })}
                {recordingMarkers.map((marker) => {
                  const x = recordingState.durationMs ? (marker.timeMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length) : 0;
                  return <line key={marker.id} x1={x} y1={0} x2={x} y2={100} stroke={marker.usedInCrop ? "rgba(96,165,250,0.9)" : "rgba(74, 222, 128, 0.95)"} strokeWidth={2.2} />;
                })}
                {recordingState.durationMs > 0 && (
                  <line
                    x1={(recordingPlayheadMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length)}
                    y1={0}
                    x2={(recordingPlayheadMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length)}
                    y2={100}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={1.6}
                  />
                )}
              </svg>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-neutral-500">
              <div>Gruene Striche = Marker (F9 / Logo / linke oder rechte Aussenflaeche), Blau = Marker liegt bereits in einem exportierten Crop.</div>
              <div>
                {recordingCrop ? `Crop: ${formatDuration(recordingCrop.startMs)} - ${formatDuration(recordingCrop.endMs)} (${formatDuration(recordingCrop.endMs - recordingCrop.startMs)})` : "Klick & Ziehen in die Leiste, um einen Crop-Bereich zu setzen."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
