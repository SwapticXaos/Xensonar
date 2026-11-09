export type FieldPoint = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function mapFieldPoint(
  point: FieldPoint,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): FieldPoint {
  const scaleX = targetWidth / Math.max(1, sourceWidth);
  const scaleY = targetHeight / Math.max(1, sourceHeight);
  return {
    x: clamp(point.x * scaleX, 0, targetWidth),
    y: clamp(point.y * scaleY, 0, targetHeight),
  };
}
