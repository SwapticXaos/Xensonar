import { getModesForSystem, GRID_TUNING_OPTIONS } from '../xensonar/domain/instrumentData';
import { XENSONAR_VARIANTE_INSTALLATION_ACCESS_COPY, XENSONAR_VARIANTE_LABEL } from '../xensonar/family/refactor/refucktorPresentation';
import { resolveInstallationParticleMode } from './effectiveParticleMask';
import { MyzelRoom3SynthControls } from './MyzelRoom3SynthControls';
import type { MyzelTopologyPanelProps } from './myzelTopologyPanelTypes';
import type { ResidentSoundMenuGroup } from './residentSoundMenuModel';
import { RESIDENT_HZ_MAX, RESIDENT_HZ_MIN, residentSliderFromHz } from './residentTheory';

type Props = Pick<
  MyzelTopologyPanelProps,
  | 'installationFieldConfig'
  | 'particleSoundsMuted'
  | 'onToggleInstallNomadAttractor'
  | 'onToggleInstallResidents'
  | 'onSetInstallResidentVolume'
  | 'onSetInstallResidentSystem'
  | 'onSetInstallResidentMode'
  | 'onToggleInstallResidentWaveExcitation'
  | 'onToggleInstallResidentBallCoupling'
  | 'onSetParticleSoundMode'
  | 'onSetInstallationResidentSound'
  | 'onSetInstallationResidentElasticPitch'
  | 'customResidentSoundPreset'
  | 'customResidentElasticPitch'
  | 'onSetCustomResidentSound'
  | 'onSetCustomResidentElasticPitch'
  | 'onPreviewPendingCustomResident'
  | 'selectedResidentLabel'
  | 'selectedResidentFrequencyHz'
  | 'residentRootHz'
  | 'residentAddFrequencyHz'
  | 'onResidentAddFrequencySliderChange'
  | 'onAddResident'
  | 'residentConstellationName'
  | 'onResidentConstellationNameChange'
  | 'savedResidentConstellations'
  | 'onSaveResidentConstellation'
  | 'onLoadResidentConstellation'
  | 'onDeleteResidentConstellation'
  | 'onOpenClassicField'
  | 'onOpenRefactorField'
  | 'installationMix'
  | 'onInstallationMixChange'
  | 'tParams'
  | 'onTParamChange'
  | 'myzelCentralColorMixer'
  | 'onMyzelCentralColorMixerChange'
  | 'nodalDeviceMatrix'
  | 'onNodalDeviceEnabledChange'
  | 'onNodalDeviceAmountChange'
  | 'onNodalDeviceTargetChange'
> & {
  residentSoundMenuGroups: ResidentSoundMenuGroup[];
  residentWorkbenchSendConfirmed: boolean;
  onMarkResidentWorkbenchSent: () => void;
};

export function MyzelInstallationControls(props: Props) {
  const {
    installationFieldConfig,
    particleSoundsMuted,
    onToggleInstallNomadAttractor,
    onToggleInstallResidents,
    onSetInstallResidentVolume,
    onSetInstallResidentSystem,
    onSetInstallResidentMode,
    onToggleInstallResidentWaveExcitation,
    onToggleInstallResidentBallCoupling,
    onSetParticleSoundMode,
    onSetInstallationResidentSound,
    onSetInstallationResidentElasticPitch,
    customResidentSoundPreset,
    customResidentElasticPitch,
    onSetCustomResidentSound,
    onSetCustomResidentElasticPitch,
    onPreviewPendingCustomResident,
    selectedResidentLabel,
    selectedResidentFrequencyHz,
    residentRootHz,
    residentAddFrequencyHz,
    onResidentAddFrequencySliderChange,
    onAddResident,
    residentConstellationName,
    onResidentConstellationNameChange,
    savedResidentConstellations,
    onSaveResidentConstellation,
    onLoadResidentConstellation,
    onDeleteResidentConstellation,
    onOpenClassicField,
    onOpenRefactorField,
    installationMix,
    onInstallationMixChange,
    tParams,
    onTParamChange,
    myzelCentralColorMixer,
    onMyzelCentralColorMixerChange,
    nodalDeviceMatrix,
    onNodalDeviceEnabledChange,
    onNodalDeviceAmountChange,
    onNodalDeviceTargetChange,
    residentSoundMenuGroups,
    residentWorkbenchSendConfirmed,
    onMarkResidentWorkbenchSent,
  } = props;

  const particleSoundMode = resolveInstallationParticleMode(particleSoundsMuted);
  const residentAddFrequencySlider = residentSliderFromHz(residentAddFrequencyHz);

  return (
    <>
      <div className="mt-4 rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-neutral-300">
        <div className="text-[10px] uppercase tracking-[0.24em] text-amber-300">Kunst-Installation · Feldzugänge</div>
        <div className="mt-2 text-neutral-400">{XENSONAR_VARIANTE_INSTALLATION_ACCESS_COPY}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button type="button" onClick={onOpenClassicField} className="rounded border border-violet-700/60 bg-violet-950/20 px-4 py-3 text-sm font-semibold text-violet-100 hover:bg-violet-900/40">Xensonar Classic</button>
          <button type="button" onClick={onOpenRefactorField} className="rounded border border-cyan-700/60 bg-cyan-950/20 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-900/40">{XENSONAR_VARIANTE_LABEL}</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-xs text-neutral-400">
            <span className="mb-1 block text-neutral-500">Resident-Lautstärke {(installationFieldConfig.residentVolume * 100).toFixed(0)}%</span>
            <input type="range" min="0" max="1" step="0.01" value={installationFieldConfig.residentVolume} onChange={(event) => onSetInstallResidentVolume(parseFloat(event.target.value))} className="w-full cursor-pointer" />
          </label>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Resident System</label>
            <select value={installationFieldConfig.residentSystem} onChange={(event) => onSetInstallResidentSystem(event.target.value as typeof installationFieldConfig.residentSystem)} className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200">
              {GRID_TUNING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Resident Modus</label>
            <select value={installationFieldConfig.residentMode} onChange={(event) => onSetInstallResidentMode(event.target.value as typeof installationFieldConfig.residentMode)} className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200">
              {getModesForSystem(installationFieldConfig.residentSystem).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <input type="checkbox" checked={installationFieldConfig.residentsEnabled} onChange={onToggleInstallResidents} />
            Residents an / aus
          </label>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Nomad Attractors</div>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <input type="checkbox" checked={installationFieldConfig.nomadAttractors.cursor} onChange={() => onToggleInstallNomadAttractor('cursor')} />
            Cursor
          </label>
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <input type="checkbox" checked={installationFieldConfig.nomadAttractors.oscillatorBall} onChange={() => onToggleInstallNomadAttractor('oscillatorBall')} />
            Oszillator Ball
          </label>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Resident Reactions</div>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <input type="checkbox" checked={installationFieldConfig.residentWaveExcitation.sonarWaves} onChange={() => onToggleInstallResidentWaveExcitation('sonarWaves')} />
            Sonar-Wellen
          </label>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Resident Coupling</div>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <input type="checkbox" checked={installationFieldConfig.residentBallCoupling.oscillatorBall} onChange={() => onToggleInstallResidentBallCoupling('oscillatorBall')} />
            Oszillator Ball
          </label>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Partikelmodus</div>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <span className="text-neutral-400">Partikel</span>
            <select value={particleSoundMode} onChange={(event) => onSetParticleSoundMode(event.target.value as typeof particleSoundMode)} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200">
              <option value="normal">Normal</option>
              <option value="all_off">Alle aus</option>
            </select>
          </label>
        </div>

        <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Resident System Sound</div>
        <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
            <span className="text-neutral-400">System-Residents</span>
            <select value={installationFieldConfig.residentSound} onChange={(event) => onSetInstallationResidentSound(event.target.value as typeof installationFieldConfig.residentSound)} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200">
              {residentSoundMenuGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded border border-cyan-900/35 bg-cyan-950/10 px-3 py-2 text-xs text-cyan-100">
            <input
              type="checkbox"
              checked={!!installationFieldConfig.residentElasticPitch}
              onChange={(event) => onSetInstallationResidentElasticPitch(event.target.checked)}
              disabled={!String(installationFieldConfig.residentSound).startsWith('sample:')}
            />
            Pitch stabil / Tempo frei
          </label>
        </div>
        <div className="mt-2 text-[11px] text-neutral-500">Der Resident System Sound wirkt sofort auf alle systemischen Residents der aktuellen Konstellation. Die Option Pitch stabil / Tempo frei greift nur bei Samples und nutzt dort die elastische Resident-Wiedergabe. Custom Residents können beim Anlegen ihren eigenen Klang behalten.</div>

        <div className="mt-5 rounded border border-neutral-800 bg-black/25 p-3">
          <div className="mb-3 text-[11px] text-neutral-500">Rechtsklick auf einen Resident im Canvas: Resident löschen. Im Hauptraum bleibt Rechtsklick weiter Echo An/Aus.</div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Custom Residents</div>
              <div className="mt-1 text-xs leading-relaxed text-neutral-400">Hz-Spektrum als Werkbank-Grundlage: Frequenz direkt setzen und per Button als neuen sesshaften Klangkörper in die Werkbank-Reihe oben rechts senden.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onAddResident();
                onMarkResidentWorkbenchSent();
              }}
              className="rounded border border-emerald-700/60 bg-emerald-950/25 px-4 py-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
            >
              In Werkbank senden{residentWorkbenchSendConfirmed ? ' ⤴️✅' : ''}
            </button>
          </div>

          <div className="mt-3 rounded border border-fuchsia-900/35 bg-fuchsia-950/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-300">Hz-Werkbank</div>
                <div className="mt-1 text-sm text-neutral-200">Neuer Custom Resident: {residentAddFrequencyHz.toFixed(1)} Hz</div>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="text-neutral-500">Hz</span>
                <input
                  type="number"
                  min={RESIDENT_HZ_MIN}
                  max={RESIDENT_HZ_MAX}
                  step="0.1"
                  value={residentAddFrequencyHz.toFixed(1)}
                  onChange={(event) => {
                    const next = parseFloat(event.target.value);
                    if (Number.isFinite(next)) onResidentAddFrequencySliderChange(residentSliderFromHz(next));
                  }}
                  className="w-28 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                />
              </label>
            </div>
            <label className="mt-4 block text-xs text-neutral-300">
              <span className="mb-2 block text-neutral-500">Direktes Hz-Spektrum für neue sesshafte Klangkörper</span>
              <input type="range" min="0" max="1" step="0.001" value={residentAddFrequencySlider} onChange={(event) => onResidentAddFrequencySliderChange(parseFloat(event.target.value))} className="block w-full cursor-pointer accent-fuchsia-400" style={{ height: '2.5rem' }} />
              <span className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                <span>{RESIDENT_HZ_MIN.toFixed(0)} Hz</span>
                <span>logarithmische Auflösung</span>
                <span>{RESIDENT_HZ_MAX.toFixed(0)} Hz</span>
              </span>
            </label>
            <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Custom Resident Sound</div>
            <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="grid gap-3">
                <label className="flex items-center gap-2 rounded border border-neutral-800 bg-black/30 px-3 py-2 text-sm text-neutral-300">
                  <span className="text-neutral-400">Neuer Custom Resident</span>
                  <select value={customResidentSoundPreset} onChange={(event) => onSetCustomResidentSound(event.target.value as typeof customResidentSoundPreset)} className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200">
                    {residentSoundMenuGroups.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded border border-cyan-900/35 bg-cyan-950/10 px-3 py-2 text-xs text-cyan-100">
                  <input
                    type="checkbox"
                    checked={!!customResidentElasticPitch}
                    onChange={(event) => onSetCustomResidentElasticPitch(event.target.checked)}
                    disabled={!String(customResidentSoundPreset).startsWith('sample:')}
                  />
                  Pitch stabil / Tempo frei
                </label>
              </div>
              <button type="button" onClick={onPreviewPendingCustomResident} className="rounded border border-fuchsia-700/60 bg-fuchsia-950/25 px-4 py-3 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-900/40">Resident vorhören</button>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500">Dieses Menü gilt nur für den einen Custom Resident, den du gerade über die Hz-Werkbank vorbereitest. Beim Hinzufügen behält er diesen Klang in der laufenden Sitzung und in gespeicherten Konstellationen. Die Pitch-stabile Option greift nur bei Samples.</div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="text-xs leading-relaxed text-neutral-400">Custom Residents beziehen sich direkt auf Hz. Root, System und Modus deuten die System-Residents darüber. Das Vorhören richtet sich hier immer auf den gerade vorbereiteten neuen Resident.</div>
              <div className="rounded border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-400">Neue Custom Residents erscheinen oben rechts als Reihe und können von dort frei ins Feld gezogen oder in Konstellationen gespeichert werden.</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-300">
              <div className="text-neutral-500">Werkbank-Status</div>
              <div className="mt-1 text-sm text-neutral-100">{selectedResidentLabel ?? 'Noch nichts ausgewählt'}</div>
              <div className="mt-1 text-[11px] text-neutral-500">Aktive Root {residentRootHz.toFixed(1)} Hz</div>
              <div className="mt-1 text-[11px] text-neutral-500">{selectedResidentFrequencyHz ? `Gewählter Resident ${selectedResidentFrequencyHz.toFixed(1)} Hz` : 'Resident im Canvas anklicken, ziehen oder per Rechtsklick löschen.'}</div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
              <div className="text-neutral-500">Systemische Residents</div>
              <div className="mt-1 leading-relaxed">Resident System verteilt Root plus Tonschritte über das bestehende Node-System. Resident Modus legt darauf nur Mute-Pattern und dunkelt stumme Nodes leicht ab.</div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
              <div className="text-neutral-500">Custom Residents</div>
              <div className="mt-1 leading-relaxed">Im Canvas kann dann einfach Custom oder die Hz-Zahl stehen statt Root, Zahl oder Bruch. Die Frequenz bleibt die tiefere Wahrheit darunter.</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_auto]">
            <label className="block text-xs text-neutral-400">
              <span className="mb-1 block text-neutral-500">Resident-Konstellation</span>
              <input value={residentConstellationName} onChange={(event) => onResidentConstellationNameChange(event.target.value)} className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-200" />
            </label>
            <button type="button" onClick={onSaveResidentConstellation} className="self-end rounded border border-amber-700/60 bg-amber-950/25 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900/40">Konstellation speichern</button>
          </div>

          <div className="mt-4 grid gap-2">
            {savedResidentConstellations.length === 0 ? (
              <div className="text-xs text-neutral-500">Noch keine gespeicherten Resident-Konstellationen.</div>
            ) : savedResidentConstellations.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950/35 px-3 py-2 text-xs">
                <div>
                  <div className="text-neutral-100">{entry.name}</div>
                  <div className="text-neutral-500">{new Date(entry.createdAt).toLocaleString('de-DE')}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onLoadResidentConstellation(entry.id)} className="rounded border border-cyan-700/60 bg-cyan-950/20 px-2 py-1 text-cyan-100 hover:bg-cyan-900/35">Laden</button>
                  <button type="button" onClick={() => onDeleteResidentConstellation(entry.id)} className="rounded border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-900">Entfernen</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Ball-Lautheit {(installationMix.ballLevel * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={installationMix.ballLevel} onChange={(event) => onInstallationMixChange('ballLevel', parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Node-Nachklang {(installationMix.decay * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={installationMix.decay} onChange={(event) => onInstallationMixChange('decay', parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Layer-Slimness {(tParams.slimLayers * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={tParams.slimLayers} onChange={(event) => onTParamChange('slimLayers', parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
        <label className="block text-xs text-neutral-400">
          <span className="mb-1 block text-neutral-500">Drift / Rauheit {(tParams.rawReality * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={tParams.rawReality} onChange={(event) => onTParamChange('rawReality', parseFloat(event.target.value))} className="w-full cursor-pointer" />
        </label>
      </div>

      <MyzelRoom3SynthControls
        myzelCentralColorMixer={myzelCentralColorMixer}
        onMyzelCentralColorMixerChange={onMyzelCentralColorMixerChange}
        nodalDeviceMatrix={nodalDeviceMatrix}
        onNodalDeviceEnabledChange={onNodalDeviceEnabledChange}
        onNodalDeviceAmountChange={onNodalDeviceAmountChange}
        onNodalDeviceTargetChange={onNodalDeviceTargetChange}
        compact
      />
    </>
  );
}
