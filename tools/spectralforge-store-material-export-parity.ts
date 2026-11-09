import {
  setMaterialExportGuideMarker,
  updateMaterialExportConfig,
} from '../src/features/l3lab/spectralForge/state/storeMaterialExportActions';
import {
  buildDefaultGuideMarkers,
  clampBars,
  clampGuideSegments,
  sanitizeGuideMarkers,
} from '../src/features/l3lab/spectralForge/state/storeMaterialExport';

type MaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';

interface MaterialExportConfig {
  name: string;
  role: MaterialRole;
  adapterId?: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  beatGuideAudible: boolean;
  beatGuideVolume: number;
  loopPreview: boolean;
}

function createBaseMaterialExport(): MaterialExportConfig {
  return {
    name: 'Carrier-Pigment',
    role: 'loop',
    bpm: 141,
    bars: 4,
    guideSegments: 4,
    guideMarkers: [0.25, 0.5, 0.75],
    beatGuideAudible: false,
    beatGuideVolume: 0.35,
    loopPreview: true,
  };
}

function oldInlineUpdateMaterialExport(
  current: MaterialExportConfig,
  patch: Partial<MaterialExportConfig>
): MaterialExportConfig {
  const nextBars = patch.bars !== undefined ? clampBars(patch.bars) : current.bars;
  const nextSegments = patch.guideSegments !== undefined ? clampGuideSegments(patch.guideSegments) : current.guideSegments;
  const shouldResetMarkers = patch.guideSegments !== undefined && nextSegments !== current.guideSegments && patch.guideMarkers === undefined;
  const nextMarkersSource = patch.guideMarkers !== undefined
    ? patch.guideMarkers
    : shouldResetMarkers
      ? buildDefaultGuideMarkers(nextSegments)
      : current.guideMarkers;
  const nextBeatGuideVolume = patch.beatGuideVolume !== undefined
    ? Math.max(0, Math.min(1, patch.beatGuideVolume))
    : current.beatGuideVolume;

  return {
    ...current,
    ...patch,
    bars: nextBars,
    guideSegments: nextSegments,
    guideMarkers: sanitizeGuideMarkers(nextMarkersSource, nextSegments),
    beatGuideVolume: nextBeatGuideVolume,
  };
}

function oldInlineSetGuideMarker(
  current: MaterialExportConfig,
  index: number,
  value: number
): MaterialExportConfig {
  const nextMarkers = current.guideMarkers.slice();
  nextMarkers[index] = value;
  return {
    ...current,
    guideMarkers: sanitizeGuideMarkers(nextMarkers, current.guideSegments),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (stableJson(actual) !== stableJson(expected)) {
    console.error(`[material-export-parity] ${label} failed`);
    console.error('actual:', stableJson(actual));
    console.error('expected:', stableJson(expected));
    process.exit(1);
  }
}

function runUpdateScenario(label: string, patch: Partial<MaterialExportConfig>): void {
  const current = createBaseMaterialExport();
  assertEqual(
    label,
    updateMaterialExportConfig(current, patch),
    oldInlineUpdateMaterialExport(current, patch)
  );
}

runUpdateScenario('bars clamp', { bars: 99 });
runUpdateScenario('guide segment reset markers', { guideSegments: 8 });
runUpdateScenario('guide segment with explicit markers', { guideSegments: 5, guideMarkers: [0.9, 0.1, 0.4, 0.6] });
runUpdateScenario('beat guide volume lower clamp', { beatGuideVolume: -2 });
runUpdateScenario('beat guide volume upper clamp', { beatGuideVolume: 7 });
runUpdateScenario('role and name patch preserve marker contract', { role: 'droneTexture', name: 'Drohnenhaut' });

{
  const current = createBaseMaterialExport();
  assertEqual(
    'setGuideMarker clamps and preserves other fields',
    setMaterialExportGuideMarker(current, 1, 0.93),
    oldInlineSetGuideMarker(current, 1, 0.93)
  );
}

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: 7,
  boundary: 'storeMaterialExportActions',
}));
