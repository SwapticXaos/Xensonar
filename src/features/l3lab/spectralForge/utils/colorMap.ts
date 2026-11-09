/**
 * Color maps for spectral visualization
 * Maps amplitude (0-1) to RGB colors
 */

export type ColorMap = (value: number) => [number, number, number];

/** Magma colormap - dark purple to yellow */
export const magma: ColorMap = (v) => {
  v = Math.max(0, Math.min(1, v));
  if (v < 0.01) return [0, 0, 0]; // background
  if (v < 0.25) {
    const t = v / 0.25;
    return [
      Math.round(lerp(10, 90, t)),
      Math.round(lerp(0, 20, t)),
      Math.round(lerp(20, 100, t)),
    ];
  }
  if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return [
      Math.round(lerp(90, 200, t)),
      Math.round(lerp(20, 50, t)),
      Math.round(lerp(100, 100, t)),
    ];
  }
  if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return [
      Math.round(lerp(200, 250, t)),
      Math.round(lerp(50, 140, t)),
      Math.round(lerp(100, 40, t)),
    ];
  }
  const t = (v - 0.75) / 0.25;
  return [
    Math.round(lerp(250, 255, t)),
    Math.round(lerp(140, 255, t)),
    Math.round(lerp(40, 100, t)),
  ];
};

/** Hot colormap - black to red to yellow to white */
export const hot: ColorMap = (v) => {
  v = Math.max(0, Math.min(1, v));
  if (v < 0.01) return [0, 0, 0];
  if (v < 0.33) {
    const t = v / 0.33;
    return [Math.round(255 * t), 0, 0];
  }
  if (v < 0.66) {
    const t = (v - 0.33) / 0.33;
    return [255, Math.round(255 * t), 0];
  }
  const t = (v - 0.66) / 0.34;
  return [255, 255, Math.round(255 * t)];
};

/** Cool blue-cyan colormap */
export const ice: ColorMap = (v) => {
  v = Math.max(0, Math.min(1, v));
  if (v < 0.01) return [0, 0, 0];
  if (v < 0.33) {
    const t = v / 0.33;
    return [0, 0, Math.round(lerp(30, 150, t))];
  }
  if (v < 0.66) {
    const t = (v - 0.33) / 0.33;
    return [0, Math.round(lerp(30, 200, t)), Math.round(lerp(150, 255, t))];
  }
  const t = (v - 0.66) / 0.34;
  return [Math.round(lerp(50, 255, t)), Math.round(lerp(200, 255, t)), 255];
};

/** Green phosphor - retro oscilloscope look */
export const phosphor: ColorMap = (v) => {
  v = Math.max(0, Math.min(1, v));
  if (v < 0.01) return [0, 0, 0];
  return [
    Math.round(lerp(0, 100, v)),
    Math.round(lerp(20, 255, Math.pow(v, 0.7))),
    Math.round(lerp(0, 80, v)),
  ];
};

/** Rainbow colormap */
export const rainbow: ColorMap = (v) => {
  v = Math.max(0, Math.min(1, v));
  if (v < 0.01) return [0, 0, 0];
  const h = (1 - v) * 270; // purple to red
  return hslToRgb(h, 100, Math.round(lerp(20, 55, v)));
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const colorMaps = {
  magma, hot, ice, phosphor, rainbow
} as const;

export type ColorMapName = keyof typeof colorMaps;

/**
 * Pre-compute a 256-entry lookup table for a colormap
 * for fast rendering
 */
export function buildColorLUT(map: ColorMap): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = map(i / 255);
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}
