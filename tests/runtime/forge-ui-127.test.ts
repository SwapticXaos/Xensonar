import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DonorHearingButton,
  type DonorHearingButtonProps,
} from "../../src/features/l3lab/spectralForge/components/harmonizerPanel/DonorHearingButton";
import EmbodimentFieldPanel from "../../src/features/l3lab/spectralForge/components/EmbodimentFieldPanel";

const donor = (overrides: Partial<DonorHearingButtonProps> = {}) =>
  renderToStaticMarkup(
    createElement(DonorHearingButton, {
      ready: true,
      phase: "idle",
      onPreview() {},
      ...overrides,
    }),
  );

test("Donor selection persists after playback has ended, separately from playback status", () => {
  const html = donor({ selected: true });
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Donor: Hören/);
  assert.doesNotMatch(html, /Donor: Stop/);
});

test("stale Donor cannot strand an active render or playback behind a disabled button", () => {
  assert.doesNotMatch(
    donor({ ready: false, phase: "rendering" }),
    /disabled=""/,
  );
  assert.match(donor({ ready: false, phase: "rendering" }), /Donor: Abbrechen/);
  assert.doesNotMatch(donor({ ready: false, phase: "playing" }), /disabled=""/);
  assert.match(donor({ ready: false, phase: "playing" }), /Donor: Stop/);
  assert.match(donor({ ready: false, phase: "idle" }), /disabled=""/);
  assert.match(donor({ onPreview: undefined }), /disabled=""/);
});

test("Donor status and error are accessible without hover", () => {
  const html = donor({
    ready: false,
    phase: "error",
    error: "Bitte Audio erneut auswählen.",
  });
  assert.match(html, /aria-describedby="[^"]+"/);
  assert.match(html, /role="status"/);
  assert.match(html, /Audio auswählen/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Bitte Audio erneut auswählen/);
});

test("body panel offers playback and sending before collapsed technical diagnostics", () => {
  const html = renderToStaticMarkup(
    createElement(EmbodimentFieldPanel, {
      embodimentField: null,
      embodimentStatus: "missing",
      embodimentMessage: "",
      embodimentLayersVisibility: {
        carrierTrace: true,
        ordered: true,
        body: true,
        residual: true,
        transient: true,
        composite: true,
      },
      fieldMode: "carrier_donor_v2",
      previewAvailable: false,
      previewPhase: "rendering",
      validationBusy: false,
      onToggleLayer() {},
      onPlayPreview() {},
      onRunValidation() {},
      onDownloadValidationReport() {},
      onDownloadValidationBundle() {},
      onSendToMaterialspur() {},
    }),
  );
  const cancel = html.match(/<button[^>]*>Berechnung abbrechen<\/button>/)?.[0];
  assert.ok(cancel);
  assert.doesNotMatch(cancel, /disabled/);
  assert.ok(html.indexOf("An Materialspur senden") < html.indexOf("<details"));
  assert.doesNotMatch(html, /<details[^>]*\sopen[=> ]/);
  assert.match(
    html,
    /aria-label="Materialverteilung entlang der gemalten Figur"/,
  );
});
