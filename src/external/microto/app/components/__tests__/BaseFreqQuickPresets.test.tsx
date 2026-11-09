/**
 * Locks shell root quick-presets contract (vision §5 discoverability; ROOT_HZ_PRESETS in bar).
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ROOT_HZ_LABEL, ROOT_HZ_PRESETS } from "../../copy";
import { BaseFreqQuickPresets } from "../BaseFreqQuickPresets";

describe("BaseFreqQuickPresets", () => {
  it("renders ROOT_HZ_LABEL and one pill per ROOT_HZ_PRESETS entry", () => {
    const html = renderToString(
      createElement(BaseFreqQuickPresets, {
        currentBaseFreq: 110,
        onSetBaseFreq: vi.fn(),
      }),
    );
    expect(html).toContain(ROOT_HZ_LABEL);
    for (const { label } of ROOT_HZ_PRESETS) {
      expect(html).toContain(label);
    }
  });

  it("renders exactly as many preset pills as ROOT_HZ_PRESETS (catalog lock)", () => {
    expect(ROOT_HZ_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(ROOT_HZ_PRESETS.length).toBeLessThanOrEqual(12);
    const html = renderToString(
      createElement(BaseFreqQuickPresets, {
        currentBaseFreq: 440,
        onSetBaseFreq: vi.fn(),
      }),
    );
    const buttonCount = (html.match(/<button/g) ?? []).length;
    expect(buttonCount).toBe(ROOT_HZ_PRESETS.length);
  });
});
