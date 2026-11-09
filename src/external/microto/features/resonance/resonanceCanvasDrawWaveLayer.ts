/**
 * Resonance canvas: wave-layer drawing (ripples, sector pulses, impact markers, flashes, glyphs, trail shards).
 * Pure render; no simulation or audio. Called from resonanceCanvasDraw.drawResonanceFrame.
 */
import type { DirectedPulse, NexusRipple } from "../runtime/types";
import type { ResonanceWaveTelemetry } from "./resonanceWaveTelemetry";
import {
  createResonanceImpactMarkerStyle,
  createResonanceRippleFlashStyle,
  createResonanceSectorFlashStyle,
  createResonanceSectorGlyphStyle,
  createResonanceSectorTrailShardStyle,
  createResonanceRippleVisualStyle,
  createResonanceSectorPulseVisualStyle,
} from "./resonanceWaveVisualStyle";

const IMPACT_FLASH_MS = 220;

function directionToAngle(direction?: DirectedPulse["direction"]): number {
  return direction === "right" ? 0
  : direction === "up" ? -Math.PI / 2
  : direction === "left" ? Math.PI
  : Math.PI / 2;
}

function drawImpactMarkerCluster(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  baseAngle: number,
  count: number,
  style: ReturnType<typeof createResonanceImpactMarkerStyle>,
  spreadScale = 1,
): void {
  const markerCount = Math.max(0, Math.min(3, count));
  if (markerCount === 0) return;
  const startOffset = -((markerCount - 1) * style.angleStepRadians * spreadScale) / 2;
  for (let index = 0; index < markerCount; index += 1) {
    const angle = baseAngle + startOffset + index * style.angleStepRadians * spreadScale;
    const markerX = x + Math.cos(angle) * radius;
    const markerY = y + Math.sin(angle) * radius;
    c.beginPath();
    c.arc(markerX, markerY, style.glowRadius, 0, Math.PI * 2);
    c.fillStyle = style.glowFillStyle;
    c.fill();
    c.beginPath();
    c.arc(markerX, markerY, style.markerRadius, 0, Math.PI * 2);
    c.fillStyle = style.fillStyle;
    c.fill();
  }
}

function drawSectorDirectionGlyph(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerAngle: number,
  radius: number,
  style: ReturnType<typeof createResonanceSectorGlyphStyle>,
): void {
  const forwardX = Math.cos(centerAngle);
  const forwardY = Math.sin(centerAngle);
  const normalX = -Math.sin(centerAngle);
  const normalY = Math.cos(centerAngle);

  const strokePath = (strokeStyle: string, lineWidth: number) => {
    c.beginPath();
    if (style.glyphKind === "chevrons") {
      for (let index = 0; index < style.glyphCount; index += 1) {
        const tipRadius = radius + style.glyphInset + index * (style.glyphSpread * 0.9);
        const tailRadius = tipRadius - style.glyphLength;
        const tipX = x + forwardX * tipRadius;
        const tipY = y + forwardY * tipRadius;
        const leftX = x + forwardX * tailRadius + normalX * style.glyphSpread * 0.58;
        const leftY = y + forwardY * tailRadius + normalY * style.glyphSpread * 0.58;
        const rightX = x + forwardX * tailRadius - normalX * style.glyphSpread * 0.58;
        const rightY = y + forwardY * tailRadius - normalY * style.glyphSpread * 0.58;
        c.moveTo(leftX, leftY);
        c.lineTo(tipX, tipY);
        c.lineTo(rightX, rightY);
      }
    } else if (style.glyphKind === "crown") {
      const baseRadius = radius + style.glyphInset;
      const offsets = [-1, 0, 1];
      offsets.forEach((offset, index) => {
        const offsetScale = offset * style.glyphSpread * 0.7;
        const tipRadius = baseRadius + style.glyphLength * (index === 1 ? 0.65 : 0.5);
        const baseX = x + forwardX * (baseRadius - style.glyphLength * 0.45) + normalX * offsetScale;
        const baseY = y + forwardY * (baseRadius - style.glyphLength * 0.45) + normalY * offsetScale;
        const tipX = x + forwardX * tipRadius + normalX * offsetScale * 0.36;
        const tipY = y + forwardY * tipRadius + normalY * offsetScale * 0.36;
        c.moveTo(baseX, baseY);
        c.lineTo(tipX, tipY);
      });
    } else {
      const shaftStartRadius = radius + style.glyphInset - style.glyphLength * 0.35;
      const tipRadius = radius + style.glyphInset + style.glyphLength * 0.9;
      const wingRadius = radius + style.glyphInset + style.glyphLength * 0.22;
      const shaftStartX = x + forwardX * shaftStartRadius;
      const shaftStartY = y + forwardY * shaftStartRadius;
      const tipX = x + forwardX * tipRadius;
      const tipY = y + forwardY * tipRadius;
      const leftWingX = x + forwardX * wingRadius + normalX * style.glyphSpread * 0.72;
      const leftWingY = y + forwardY * wingRadius + normalY * style.glyphSpread * 0.72;
      const rightWingX = x + forwardX * wingRadius - normalX * style.glyphSpread * 0.72;
      const rightWingY = y + forwardY * wingRadius - normalY * style.glyphSpread * 0.72;
      c.moveTo(shaftStartX, shaftStartY);
      c.lineTo(tipX, tipY);
      c.moveTo(leftWingX, leftWingY);
      c.lineTo(tipX, tipY);
      c.lineTo(rightWingX, rightWingY);
    }
    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  };

  c.setLineDash([]);
  strokePath(style.glowStrokeStyle, style.glowWidth);
  strokePath(style.strokeStyle, style.lineWidth);
}

function drawSectorTrailShards(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerAngle: number,
  radius: number,
  direction: DirectedPulse["direction"],
  style: ReturnType<typeof createResonanceSectorTrailShardStyle>,
): void {
  const forwardX = Math.cos(centerAngle);
  const forwardY = Math.sin(centerAngle);
  const normalX = -Math.sin(centerAngle);
  const normalY = Math.cos(centerAngle);
  const directionSign = direction === "left" || direction === "up" ? -1 : 1;

  const strokePath = (strokeStyle: string, lineWidth: number) => {
    c.beginPath();
    for (let index = 0; index < style.shardCount; index += 1) {
      const taper = 1 - index / Math.max(style.shardCount, 1);
      const baseRadius = radius + style.shardInset - index * style.shardDrift;
      if (style.shardKind === "fan") {
        const centered = index - (style.shardCount - 1) / 2;
        const lateral = centered * style.shardSpread * 0.72;
        const startX = x + forwardX * (baseRadius + style.shardLength * 0.15);
        const startY = y + forwardY * (baseRadius + style.shardLength * 0.15);
        const endX = x + forwardX * (baseRadius - style.shardLength * 0.8) + normalX * lateral;
        const endY = y + forwardY * (baseRadius - style.shardLength * 0.8) + normalY * lateral;
        c.moveTo(startX, startY);
        c.lineTo(endX, endY);
      } else if (style.shardKind === "tail") {
        const centered = index - (style.shardCount - 1) / 2;
        const lateral = centered * style.shardSpread * 0.6;
        const startX = x + forwardX * (baseRadius + style.shardLength * 0.08) + normalX * lateral;
        const startY = y + forwardY * (baseRadius + style.shardLength * 0.08) + normalY * lateral;
        const midX = x + forwardX * (baseRadius - style.shardLength * 0.42) + normalX * lateral * 0.35;
        const midY = y + forwardY * (baseRadius - style.shardLength * 0.42) + normalY * lateral * 0.35;
        const endX = x + forwardX * (baseRadius - style.shardLength * 0.98);
        const endY = y + forwardY * (baseRadius - style.shardLength * 0.98);
        c.moveTo(startX, startY);
        c.lineTo(midX, midY);
        c.lineTo(endX, endY);
      } else {
        const centered = index - (style.shardCount - 1) / 2;
        const lateral = centered * style.shardSpread * 0.42;
        const tilt = (index % 2 === 0 ? 1 : -1) * directionSign * style.shardSpread * 0.34 * taper;
        const startX = x + forwardX * (baseRadius + style.shardLength * 0.08) + normalX * lateral;
        const startY = y + forwardY * (baseRadius + style.shardLength * 0.08) + normalY * lateral;
        const endX =
          x + forwardX * (baseRadius - style.shardLength * 0.88) + normalX * (lateral + tilt);
        const endY =
          y + forwardY * (baseRadius - style.shardLength * 0.88) + normalY * (lateral + tilt);
        c.moveTo(startX, startY);
        c.lineTo(endX, endY);
      }
    }
    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  };

  c.setLineDash([]);
  strokePath(style.glowStrokeStyle, style.glowWidth);
  strokePath(style.strokeStyle, style.lineWidth);
}

function getImpactFreshness(lastImpactAt: number | undefined, frameNow: number): number {
  if (!lastImpactAt || lastImpactAt <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - (frameNow - lastImpactAt) / IMPACT_FLASH_MS));
}

/**
 * Draws ripples and sector pulses (wave-layer visuals: strokes, impact markers, flashes, glyphs, trail shards).
 */
export function drawResonanceWaveLayer(
  c: CanvasRenderingContext2D,
  ripples: NexusRipple[],
  sectorPulses: DirectedPulse[],
  waveTelemetry: ResonanceWaveTelemetry,
  frameNow: number,
): void {
  ripples.forEach((r) => {
    const rippleVisual = createResonanceRippleVisualStyle(waveTelemetry, r);
    const hitCount = r.hitAgents?.length ?? 0;
    const rippleFreshness = getImpactFreshness(r.lastImpactAt, frameNow);
    c.beginPath();
    c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    c.strokeStyle = rippleVisual.glowStrokeStyle;
    c.lineWidth = rippleVisual.glowLineWidth;
    c.setLineDash(rippleVisual.lineDash);
    c.lineCap = rippleVisual.lineCap;
    c.stroke();
    if (rippleVisual.highlightStrokeStyle) {
      c.beginPath();
      c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      c.strokeStyle = rippleVisual.highlightStrokeStyle;
      c.lineWidth = rippleVisual.lineWidth + 0.9;
      c.setLineDash([]);
      c.lineCap = "round";
      c.stroke();
    }
    c.beginPath();
    c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    c.strokeStyle = rippleVisual.strokeStyle;
    c.lineWidth = rippleVisual.lineWidth;
    c.setLineDash(rippleVisual.lineDash);
    c.lineCap = rippleVisual.lineCap;
    c.stroke();
    c.setLineDash([]);
    if (hitCount > 0) {
      drawImpactMarkerCluster(
        c,
        r.x,
        r.y,
        r.radius,
        directionToAngle(r.direction),
        hitCount,
        createResonanceImpactMarkerStyle(waveTelemetry, hitCount),
        1.15,
      );
    }
    if (rippleFreshness > 0) {
      const flashStyle = createResonanceRippleFlashStyle(waveTelemetry, rippleFreshness, hitCount);
      c.beginPath();
      c.arc(r.x, r.y, r.radius + flashStyle.radiusOffset, 0, Math.PI * 2);
      c.strokeStyle = flashStyle.strokeStyle;
      c.lineWidth = flashStyle.lineWidth;
      c.setLineDash([]);
      c.lineCap = "round";
      c.stroke();
    }
  });

  sectorPulses.forEach((pulse) => {
    const centerAngle =
      pulse.direction === "right" ? 0
      : pulse.direction === "up" ? -Math.PI / 2
      : pulse.direction === "left" ? Math.PI : Math.PI / 2;
    const halfSector = Math.PI / 4;
    const start = centerAngle - halfSector;
    const end = centerAngle + halfSector;
    const pulseVisual = createResonanceSectorPulseVisualStyle(waveTelemetry, pulse);
    const pulseFreshness = getImpactFreshness(pulse.lastImpactAt, frameNow);

    c.save();
    c.beginPath();
    c.arc(pulse.x, pulse.y, pulse.radius, start, end);
    c.strokeStyle = pulseVisual.glowStrokeStyle;
    c.lineWidth = pulseVisual.glowLineWidth;
    c.setLineDash(pulseVisual.lineDash);
    c.lineCap = pulseVisual.lineCap;
    c.stroke();
    if (pulseVisual.highlightStrokeStyle) {
      c.beginPath();
      c.arc(pulse.x, pulse.y, pulse.radius, start, end);
      c.strokeStyle = pulseVisual.highlightStrokeStyle;
      c.lineWidth = pulseVisual.lineWidth + 1;
      c.setLineDash([]);
      c.lineCap = "round";
      c.stroke();
    }
    c.beginPath();
    c.arc(pulse.x, pulse.y, pulse.radius, start, end);
    c.strokeStyle = pulseVisual.strokeStyle;
    c.lineWidth = pulseVisual.lineWidth;
    c.setLineDash(pulseVisual.lineDash);
    c.lineCap = pulseVisual.lineCap;
    c.stroke();
    if (pulse.hitAgents.length > 0) {
      drawImpactMarkerCluster(
        c,
        pulse.x,
        pulse.y,
        pulse.radius,
        centerAngle,
        pulse.hitAgents.length,
        createResonanceImpactMarkerStyle(waveTelemetry, pulse.hitAgents.length, !!pulse.persistent),
        0.85,
      );
    }
    if (pulseFreshness > 0) {
      const flashStyle = createResonanceSectorFlashStyle(
        waveTelemetry,
        pulseFreshness,
        !!pulse.persistent,
      );
      c.beginPath();
      c.arc(pulse.x, pulse.y, pulse.radius + flashStyle.frontRadiusOffset, start, end);
      c.strokeStyle = flashStyle.frontStrokeStyle;
      c.lineWidth = flashStyle.frontLineWidth;
      c.setLineDash([]);
      c.lineCap = "round";
      c.stroke();

      const rayInner = Math.max(0, pulse.radius - 4);
      const rayOuter = pulse.radius + flashStyle.rayOuterOffset;
      c.beginPath();
      c.moveTo(
        pulse.x + Math.cos(centerAngle) * rayInner,
        pulse.y + Math.sin(centerAngle) * rayInner,
      );
      c.lineTo(
        pulse.x + Math.cos(centerAngle) * rayOuter,
        pulse.y + Math.sin(centerAngle) * rayOuter,
      );
      c.strokeStyle = flashStyle.rayStrokeStyle;
      c.lineWidth = flashStyle.rayWidth;
      c.lineCap = "round";
      c.stroke();

      drawSectorTrailShards(
        c,
        pulse.x,
        pulse.y,
        centerAngle,
        pulse.radius,
        pulse.direction,
        createResonanceSectorTrailShardStyle(
          waveTelemetry,
          pulse.direction,
          pulseFreshness,
          !!pulse.persistent,
        ),
      );

      drawSectorDirectionGlyph(
        c,
        pulse.x,
        pulse.y,
        centerAngle,
        pulse.radius,
        createResonanceSectorGlyphStyle(
          waveTelemetry,
          pulse.direction,
          pulseFreshness,
          !!pulse.persistent,
        ),
      );
    }
    c.restore();
  });
}
