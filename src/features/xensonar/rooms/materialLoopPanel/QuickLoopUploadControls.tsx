import { useRef, useState } from 'react';
import { AUDIO_CUT_UPLOAD_SOURCES, type AudioCutUploadSource } from '../../domain/audioCutUploadEntryRequest';

export function QuickLoopUploadControls({
  tone,
  onLoopUploadFile,
  onAudioUploadAndCutFile,
}: {
  tone: 'material' | 'root-follow';
  onLoopUploadFile: (file: File, bars: number) => Promise<void> | void;
  onAudioUploadAndCutFile: (file: File, source: AudioCutUploadSource) => void;
}) {
  const loopInputRef = useRef<HTMLInputElement | null>(null);
  const cutInputRef = useRef<HTMLInputElement | null>(null);
  const [bars, setBars] = useState(4);
  const border = tone === 'root-follow' ? 'border-violet-900/50 bg-violet-950/10' : 'border-neutral-800 bg-neutral-950/70';
  const label = tone === 'root-follow' ? 'Root-Follow-Loop Upload' : 'Loop Upload';
  const cutUploadSource = tone === 'root-follow' ? AUDIO_CUT_UPLOAD_SOURCES.ROOT_FOLLOW_MANAGER : AUDIO_CUT_UPLOAD_SOURCES.MATERIAL_TRACK_MANAGER;
  return (
    <div className={`rounded border ${border} p-2 text-[11px]`}>
      <input ref={loopInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        event.currentTarget.value = '';
        if (file) void onLoopUploadFile(file, bars);
      }} />
      <input ref={cutInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        event.currentTarget.value = '';
        if (file) onAudioUploadAndCutFile(file, cutUploadSource);
      }} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-neutral-400">
          <span className="uppercase tracking-widest text-neutral-500">Takte</span>
          <input type="number" min={1} max={64} step={1} value={bars} onChange={(event) => setBars(Math.max(1, Math.min(64, Math.round(Number(event.target.value) || 1))))} className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100" />
        </label>
        <button type="button" onClick={() => loopInputRef.current?.click()} className="rounded border border-cyan-800/80 px-2 py-1 text-cyan-100 hover:bg-cyan-950/30">{label}</button>
        <button type="button" onClick={() => cutInputRef.current?.click()} className="rounded border border-amber-800/80 px-2 py-1 text-amber-100 hover:bg-amber-950/30">Audio Upload und Schneiden</button>
      </div>
    </div>
  );
}
