import {
  BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION,
  branchCCarrierLoopBodyRolePitchScale,
  branchCCarrierLoopBodyRoleSpreadPitchScale,
  branchCPresenceValue,
  branchCRoughnessValue,
  branchCSampleGraphLinear,
  branchCWindowLocalPitchCents,
  branchCWindowLocalPitchFieldValue,
  branchCWindowPaintedBaselineCents,
} from '../src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyResonanceMapping';
import type { SpectralForgeV2IntervalWindow } from '../src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
function closeEnough(actual: number, expected: number, tolerance = 0.001) {
  return Math.abs(actual - expected) <= tolerance;
}
function makeWindow(overrides: Partial<SpectralForgeV2IntervalWindow> = {}): SpectralForgeV2IntervalWindow {
  return {
    id: 'mapping-window',
    startTimeIndex: 0,
    endTimeIndex: 95,
    startBeat: 0,
    endBeat: 16,
    layer: 'body',
    anchorCount: 16,
    bindingCount: 4,
    allocationCount: 2,
    yMinBin: 12,
    yMaxBin: 42,
    yCentroidBin: 28,
    ySpread: 7,
    energyGraph: [0.25, 0.5, 1],
    densityGraph: [0.1, 0.3, 0.7],
    centroidGraph: [-1, 0, 1],
    spreadGraph: [-1, 0, 1],
    frequencyStartHz: 440,
    frequencyEndHz: 880,
    frequencyCentroidHz: Math.sqrt(440 * 880),
    continuity: 0.75,
    roughness: 0.25,
    transientness: 0.2,
    donorPigment: {
      resonanceTint: 0.2,
      residualTint: 0.3,
      transientTint: 0.1,
      noiseColor: 0.4,
      leakRisk: 0.1,
    },
    ...overrides,
  };
}

check('Mapping version is 9.168', BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION.includes('3.2.91.6.9.168'));
check('Body pitch scale preserves Cecilia body LocalField scale', closeEnough(branchCCarrierLoopBodyRolePitchScale('body'), 0.11));
check('Surface pitch scale preserves Cecilia surface LocalField scale', closeEnough(branchCCarrierLoopBodyRolePitchScale('surface'), 0.18));
check('Skin pitch scale preserves Cecilia skin LocalField scale', closeEnough(branchCCarrierLoopBodyRolePitchScale('skin'), 0.08));
check('Articulation pitch scale preserves Cecilia articulation LocalField scale', closeEnough(branchCCarrierLoopBodyRolePitchScale('articulation'), 0.04));
check('Surface spread pitch scale stays distinct', closeEnough(branchCCarrierLoopBodyRoleSpreadPitchScale('surface'), 0.035));
check('Body spread pitch scale stays conservative', closeEnough(branchCCarrierLoopBodyRoleSpreadPitchScale('body'), 0.012));

const fieldValue = branchCWindowLocalPitchFieldValue({ centroid: 1, spread: 0, role: 'body' });
check('Local pitch field value uses body scale', closeEnough(fieldValue, 0.11), fieldValue);
check('Local pitch cents preserves LocalField *12 semitone semantics', closeEnough(branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }), 132), branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }));
check('Local pitch field clamps extreme combined centroid/spread', branchCWindowLocalPitchFieldValue({ centroid: 99, spread: 99, role: 'surface' }) <= 0.22);

const window = makeWindow();
check('Painted contour starts at window start frequency', closeEnough(branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 0 }), 0, 0.01));
check('Painted contour midpoint respects centroid correction', closeEnough(branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 0.5 }), 600, 0.01));
check('Painted contour ends at window end frequency', closeEnough(branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 1 }), 1200, 0.01));
check('Static centroid mode remains static across window ratio', closeEnough(
  branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 0.1, contourMode: 'static-window-centroid' }),
  branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 0.9, contourMode: 'static-window-centroid' }),
));

check('Graph sampling interpolates linearly', closeEnough(branchCSampleGraphLinear([0, 10], 0.25), 2.5));
check('Graph sampling handles empty graph with fallback', closeEnough(branchCSampleGraphLinear([], 0.5, 7), 7));
const rough = branchCRoughnessValue(window, 1);
check('Roughness mapping clamps into 0..1', rough >= 0 && rough <= 1, rough);
const presence = branchCPresenceValue({ intervalWindow: window, energy: 0.8, density: 0.4 });
check('Presence mapping clamps into 0..1', presence >= 0 && presence <= 1, presence);
check('Presence rises with energy', branchCPresenceValue({ intervalWindow: window, energy: 0.9, density: 0.4 }) > branchCPresenceValue({ intervalWindow: window, energy: 0.2, density: 0.4 }));

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  localBodyCents: branchCWindowLocalPitchCents({ centroid: 1, spread: 0, role: 'body' }),
  paintedMidpointCents: branchCWindowPaintedBaselineCents({ intervalWindow: window, baseHz: 440, ratio: 0.5 }),
  roughness: rough,
  presence,
}, null, 2));
