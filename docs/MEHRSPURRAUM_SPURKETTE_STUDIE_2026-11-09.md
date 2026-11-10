# Spurkette der Materialspur: Lesestudie für „ein Baustein, zwei Taktgeber“

Stand 09.11.2026, Basis LIVEZONE-02 (`index.html` `089349a9…59cd`). **Reine Lesestudie, keine Produktänderung.** Status: CODE_PRESENT (gelesen); nichts davon im Browser oder per PCM geprüft.

Ziel: Bestimmen, wo die Loop-Uhr des Live Room in die Materialspur eingreift und wie dieselbe Kette in Raum IV von einer Zeitleiste getaktet werden kann, ohne Kopie und ohne zweiten Owner.

## 1. Anatomie: `$fe` startet eine Materialspur

Datei `src/audio/01_voice_and_rfl_ownership.js`, Funktion `$fe` (ab Zeile 476), Planfunktion `zfe` (Zeile 401).

| Stufe | Zeilen | Was passiert | Live-spezifisch? |
|---|---|---|---|
| **A Quelle** | 477–487 | Live-Bar-Edits abwarten (`__XenRackLiveBarEdits`), PCM aus Cache oder `__materialAudioBlob` → `decodeAudioData`, Cache pro Lane-Refs (`cacheRef`), Lifecycle-Registrierung (`Hfe`) | Nein (Edit-Teil ja) |
| **B Worklets laden** | 488–493 | `__XenTimeStablePitch.ensure`, `__XenMaterialPhase.create(ctx, buffer)` (Granular/Vinyl/Idle-Phasenleser; Grenze 64 MB PCM, darüber nativer `AudioBufferSource`) | Nein |
| **C Plan = Taktgeber** | 494–533 | `zfe`: gemeinsame Zeit `sM()` (Anker, BPM, Raster), Taktinterpretation (auch Bruchteile), Rate 0,125–8×, `startAtSec` (auf Takt bei `syncToBeat`). Danach Live-Übergaben: Wechsel an der nächsten Raum-Taktgrenze, Phase erhalten bei gleicher Quelle, Loop-Rec-Ursprung, Phasen-Handoff bei Live-Bar-Edit | **Ja, vollständig** |
| **D Kette bauen** | 501, 534–564 | Quelle (`phasePlayer.node` oder `BufferSource` mit `loop=true`) → Pitch-Worklet (`createMaterial(ctx, cents, startAt)`) → Gain `f` (Einblendung 8 ms) → StereoPanner → EQ (`__XenEQ.create(ctx, keyFor('material', id))`) → Ausgang | Nein |
| **E Routing** | 565 | Ausgang → `getRhythmBus(ctx)` + `ensureMyzelPostFxRouter` + Forge-Send | **Ja** (Ziel ist der Live-Rhythmus-Bus) |
| **F Bindungen** | 535, 561, 568 | `__xenBindMaterialPitch(node, id)`, `__xenBindMaterialPan(node, voiceId, primary)`, `__XenMaterialVoiceMix.registerTransport(id, player)` abonnieren den **Singleton** `__XenMaterialVoiceMix` mit Schlüssel **Material-ID** | **Ja** (Singleton und Schlüssel) |
| **G Start** | 566–568 | `phasePlayer.start(plan, offset, att, nudgeMode, id, feel)` bzw. `BufferSource.start` | Nein (Plan kommt aus C) |

**Befund:** Die Loop-Uhr steckt ausschließlich in **C** (Plan und Übergaben) und **E** (Ziel-Bus). **D** und **G** sind taktunabhängig und bekommen nur Zahlen: Startzeit, Loop-Bereich, Rate, Versatz. **F** ist das Identitätsproblem: Alles hängt am Singleton mit Material-ID.

## 2. Nahtstellen

| Naht | Heute | Für Raum IV | Eingriff im Live-Pfad |
|---|---|---|---|
| **N-A Quelle** | Cache pro Lane (`refs.cacheRef`) | Gemeinsamer Decode-Cache pro Kontext und Material-ID (mehrere Clips desselben Materials teilen PCM) | keiner (Raum IV benutzt `__materialAudioBlob` + `decodeAudioData` direkt) |
| **N-C Plan** | `zfe` + Übergaben | Neue Funktion `clipPlan(clip, transport)`: `startAtSec = transportStart + clipPos`, Loop-Bereich und Rate aus Clip und Tempo (Raster aus Verhältnissen), Versatz aus Clip-Offset | keiner (neu, im Lazy-Chunk von Raum IV) |
| **N-D Kette** | Inline in `$fe` | **Gemeinsamer Kettenbauer** `__xenMaterialLaneChain(ctx, source, opts)` → `{input, gain, pan, eq, output, dispose}` | **R1:** Herausziehen, `$fe` ruft ihn auf. Gleiche Knoten, gleiche Reihenfolge, gleiche Startwerte. |
| **N-E Routing** | Rhythmus-Bus, Myzel-Router, Forge-Send | Master-Eingang `arrangement` (neuer benannter Eingang am vorhandenen Master) | im Kettenbauer als Parameter `route(output)` |
| **N-F Bindungen** | Singleton `__XenMaterialVoiceMix`, Schlüssel Material-ID | Eigene Instanz, Schlüssel **Clip-ID** bzw. Spur-ID | **R2:** Fabrik `__xenCreateMaterialVoiceMix()`; `__XenMaterialVoiceMix = create()` bleibt die Live-Instanz. `__xenBindMaterialPitch/Pan` und `registerTransport` bekommen die Instanz als Parameter (Standard: Live). |
| **N-G Clip-Ende** | Loops enden nur durch Stopp/Wechsel | Clip endet zu einem Zeitpunkt | keiner: Gain-Fade auf `gain` zum Clip-Ende, danach `dispose()` per Timer (Phasen-Worklet kennt kein „stop at“; `BufferSource.stop(t)` geht nativ) |

**Bewusst nicht übernommen (nur Live):** Wechsel an der nächsten Raum-Taktgrenze (`__xenLRF55NextRoomBar`), Phasenerhalt, Loop-Rec-Ursprung, Live-Bar-Edit-Handoff, Primär-Owner (`__xenLRF52AdoptPrimary`), Grenze von 3 Spuren (`__XenMaterialLayers`).

## 3. Kleinste Umbauschritte im gemeinsamen Code

| Schritt | Inhalt | Umfang (geschätzt) | Prüfung |
|---|---|---|---|
| **R1 Kettenbauer** | Stufe D aus `$fe` in eine Funktion ziehen; Routing als Parameter | ca. 1–2 KB umgestellt, kein neues Verhalten | Live-Regressionsvergleich: gleiche Material-, Pitch-, Nudge-, EQ-, Pan-Einstellungen. Headless: Knotengraph-Topologie (Zahl und Reihenfolge der Knoten, Startwerte) vorher/nachher gleich, Pegelhüllkurve am Ausgang vergleichbar. Danach Abhören durch den Nutzer. |
| **R2 VoiceMix-Fabrik** | IIFE `__XenMaterialVoiceMix` → `__xenCreateMaterialVoiceMix()`, Live-Instanz unverändert benannt; Bindungen mit optionalem Instanz-Parameter | ca. 0,5 KB | Persistenz unverändert (`restoreSession`, Song Save lesen nur die Live-Instanz); Regler-Test Pitch/Pan/Vol/Nudge auf allen drei Live-Spuren |
| **R3 Kontext-Anspruch** | `LIVEZONE-02` hält den Live-Kontext in kalten Räumen an. Raum IV ist kalt für den Live-Bereich, **braucht aber den Kontext**. Daher eine zweite Eigenschaft: `__xenRoomUsesLiveContext(room)` (Forge: nein, Raum IV: ja); das Anhalten gilt nur, wenn der Zielraum den Kontext nicht beansprucht. | < 0,2 KB | `livezone_probe.js` erweitern: Forge weiter `suspended`, Raum IV `running` |

Der Modus-Owner (`live` / `mehrspur`) ergibt sich damit ohne eigenes neues Objekt: **Raum = Modus.** `__xenIsColdRoom` (Live-Bereich schläft) und `__xenRoomUsesLiveContext` (Kontext bleibt) beschreiben ihn vollständig. Der Taktgeber wird nicht umgeschaltet, sondern pro Raum gewählt: Live ruft `$fe` (Plan aus der Loop-Uhr), Raum IV ruft `clipPlan` und denselben Kettenbauer.

## 4. Offene Punkte vor R1

1. **Offline-Mixdown:** Läuft `__XenMaterialPhase` (Worklet `xen-material-phase-v1`) und `XenLaneShift` in einem `OfflineAudioContext` gleich? Die Module werden per `addModule` (blob/data-URL) geladen, was offline unterstützt ist. `__XenNudgeFeedback` und die Diagnose greifen aber auf `ctx.currentTime` und Timer zu. Vor dem Mixdown messen.
2. **64-MB-Grenze des Phasen-Players:** Längere Clips (ca. > 5,8 min Stereo bei 48 kHz) fallen auf den nativen Pfad zurück: kein Granular-Nudge, aber Pitch über `XenLaneShift` bleibt. Für Raum IV sichtbar machen, nicht still.
3. **Mehrfache Instanzen pro Material:** Der Live-Pfad nimmt höchstens eine Stimme pro Material an (Schlüssel = ID). Mit R2 kann Raum IV beliebig viele Clips desselben Materials haben. Die EQ-Schlüssel (`keyFor('material', id)`) dürfen für Raum IV **nicht** wiederverwendet werden, sonst teilen sich Live und Arrangement einen EQ-Zustand → eigener Schlüssel `keyFor('arrangement', spurId)`.
4. **Startlast:** `$fe` lädt Worklets und dekodiert beim Start. Raum IV sollte beim Öffnen eines Projekts vorbereiten (kalt, vor dem Abspielen), damit der Abspielstart heiß und leicht bleibt.

## 5. Empfehlung

Reihenfolge **R3 → R1 → R2**, jeweils eigener Patch mit Probe und Lieferung:
- R3 ist winzig und verhindert, dass der künftige Raum IV vom Schlafmodus erwischt wird.
- R1 ist der einzige Eingriff in den heißen Live-Pfad. Er ist reine Umstellung und braucht den Regressionsvergleich plus Abhören.
- R2 ist risikoarm, sobald R1 steht.

Danach beginnt der eigentliche Raum IV (Lazy-Chunk): Clip-Modell, `clipPlan`, Zeitleisten-Scheduler, Hülle.
