export type AppJiOscillatorOwnershipResolutionOptionId =
  | "preserveSeparateOvertoneVoice"
  | "singleOvertoneMasterOwner"
  | "legacyFallbackOnly"
  | "collapseIntoManualJiLayer";

export type AppJiOscillatorOwnershipResolutionVerdict =
  | "preferred-after-listening-parity"
  | "technical-owner-resolution-needed"
  | "allowed-only-as-transitional-fallback"
  | "rejected-without-explicit-musical-proof";

export type AppJiOscillatorOwnershipResolutionOption = {
  readonly id: AppJiOscillatorOwnershipResolutionOptionId;
  readonly verdict: AppJiOscillatorOwnershipResolutionVerdict;
  readonly musicalMeaning: string;
  readonly technicalMeaning: string;
  readonly signalRisk: string;
  readonly whenAllowed: string;
  readonly whenForbidden: string;
};

export type AppJiOscillatorOwnershipResolutionPlan = {
  readonly patch: "3.2.91.6.9.234_ji_oscillator_ownership_resolution_plan";
  readonly planOnly: boolean;
  readonly noRuntimeCodeMoved: true;
  readonly noAudioSemanticsChanged: true;
  readonly noJiManualCollapse: true;
  readonly noWaveStarterPolicyOwnedHere: true;
  readonly noRootFollowPolicyOwnedHere: true;
  readonly futureWorkletBranchAuthorityForWellenstarterPreserved: true;
  readonly currentAmbiguity: {
    readonly refs: readonly ["jiOscs", "jiGains", "overtoneMaster"];
    readonly creators: readonly ["overtoneMaster effect", "Resonance Nexus main loop fallback"];
    readonly routes: readonly ["jiGain -> overtoneMaster -> droneGroupBus/LiveMaster", "jiGain -> filter -> gain -> drone graph"];
    readonly cleanupOwners: readonly ["overtoneMaster effect cleanup", "Resonance Nexus main loop cleanup"];
    readonly frameWriters: readonly ["overtoneMaster effect RAF", "Resonance Nexus main loop frame"];
  };
  readonly artisticVarianceRule: string;
  readonly preferredDecision: string;
  readonly forbiddenShortcut: string;
  readonly resolutionSequence: readonly string[];
  readonly options: readonly AppJiOscillatorOwnershipResolutionOption[];
};

export const APP_JI_OSCILLATOR_OWNERSHIP_RESOLUTION_PLAN: AppJiOscillatorOwnershipResolutionPlan = {
  patch: "3.2.91.6.9.234_ji_oscillator_ownership_resolution_plan",
  planOnly: false,
  noRuntimeCodeMoved: true,
  noAudioSemanticsChanged: true,
  noJiManualCollapse: true,
  noWaveStarterPolicyOwnedHere: true,
  noRootFollowPolicyOwnedHere: true,
  futureWorkletBranchAuthorityForWellenstarterPreserved: true,
  currentAmbiguity: {
    refs: ["jiOscs", "jiGains", "overtoneMaster"],
    creators: ["overtoneMaster effect", "Resonance Nexus main loop fallback"],
    routes: ["jiGain -> overtoneMaster -> droneGroupBus/LiveMaster", "jiGain -> filter -> gain -> drone graph"],
    cleanupOwners: ["overtoneMaster effect cleanup", "Resonance Nexus main loop cleanup"],
    frameWriters: ["overtoneMaster effect RAF", "Resonance Nexus main loop frame"],
  },
  artisticVarianceRule:
    "Similar sounding overtone layers are not duplicates by default. In Xensonar, audible variance can be a musical mutation and therefore part of the software goal. Only technically exact same-result paths may be standardized without listening proof.",
  preferredDecision:
    "Patch 264 resolves technical ownership to the filter-routed jiOscs layer heard on the live-green Patch 260 first-start path. manualJiOscs remain separate; overtoneMaster remains non-canonical until an explicit listening comparison justifies a route change.",
  forbiddenShortcut:
    "Do not delete or merge jiOscs into manualJiOscs merely because both are JI/overtone oscillators. Do not let the Nexus main loop and overtoneMaster effect keep competing ownership indefinitely.",
  resolutionSequence: [
    "1. Preserve musical variance: treat manualJiOscs and jiOscs as distinct until proven exact-result redundant.",
    "2. Mark current jiOscs as ownership-ambiguous because one ref family can mean two audio routes.",
    "3. Choose one technical owner for jiOscs: preferably a named overtoneMaster lifecycle boundary, not the visual/particle Nexus main loop.",
    "4. Keep the Nexus main loop fallback only as a temporary legacy fallback until a listening/HTML check proves the named owner reproduces the intended layer.",
    "5. Only after ownership is single-source should a lifecycle boundary be extracted or the fallback removed.",
    "6. Do not use this plan to redesign Wellenstarter, Root Follow, hold/attack, apostroph, Enter, or AudioWorklet live policy.",
  ],
  options: [
    {
      id: "preserveSeparateOvertoneVoice",
      verdict: "preferred-after-listening-parity",
      musicalMeaning:
        "jiOscs remain a second overtone voice distinct from manualJiOscs, because small routing, gain, and modulation differences may be musically fertile.",
      technicalMeaning:
        "The layer must still get one named lifecycle owner and a stable route; variance is preserved, double ownership is not.",
      signalRisk:
        "low artistic risk if the voice remains audible and separately owned; medium technical risk until the route is singular.",
      whenAllowed:
        "Allowed when listening/HTML sanity confirms the layer contributes or at least does not destabilize the drone body.",
      whenForbidden:
        "Forbidden if it only duplicates exact manual-JI output with no distinct route, modulation, or sonic consequence.",
    },
    {
      id: "singleOvertoneMasterOwner",
      verdict: "technical-owner-resolution-needed",
      musicalMeaning:
        "Keeps jiOscs as their own layer while making overtoneMaster the explicit owner of creation, routing, frame update, and cleanup.",
      technicalMeaning:
        "Move the lifecycle out of App.tsx only after the main-loop fallback is proven unnecessary or converted into a fail-open bridge.",
      signalRisk:
        "medium: safest technical direction, but it must not erase a legacy filter-routed color if that route has audible identity.",
      whenAllowed:
        "Allowed after documenting whether the old filter route is musically irrelevant, legacy-only, or should become an explicit selectable variant.",
      whenForbidden:
        "Forbidden if implemented as a silent route rewrite without listening checks for the old filter-routed fallback color.",
    },
    {
      id: "legacyFallbackOnly",
      verdict: "allowed-only-as-transitional-fallback",
      musicalMeaning:
        "Treats Nexus main loop creation of jiOscs as a temporary safety bridge, not the canonical owner.",
      technicalMeaning:
        "The fallback may remain briefly while the named owner is introduced, but it must be guarded so both routes cannot race indefinitely.",
      signalRisk:
        "medium-high: useful for fail-open safety, dangerous as a permanent ambiguous owner.",
      whenAllowed:
        "Allowed during one or two transition patches with an explicit guard and patch note.",
      whenForbidden:
        "Forbidden as a long-term architecture because it leaves one ref family with two creators and two cleanup owners.",
    },
    {
      id: "collapseIntoManualJiLayer",
      verdict: "rejected-without-explicit-musical-proof",
      musicalMeaning:
        "Would remove the separate jiOscs layer and rely on manualJiOscs as the only JI/overtone oscillator family.",
      technicalMeaning:
        "This may look clean, but it is a norming move and must not happen merely because the code paths are similar.",
      signalRisk:
        "high artistic risk: it can erase a subtle Klangmutation that matters precisely because this is a live instrument/art system.",
      whenAllowed:
        "Allowed only after explicit comparison proves exact musical redundancy and the user accepts the loss of the path.",
      whenForbidden:
        "Forbidden as an automatic refactor or App.tsx shrink tactic.",
    },
  ],
} as const;
