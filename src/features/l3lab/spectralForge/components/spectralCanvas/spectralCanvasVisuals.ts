import type { AnchorBindingPreview, CarrierAnchor, CarrierAnchorLink } from '../../types/carrierDonorV2Types';

// Grain size → hue tint (short=warm/red, long=cool/blue)
export function grainToTint(grain: number): [number, number, number] {
  // 0 = warm red-orange, 0.5 = neutral (no tint), 1 = cool cyan-blue
  if (grain < 0.5) {
    const t = grain / 0.5; // 0 to 1
    return [
      Math.round(255 * (1 - t)),     // R: high→0
      Math.round(80 * t),            // G: 0→80
      Math.round(40 * t),            // B: 0→40
    ];
  }
  const t = (grain - 0.5) / 0.5; // 0 to 1
  return [
    0,                              // R: 0
    Math.round(80 + 120 * t),      // G: 80→200
    Math.round(40 + 215 * t),      // B: 40→255
  ];
}

export function frequencyToScreenY(freq: number, totalHeight: number): number {
  const normalized = Math.log(freq / 20) / Math.log(20000 / 20);
  return (1 - normalized) * totalHeight;
}

export function anchorColor(anchor: CarrierAnchor): string {
  switch (anchor.regime) {
    case 'transient': return 'rgba(251, 191, 36, 0.95)';
    case 'cluster': return 'rgba(236, 72, 153, 0.92)';
    case 'noise': return 'rgba(148, 163, 184, 0.88)';
    case 'tonal':
    default: return 'rgba(167, 139, 250, 0.95)';
  }
}

export function continuityColor(link: CarrierAnchorLink): string {
  const alpha = Math.max(0.18, Math.min(0.82, link.continuityScore * 0.88));
  return `rgba(192, 132, 252, ${alpha.toFixed(3)})`;
}

export function bindingColor(binding: AnchorBindingPreview | undefined): string | null {
  if (!binding) return null;
  switch (binding.dominantRegister) {
    case 'low': return 'rgba(56, 189, 248, 0.92)';
    case 'high': return 'rgba(251, 191, 36, 0.92)';
    case 'mid':
    default: return 'rgba(74, 222, 128, 0.92)';
  }
}
