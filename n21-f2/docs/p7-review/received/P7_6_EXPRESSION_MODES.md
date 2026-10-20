# P7.6 – B + Left Alt: Ausdrucksmodus umschalten

## Basis und Umfang

Diese **isolierte Stufe 14** setzt **nach** Patch 13 (P7.5) an. Die bisherige funktionsfähige Engine (RFL / C11 / Drone / Bass Grid / Forge / Nodal / Keyboard-Tonhöhen) bleibt unverändert. Änderungen liegen in genau drei Audio-/UI-Quellmodulen, einem aktualisierten `source-index.json` und einem neuen Verhaltenstest. **Kein neuer AudioNode, kein Scheduler und kein zusätzlicher RAF-Loop.**

## Verhalten

- Standard **PEDAL**: B erhöht bei gehaltenem Tastendruck die Anschlagsdynamik neu ausgelöster Keyboard-Töne, linkes Alt senkt sie; nach Loslassen sanfte Rückkehr zum Neutralwert.
- **KNOB**: dieselben Rampen wirken als bleibender Keyboard-Ausdrucksoffset; beim Loslassen bleibt dieser Wert erhalten.
- **B + linkes Alt** (in beliebiger Reihenfolge) schaltet einmal zwischen beiden Modi um. Browser-Tastenwiederholungen und kurzes Freigeben nur einer Taste dürfen **keinen** zweiten Umschaltvorgang verursachen. Für einen weiteren Wechsel müssen beide Tasten erst vollständig losgelassen werden.
- Während der beiden gleichzeitig gedrückten Tasten findet keine Lautstärkerampe statt. Beim Umschalten wird der vorige Ausdrucksoffset neutralisiert, damit keine Pegelwerte unbemerkt zwischen Modi übertragen werden.
- **AltGr bleibt unberührt.** `Space` bleibt für Keyboard/Fundament-Entkopplung belegt.
- Englische Legende und Hover erklären die Kombination. Eine kleine Anzeige bei den vorhandenen Ausdrucks-Icons zeigt `PEDAL`/`KNOB`.

## Testnachweise

1. `node tests/p7_6_expression_mode.cjs`: zunächst RED auf P7.5, danach GREEN; testet tatsächlichen `Zke`-Hook mit beide Press-Reihenfolgen, Single-Shot, gehaltener Kombination, Pegelrampen, Loslassen und Modusrückkehr.
2. Bestanden: `p7_4_keyboard_contract.cjs`, `p7_4_repeat_pointer.cjs`, `p7_live_grid_space_behavior.cjs` (17 Szenarien), `p7_core_smoke_without_preservation.cjs` (10 Domänentests), `p7_5_forge_main_handles.cjs`, `p7_2_source_index_freshness.cjs`.
3. Original `build.cjs` und `build.cjs --verify`: grün, Ausgabe-SHA laut Patchmanifest.
4. Chromium via inhaltsbasierter Testumgebung (`page.set_content` mit temporärem localStorage-Shim): Power On -> B/Alt PEDAL→KNOB -> Alt/B KNOB→PEDAL; keine JS-Pageerrors. Die Umgebungsrichtlinie verhinderte normale Navigations-URLs, weshalb das keine vollständige Opera-Abnahme ersetzt.

## Verbleibende Grenzen / explizit nicht versprochen

- Ausdrucksregelung beeinflusst bislang **neue Anschläge**, nicht den Lautstärkepegel bereits laufender Stimmen: kein zusätzlicher Live-VCA.
- Eine Session-übergreifende Speicherung des Ausdrucksmodus ist nicht vorgesehen; Startmodus ist stets `PEDAL`.
- Bei gedrücktem linkem Alt ist Opera/Ubuntu-Menü-Handling als realer Hardware-Test weiterhin offen.
- Der historische Preservation-Testkonflikt aus Patch 00 bleibt unverändert dokumentiert; Patch 14 betrifft ihn nicht.
