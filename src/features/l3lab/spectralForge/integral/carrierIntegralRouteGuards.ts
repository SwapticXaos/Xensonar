import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import { resolveCarrierIntegralSendContract } from './carrierIntegralSendTargets';
import { buildCarrierIntegralRouteSignature, resolveCarrierIntegralMachine } from './carrierIntegralRegistry';

export type CarrierIntegralRouteGuardFinding = {
  level: 'ok' | 'warning' | 'error';
  code: string;
  message: string;
};

export function inspectCarrierIntegralRouteSeparation(machineIds: CarrierIntegralMachineId[]): CarrierIntegralRouteGuardFinding[] {
  const findings: CarrierIntegralRouteGuardFinding[] = [];
  const signatures = machineIds.map((machineId) => ({ machineId, signature: buildCarrierIntegralRouteSignature({ machineId }) }));

  const b573 = signatures.find((entry) => entry.machineId === 'branch-b573-synth-window');
  const c = signatures.find((entry) => entry.machineId === 'branch-c-interval-body');
  const material = signatures.find((entry) => entry.machineId === 'material-render-body');
  const legacy = signatures.find((entry) => entry.machineId === 'legacy-supernote-5.69');
  const raw = signatures.find((entry) => entry.machineId === 'raw-darkpsy-oscillator');

  if (b573 && c && b573.signature.antiBurstStrategy === c.signature.antiBurstStrategy) {
    findings.push({ level: 'error', code: 'b573-c-collapsed', message: 'B_5.73 und C dürfen nicht dieselbe Anti-Burst-Strategie teilen.' });
  } else {
    findings.push({ level: 'ok', code: 'b573-c-separated', message: 'B_5.73 und C bleiben als verschiedene Root-Follow-Maschinen markiert.' });
  }

  if (b573 && material && b573.signature.rootFollowRoute === 'rendered-material-body') {
    findings.push({ level: 'error', code: 'b573-renders-material-body', message: 'B_5.73 Root hören darf nicht über den raueren Materialkörper-Pfad laufen.' });
  } else {
    findings.push({ level: 'ok', code: 'b573-root-not-material', message: 'B_5.73 Root-Follow bleibt als synthetische Route getrennt vom Materialkörper.' });
  }

  if (!legacy) {
    findings.push({ level: 'error', code: 'legacy-569-missing', message: 'Der 5.69 Legacy-Supernote-Modus wurde entfernt, soll aber als Legacy-Route erhalten bleiben.' });
  } else {
    findings.push({ level: 'ok', code: 'legacy-569-retained', message: 'Der 5.69 Direktmodus bleibt als Legacy-Route erhalten.' });
  }

  if (!raw) {
    findings.push({ level: 'error', code: 'raw-darkpsy-missing', message: 'Der rohe Darkpsy-Oszillator-/Hörweise-senden-Modus fehlt.' });
  } else {
    findings.push({ level: 'ok', code: 'raw-darkpsy-retained', message: 'Hörweise senden ohne Timbre-Extraktion ist als eigener Roh-Oszillator-Modus markiert.' });
  }

  return findings;
}

export function resolveCarrierIntegralVoiceLimit(machineId: CarrierIntegralMachineId, userMaxVoices?: number | null): number {
  const machine = resolveCarrierIntegralMachine(machineId);
  const defaultLimit = machine.defaultParams.maxVoices;
  if (!Number.isFinite(userMaxVoices ?? NaN)) return defaultLimit;
  return Math.max(1, Math.min(512, Math.round(userMaxVoices!)));
}

export function inspectCarrierIntegralSendDestinationContracts(machineIds: CarrierIntegralMachineId[]): CarrierIntegralRouteGuardFinding[] {
  const findings: CarrierIntegralRouteGuardFinding[] = [];

  for (const machineId of machineIds) {
    const materialspur = resolveCarrierIntegralSendContract({ machineId, destination: 'materialspur' });
    const rootFollow = resolveCarrierIntegralSendContract({ machineId, destination: 'root-follow-loop' });
    const machine = resolveCarrierIntegralMachine(machineId);

    if (machine.targetSupport['materialspur-export'] && !materialspur) {
      findings.push({ level: 'error', code: `${machineId}:materialspur-contract-missing`, message: `${machine.label} unterstützt Materialspur-Export, aber kein Send-Vertrag wurde aufgelöst.` });
    }
    if (machine.targetSupport['root-follow-export'] && !rootFollow) {
      findings.push({ level: 'error', code: `${machineId}:root-follow-contract-missing`, message: `${machine.label} unterstützt Root-Follow-Export, aber kein Send-Vertrag wurde aufgelöst.` });
    }
    if (materialspur && rootFollow) {
      findings.push({ level: 'ok', code: `${machineId}:materialspur-and-root-follow`, message: `${machine.label} kann getrennt an Materialspur und Root Follow Loop senden.` });
    }
  }

  const b573Root = resolveCarrierIntegralSendContract({ machineId: 'branch-b573-synth-window', destination: 'root-follow-loop' });
  if (!b573Root || b573Root.defaultElasticity !== 'synthetic-time-elastic') {
    findings.push({ level: 'error', code: 'b573-root-not-synthetic-elastic', message: 'B_5.73 muss in der Root Follow Loop per Default synthetisch zeit-elastisch bleiben.' });
  } else {
    findings.push({ level: 'ok', code: 'b573-root-synthetic-elastic', message: 'B_5.73 Root Follow ist als synthetisch zeit-elastisch markiert.' });
  }

  const materialRoot = resolveCarrierIntegralSendContract({ machineId: 'material-render-body', destination: 'root-follow-loop' });
  if (!materialRoot || !materialRoot.allowedElasticities.includes('raw-granular-elastic') || !materialRoot.allowedElasticities.includes('raw-tape-coupled')) {
    findings.push({ level: 'error', code: 'raw-audio-root-elasticity-choice-missing', message: 'Raw-/Materialkörper in Root Follow muss granulare Elastik und tonbandartige Kopplung anbieten.' });
  } else {
    findings.push({ level: 'ok', code: 'raw-audio-root-elasticity-choice', message: 'Raw-/Materialkörper kann in Root Follow zwischen granularer Elastik und Tonband-Kopplung wählen.' });
  }

  return findings;
}
