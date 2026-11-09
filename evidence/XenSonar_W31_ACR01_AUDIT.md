# XenSonar W31 — ACR01 Firefox-Audio-Curve-Recovery
**08.11.2026 · Isolierter Fehlerfix auf W31 · Status: QA_PENDING**

## 1. Ausgangslage

Nutzerfehler: `XenSonar needs recovery. An application rendering error was contained. ... AudioParam.setTargetAtTime: Can't add events during a curve event.`

**Parent:** `XenSonar_W31_MILESTONE_INTEGRATED_QA_PENDING.html` SHA-256 `53b9d3f4639176037ecd7d646c15c95ea5cdae91932df04a655cc8249c626dc3`.
**ACR01:** `XenSonar_W31_ACR01_FIREFOX_AUDIO_CURVE_RECOVERY_QA_PENDING.html` SHA-256 `90a884f88679cbd98c5e43ac573a18071780d98a25bfb4bcd1fac9d7df47a978`.
Parent bleibt unverändert. Der isolierte Patch lässt sich bytegenau auf Parent anwenden (`patch --fuzz=0`), reproduzierbare Erzeugung mit `apply_audio_curve_recovery.py` (SHA-256-Parent-Guard).

## 2. Technische Ursache

Die problematische Sequenz lautet: Auf einem wiederverwendbaren `AudioParam` wird `setValueCurveAtTime()` geplant; bei Stop/Reset/Neusynchronisation wird die laufende Automation mit `cancelScheduledValues()` oder `cancelAndHoldAtTime()` angehalten; anschließend wird `setTargetAtTime()` oder `setValueAtTime()` auf demselben Parameter aufgerufen. Firefox kann eine bereits laufende `setValueCurveAtTime`-Kurve beim Abbruch weiter als aktives Kurvenereignis behandeln und weist die neue Automation zurück. Daraus entsteht exakt die gemeldete `AudioParam.setTargetAtTime`-Exception. Die Exception kann beim Durchreichen über React-Effekt-/Render-Lifecycle im vorhandenen Fatal Error Boundary landen und die Recovery-UI zeigen.

**Stelle A — Refucktor/Step Wobble:**
- `__xenRefucktorFillPattern` zeichnet 64-Sample-Step-Shapes auf `fx.stepShape.gain` mit `setValueCurveAtTime`.
- `__xenRefucktorStopPattern` und das Resync nach Zeit-/Modusänderungen setzen denselben Pegel anschließend mit `setTargetAtTime(1,now,...)` bzw. `setValueAtTime` neu.
- Triggerfamilie: Stop bei aktiver Step-Kurve; schnelles Umstellen/Wiedereintreten/hohe BPM oder wiederholtes Umschalten, während die Kurve aktiv ist.

**Stelle B — Root Follower / Material-Crossfades:**
- `__xenLRF53Fade` zeichnet die C1-Smoothstep-Kurve als `setValueCurveAtTime` auf den Gain-Parameter des wiederverwendeten Materialpfads.
- `__xenLRF5MaterialFadeOld` stellt beim Rücknehmen einer geplanten Überblendung denselben Gain mit `setTargetAtTime` wieder her.
- Triggerfamilie: Materialwechsel, Rücknahme/Überschreiben eines geplanten Crossfades, schnelle Wechsel um die 24-ms-Überblendung.

**Nicht behauptet:** Ohne Stacktrace/Triggerprotokoll aus dem echten Firefox-Lauf ist nicht eindeutig geklärt, welche dieser beiden Aufrufketten die konkreten Nutzerscreens auslöste. Beide enthalten jedoch das *nachgestellte* Fehlermechanismus-Muster, und beide sind korrigiert.

## 3. Versions- und Patchrückverfolgung

- **30.10.2026, M8.1** (`XenSonar_M8_1_Meta_Menu_Starter_Preload_PROVISIONAL.html`): Refucktor-`__xenRefucktorStepCurve` und -Stoplogik bereits vorhanden; `__xenLRF53Fade` und `__XenFatalBoundary` dort noch nicht vorhanden. Der ursprüngliche Refucktor-Einführungspatch konnte aus diesem Vergleich allein nicht bestimmt werden.
- **30.10.2026, M8.2 `WS-GUARD-01`** (Handoff `XenSonar_M8_2_WhiteScreen_RoomGuard_HANDOFF_2026-10-30.md`): Einführung der React-Recovery-Boundaries. Die Schutzoberfläche *enthält* einen Fehler, löst die Audio-Exception aber nicht aus. Vorher hätte ein vergleichbarer React-Lifecycle-Fehler als leerer Root/White Screen erscheinen können; ob er tatsächlich auftrat, ist nicht aus früheren QA-Läufen ableitbar.
- **Bis 31.10.2026, LRF5.3/5.4**: `__xenLRF53Fade` ist in `XenSonar_LRF54_BAR_LENGTH_HANDOFF_TEST.html` enthalten und in M8.1 noch nicht. Damit kam diese zweite kritische Sequenz nach dem geprüften M8.1-Baselinezeitpunkt und spätestens zum LRF5.4-Snapshot hinzu.
- **01.11.2026, LRF5.5**: `LRF55_NEXT_BAR_HANDOFF.md` dokumentiert das 24-ms-Material-Überblendfenster. Die Konfliktsequenz ist im LRF5.5-HTML vorhanden.
- **07./08.11.2026, W30C / W31**: Beide verdächtigen Funktionskörper sind in W31 und den untersuchten W30C-Versionen byteidentisch, unter anderem W30C Wave Editor konsolidiert, ED1 TechDebt02, GM01/VG01 und MRU01/FF01. Die W31-Konsolidierung ist somit nicht die Einführung der ursächlichen beiden Implementierungen.

## 4. Reparatur

Eine lokale Helper-Funktion `__xenCurveSafeRamp(param,curve,at,seconds)` kompiliert die **bestehenden** samplebasierten Hüllkurven in zeitlich platzierte `setValueAtTime` + `linearRampToValueAtTime`-Stützstellen. Adaptive Douglas–Peucker-artige Fehlerbegrenzung (`precision=.004` relativ zur jeweiligen Kurvenamplitude) erhält harte Chop-Kanten und beschleunigt glatte Abschnitte. Keine fortdauernden `setValueCurveAtTime`-Ereignisse mehr an den zwei *retargetbaren* Gain-Parametern.

Die anderen 13 `setValueCurveAtTime`-Vorkommen im gebündelten W31-Code bleiben bewusst unberührt, weil sie überwiegend auf kurzlebigen per-Voice/per-Grain-Parametern liegen oder keine nachgewiesene identische Stop-/Retarget-Kette besitzen. Ein pauschales Ersetzen wäre unerwünschter Eingriff in DSP/Klang. Dieser Patch ist kein Freispruch für sämtliche anderen Audio-Automationspfade.

## 5. Tests / Evidenz

- **RED (W31 unverändert):** `node test_audio_curve_recovery.cjs W31.html` → **6 FAIL** (darunter dreimal der exakte Firefox-Fehlertext bzw. dieselbe kollidierende Automation). In `ACR01_TESTS_RED.log`.
- **GREEN (ACR01):** identische sechs Proben → **6 PASS**. Stop während Kurve, schnelles Resync, Material-Crossfade-Rücknahme, Endpegel/Dauer, Hochtempo-Stresstest (75 Wiederholungen), Abbruch vor/innerhalb des Übergangs. `ACR01_TESTS_GREEN.log`.
- **Adversarial negative controls:** jeweils absichtlich entfernte Refucktor- oder LRF-Fix-Aufrufstelle löst erneut die zugehörigen roten Tests aus.
- **PCM-Vergleich:** Echter Chromium `OfflineAudioContext` bei 48 kHz, Original-ValueCurve vs. ACR01-Stützstellen; sechs Hüllkurvenformen geprüft: Material rise/fall, Refucktor sweep/chop/ramp/double; maximale absolute Sample/Pegelabweichung **0.00269294** in linearer Amplitude; Chop **0.00000352**. Datei `ACR01_PCM_PARITY.json`.
- **JavaScript-Syntax:** alle **32** ausführbaren Inline-Skriptblöcke von ACR01 mit Node parsebar.
- **React-Smoke-Test:** originaler W31 und ACR01 rendern in Headless-Chromium `page.set_content()` jeweils Main Room, Root sichtbar, kein Recovery, keine `pageerror`. In der Test-Origin `about:blank` erscheint bei beiden die vorbestehende IndexedDB SecurityError-Warnung, nicht als ACR01-Regression zu werten.
- **Patch-Lineage:** W31 + isolierter `.patch` mit `--fuzz=0` entspricht bytegenau ACR01-SHA-256.

## 6. Grenzen / Release-Gate

**TECHNISCH GEPRÜFTER QA-KANDIDAT, KEINE FIREFOX-LIVEABNAHME.** Die hier verfügbare Laufzeit hat keinen echten Gecko/Firefox-Browser, keine reale Firefox IndexedDB-Origin und keine reproduzierte ganze Nutzersitzung mit diesem React-Crash. Ein Firefox-User-Agent in Chromium wäre keine Firefox-Prüfung. `file://` wird in der Headless-Testumgebung administrativ blockiert. Für echte Abnahme sind originale Firefox- und Chromium-Läufe mit Reproduktionsgesten (Step Wobble stoppen, BPM-Wechsel, Material-Crossfade während Wechsel rückgängig) nötig. Besonders prüfen: kein Recovery, keine Konsole-Exception, gleiche Klänge/Timing, weiterhin bestehende Sessions und Storage. Bei erneutem Auftreten Firefox-Konsole bzw. `window.__XenRoomCrashLog` sichern.

### Adversarial User-Rejection-Gate

1. **„Crash weg, aber Chop klingt anders“** → PCM-Vergleich mit harter Kante, max 3.52e-6 für Chop: im simulierten Audiovergleich nicht bestätigt; echter Klangabgleich bleibt Nutzer-/Hardware-Test.
2. **„Schnelles Umschalten verursacht wieder Recovery“** → 75 schnelle Reschedules / Material-Rücknahmen incl. timing cases: simuliert PASS; echte Firefox-Frequenz/Mouse-Race noch offen.
3. **„Die UI startet gar nicht / meine Arbeit ist weg“** → Browser-Mount und unveränderte Persistenzfunktionen geprüft, keine Session-Migration; echter IndexedDB-Workflow hier nicht zugänglich.

**Verdikt: PROVISIONAL / QA_PENDING bis echte Firefox-Abnahme.**
