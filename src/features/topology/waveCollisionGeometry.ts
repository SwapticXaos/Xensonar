const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function crossedExpandingShell(distance: number, prevRadius: number, radius: number, tolerance = 0) {
  const lo = Math.min(prevRadius, radius) - tolerance;
  const hi = Math.max(prevRadius, radius) + tolerance;
  return distance >= lo && distance <= hi;
}

export function crossingT(distance: number, prevRadius: number, radius: number) {
  const span = radius - prevRadius;
  if (Math.abs(span) < 0.0001) return 1;
  return clamp((distance - prevRadius) / span, 0, 1);
}

export function normalizeAngleDelta(angle: number, centerAngle: number) {
  let delta = angle - centerAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function getPulseCenterAngle(direction: "left" | "right" | "up" | "down") {
  return direction === "right"
    ? 0
    : direction === "up"
      ? -Math.PI / 2
      : direction === "left"
        ? Math.PI
        : Math.PI / 2;
}
