import { useState } from 'react';
import type { MyzelCentralColorMixer } from '../resonance/myzelCentralColorMixer';
import {
  NODAL_DEVICE_DEFINITIONS,
  NODAL_TARGET_DEFINITIONS,
  type NodalDeviceId,
  type NodalDeviceMatrix,
  type NodalTargetId,
} from '../resonance/nodalDeviceMatrix';
import {
  DEFAULT_NODAL_MOD_ROUTES,
  NODAL_MOD_SOURCE_LABELS,
  NODAL_MOD_TARGET_LABELS,
} from '../resonance/nodalModulationMatrix';
import {
  DEFAULT_TOPOLOGY_VIEW_FOCUS,
  TOPOLOGY_VIEW_FOCUS_OPTIONS,
  type TopologyViewFocus,
} from './topologyViewFocus';

export type MyzelRoom3SynthControlsProps = {
  myzelCentralColorMixer: MyzelCentralColorMixer;
  onMyzelCentralColorMixerChange: (field: keyof MyzelCentralColorMixer, value: number | boolean) => void;
  nodalDeviceMatrix: NodalDeviceMatrix;
  onNodalDeviceEnabledChange: (device: NodalDeviceId, enabled: boolean) => void;
  onNodalDeviceAmountChange: (device: NodalDeviceId, value: number) => void;
  onNodalDeviceTargetChange: (device: NodalDeviceId, target: NodalTargetId, value: number) => void;
  compact?: boolean;
};

const colorMixerControls: ReadonlyArray<{
  field: keyof MyzelCentralColorMixer;
  label: string;
  max?: number;
}> = [
  { field: 'volume', label: 'Lautstärke', max: 1.5 },
  { field: 'carrier', label: 'Träger' },
  { field: 'sub', label: 'Sub' },
  { field: 'formant', label: 'Formant' },
  { field: 'overtone', label: 'Obertöne' },
  { field: 'drive', label: 'Drive' },
  { field: 'air', label: 'Air' },
];

export function MyzelRoom3SynthControls({
  myzelCentralColorMixer,
  onMyzelCentralColorMixerChange,
  nodalDeviceMatrix,
  onNodalDeviceEnabledChange,
  onNodalDeviceAmountChange,
  onNodalDeviceTargetChange,
  compact = false,
}: MyzelRoom3SynthControlsProps) {
  const [viewFocus, setViewFocus] = useState<TopologyViewFocus>(DEFAULT_TOPOLOGY_VIEW_FOCUS);
  const activeViewFocus = TOPOLOGY_VIEW_FOCUS_OPTIONS.find((option) => option.value === viewFocus) ?? TOPOLOGY_VIEW_FOCUS_OPTIONS[0];
  const activeNodalTargets = NODAL_TARGET_DEFINITIONS.filter((target) => target.active);
  const preparedNodalTargets = NODAL_TARGET_DEFINITIONS.filter((target) => !target.active);

  return (
    <div className="mt-4 space-y-4" data-xensonar-room3-synth-controls="modular">
      <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          <span>Raum-III Fokus</span>
          <span className="text-neutral-600">{activeViewFocus.hint}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {TOPOLOGY_VIEW_FOCUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setViewFocus(option.value)}
              className={`rounded border px-3 py-2 text-xs font-semibold tracking-[0.08em] transition-colors ${viewFocus === option.value ? 'border-cyan-400/70 bg-cyan-950/30 text-cyan-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border border-violet-900/60 bg-violet-950/10 p-3" data-xensonar-room3-synth-section="central-color-voice">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-violet-900/40 pb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-violet-300/80">Myzel-Farbstimme</div>
            <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">modularer Raum-III-Synth-Mischer, nicht App.tsx-AudioGraph</div>
          </div>
          <button
            type="button"
            onClick={() => onMyzelCentralColorMixerChange('enabled', !myzelCentralColorMixer.enabled)}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${myzelCentralColorMixer.enabled ? 'border-violet-400/70 text-violet-100 bg-violet-950/30 hover:bg-violet-900/40' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
          >
            {myzelCentralColorMixer.enabled ? 'An' : 'Aus'}
          </button>
        </div>
        <div className={`grid gap-4 ${compact ? 'md:grid-cols-4 xl:grid-cols-7' : 'md:grid-cols-4 xl:grid-cols-7'}`}>
          {colorMixerControls.map((control) => {
            const value = Number(myzelCentralColorMixer[control.field] ?? 0);
            return (
              <label key={control.field} className="block text-xs text-neutral-400">
                <span className="mb-1 block text-neutral-500">{control.label} {(value * 100).toFixed(0)}%</span>
                <input
                  type="range"
                  min="0"
                  max={String(control.max ?? 1)}
                  step="0.01"
                  value={value}
                  onChange={(event) => onMyzelCentralColorMixerChange(control.field, parseFloat(event.target.value))}
                  className="w-full cursor-pointer"
                  disabled={!myzelCentralColorMixer.enabled && control.field !== 'volume'}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-cyan-900/55 bg-cyan-950/10 p-3" data-xensonar-room3-synth-section="nodal-device-matrix">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Raum-III-Feldgeräte</div>
            <div className="mt-1 text-[11px] text-neutral-500">Ziele statt Mastering-Grenze</div>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {NODAL_DEVICE_DEFINITIONS.map((device) => {
            const entry = nodalDeviceMatrix[device.id];
            return (
              <div key={device.id} className="rounded border border-neutral-800 bg-neutral-950/45 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-cyan-100">{device.label}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">{device.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNodalDeviceEnabledChange(device.id, !entry.enabled)}
                    className={`rounded border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors ${entry.enabled ? 'border-cyan-400/60 bg-cyan-950/30 text-cyan-100' : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'}`}
                  >
                    {entry.enabled ? 'An' : 'Aus'}
                  </button>
                </div>
                <label className="mt-3 block text-[11px] text-neutral-400">
                  <span className="mb-1 block text-neutral-500">Stärke {(entry.amount * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={entry.amount}
                    onChange={(event) => onNodalDeviceAmountChange(device.id, parseFloat(event.target.value))}
                    className="w-full cursor-pointer"
                    disabled={!entry.enabled}
                  />
                </label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeNodalTargets.map((target) => (
                    <label key={target.id} className="block text-[10px] text-neutral-400">
                      <span className="mb-1 flex items-center justify-between gap-2 text-neutral-500">
                        <span>{target.shortLabel}</span>
                        <span>{((entry.targets[target.id] ?? 0) * 100).toFixed(0)}%</span>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={entry.targets[target.id] ?? 0}
                        onChange={(event) => onNodalDeviceTargetChange(device.id, target.id, parseFloat(event.target.value))}
                        className="w-full cursor-pointer"
                        disabled={!entry.enabled}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-neutral-500">
                  {preparedNodalTargets.map((target) => (
                    <span key={target.id} className="rounded border border-neutral-800 px-2 py-1">
                      {target.shortLabel} vorbereitet {Math.round((entry.targets[target.id] ?? 0) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-fuchsia-900/55 bg-fuchsia-950/10 p-3" data-xensonar-room3-synth-section="nodal-modulation-matrix">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-fuchsia-900/40 pb-2">
          <div className="text-[10px] uppercase tracking-[0.24em] text-fuchsia-300/80">Nodal-Modulationsmatrix</div>
          <div className="text-[11px] text-neutral-500">sichere Standard-Routen</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {DEFAULT_NODAL_MOD_ROUTES.map((route) => (
            <div key={route.id} className="rounded border border-neutral-800 bg-neutral-950/45 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-fuchsia-100">{route.label}</div>
                <div className="text-[10px] text-neutral-500">{Math.round(route.amount * 100)}%</div>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                {NODAL_MOD_SOURCE_LABELS[route.source]} → {NODAL_MOD_TARGET_LABELS[route.target]} · {route.curve} · {route.smoothingMs}ms
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
