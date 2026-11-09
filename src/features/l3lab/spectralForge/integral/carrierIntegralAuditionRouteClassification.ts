import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import {
  resolveCarrierIntegralMachineCapability,
  type CarrierIntegralMachineCapability,
} from './carrierIntegralMachineCapabilities';

export const CARRIER_INTEGRAL_AUDITION_ROUTE_CLASSIFICATION_VERSION =
  'carrier-integral-audition-route-classification-variance-seven-7.7.73';

export type CarrierIntegralAuditionRouteKind =
  | 'pure-dieter-raw-rendered'
  | 'harmonic-xplore-direct'
  | 'synthetic-root-follow';

export type CarrierIntegralAuditionRouteClassification = {
  version: typeof CARRIER_INTEGRAL_AUDITION_ROUTE_CLASSIFICATION_VERSION;
  machineId: CarrierIntegralMachineId;
  routeKind: CarrierIntegralAuditionRouteKind;
  bodyKind: CarrierIntegralMachineCapability['bodyKind'];
  capabilityLayer: CarrierIntegralMachineCapability['capabilityLayer'];
  renderStrategy: CarrierIntegralMachineCapability['renderStrategy'];
  guardrail: string;
};

export function resolveCarrierIntegralAuditionRouteKind(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralAuditionRouteKind {
  if (machineId === 'raw-darkpsy-oscillator') return 'pure-dieter-raw-rendered';
  if (machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body') return 'harmonic-xplore-direct';
  return 'synthetic-root-follow';
}

export function classifyCarrierIntegralAuditionRoute(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralAuditionRouteClassification {
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  return {
    version: CARRIER_INTEGRAL_AUDITION_ROUTE_CLASSIFICATION_VERSION,
    machineId,
    routeKind: resolveCarrierIntegralAuditionRouteKind(machineId),
    bodyKind: capability.bodyKind,
    capabilityLayer: capability.capabilityLayer,
    renderStrategy: capability.renderStrategy,
    guardrail: capability.guardrail,
  };
}

export function assertCarrierIntegralAuditionRouteClassification(): void {
  const expected = new Map<CarrierIntegralMachineId, CarrierIntegralAuditionRouteKind>([
    ['raw-darkpsy-oscillator', 'pure-dieter-raw-rendered'],
    ['harmonic-xplore-direct-carrier', 'harmonic-xplore-direct'],
    ['spektral-synthese-body', 'harmonic-xplore-direct'],
    ['legacy-supernote-5.69', 'synthetic-root-follow'],
    ['branch-a-line-traffic', 'synthetic-root-follow'],
    ['branch-b573-synth-window', 'synthetic-root-follow'],
    ['branch-c-interval-body', 'synthetic-root-follow'],
  ]);
  for (const [machineId, routeKind] of expected) {
    const actual = resolveCarrierIntegralAuditionRouteKind(machineId);
    if (actual !== routeKind) {
      throw new Error(`${machineId} expected ${routeKind} audition route, got ${actual}`);
    }
  }
}
