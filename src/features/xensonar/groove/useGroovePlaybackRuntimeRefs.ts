import { useMemo, useRef, type MutableRefObject } from "react";
import type { GeneratedPattern } from "../../resonance/rhythmforge/types";
import type { PsyBassPattern } from "../../resonance/psybass/types";
import type { BassClip } from "./bassPatternEvents";

export type GroovePlaybackRuntimeRefs = {
  rhythmForgeDrumPatternRef: MutableRefObject<GeneratedPattern | null>;
  rhythmForgeBassPatternRef: MutableRefObject<GeneratedPattern | null>;
  rhythmForgeDrumBarIndexRef: MutableRefObject<number>;
  rhythmForgeBassBarIndexRef: MutableRefObject<number>;
  rhythmForgeSeedRef: MutableRefObject<number>;
  psyBassPatternRef: MutableRefObject<PsyBassPattern | null>;
  psyBassBarIndexRef: MutableRefObject<number>;
  bassClipPlaybackCacheRef: MutableRefObject<{ id: string; clip: BassClip | null }>;
  bassClipBarRootRef: MutableRefObject<{ clipId: string; barIndex: number; rootHz: number }>;
};

export function useGroovePlaybackRuntimeRefs(): GroovePlaybackRuntimeRefs {
  const rhythmForgeDrumPatternRef = useRef<GeneratedPattern | null>(null);
  const rhythmForgeBassPatternRef = useRef<GeneratedPattern | null>(null);
  const rhythmForgeDrumBarIndexRef = useRef(-1);
  const rhythmForgeBassBarIndexRef = useRef(-1);
  const rhythmForgeSeedRef = useRef(0x59a17);
  const psyBassPatternRef = useRef<PsyBassPattern | null>(null);
  const psyBassBarIndexRef = useRef(-1);
  const bassClipPlaybackCacheRef = useRef<{ id: string; clip: BassClip | null }>({ id: "", clip: null });
  const bassClipBarRootRef = useRef<{ clipId: string; barIndex: number; rootHz: number }>({ clipId: "", barIndex: -1, rootHz: 49 });

  return useMemo(() => ({
    rhythmForgeDrumPatternRef,
    rhythmForgeBassPatternRef,
    rhythmForgeDrumBarIndexRef,
    rhythmForgeBassBarIndexRef,
    rhythmForgeSeedRef,
    psyBassPatternRef,
    psyBassBarIndexRef,
    bassClipPlaybackCacheRef,
    bassClipBarRootRef,
  }), []);
}
