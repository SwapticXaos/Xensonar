# ARP-HOLD-01 · Obertons-Arpeggio klassischer Klänge auf der Hold-Uhr

**Zone:** HEISS (erster Anschlag einer gehaltenen Taste; Tonform der C11-Stimme). Ohne Hold, bei Loose und beim Muster „random“ bleibt alles unverändert.
**Dateien / Owner:**
- `src/app/forge/01_room_shell.js`: Arpeggio-Berechnung als gemeinsame Funktion `__arpEntries`; Timer-Weg `Dr` unverändert in der Wirkung; neuer Sofort-Weg `__arpNow`.
- `src/audio/05_live_voice_runtime.js`: `nq` nutzt den Sofort-Weg beim ersten Anschlag einer Hold-Sitzung.
- `src/audio/entrophon/02_worklet_and_voice_backend.js` (`ewe`) und `src/01_app_runtime.js` (`__wave39Scheduled`, `__wave39FillTone`): Markierung `c11Arp`.
- `src/audio/hold_resident.js`, `src/audio/hold_modulation.js` und der C11-Worklet: bis zu 24 statt 8 Bausteine je Geste.
- Owner der Übernahme bleibt `__XenHoldResident`.
**Größe:** `index.html` +1 393 Bytes (8 291 614 → 8 293 007).

## Befund
Bei eingeschaltetem Obertons-Arpeggio (Modus Arp oder Hybrid) lehnte die Hold-Uhr klassische Klänge immer ab, und der Hauptthread spielte jeden Schritt (gemessen 22/22, auch bei Exact). Die Arpeggio-Töne liefen als WebAudio-Oszillatoren über einen 20-ms-Timer und waren für die Uhr nicht erfassbar.

## Änderung
- Beim ersten Anschlag einer gehaltenen Taste (Exact) werden die Arpeggio-Töne sofort gespielt. Töne, Plan, Ziele und Länge sind dieselben wie beim Timer; sie laufen aber als C11-Stimmen innerhalb der Hold-Sitzung. Damit werden sie mit der Note erfasst, und die Uhr wiederholt die ganze Note samt Arpeggio (Nodals Mechanismus).
- Die C11-Stimme bekommt für diese Töne die Hüllkurve des Timer-Wegs (`source:"other"`): Ausklingen ab `max(Anschlag, Dauer − A)`, Zeitkonstante `A·0,34`, als energiegleiches C11-Ausklingen von 1,5 Zeitkonstanten. Ohne diese Angleichung trug die C11-Stimme rund doppelt so viel Energie, weil sie die Wave-Hüllkurve nachbildet.
- Muster „random“ bleibt auf dem Timer, damit jeder Anschlag neu gewürfelt wird. Ohne Hold-Sitzung (Loose, einzelne Anschläge) ändert sich nichts.

## Messung (Lautsprecherausgang, FM Bell, Taste i, Arpeggio 3 Teiltöne/8 Schritte/updown/64tel)
- **Dünnes Muster** (ein Anschlag pro halbem Takt, 12 s), je 3 Läufe. Arpeggio-Energie als Differenz mit/ohne Arpeggio:
  | | mit Arpeggio | ohne Arpeggio |
  |---|---|---|
  | vorher | 23 881 / 25 998 / 25 746 | 3 201 / 3 202 / 3 224 |
  | nachher | 26 266 / 29 255 / 20 970 | 3 236 / 3 238 / 3 228 |

  Im Mittel 25 208 gegen 25 497.
- **Dichtes Muster** (16 Schritte), je 3 Läufe: rms vorher 0,212 / 0,210 / 0,225, nachher 0,231 / 0,190 / 0,220. Klangschwerpunkt vorher 394–470 Hz, nachher 374–449 Hz.
- **Uhr:** Hauptthread 2 Schritte, Uhr 20, kein Verlust, auch bei blockiertem Hauptthread (je Geste 10 erfasste Bausteine: 2 Töne + 8 Arpeggio-Schritte).
- Nicht gehört. Unterschied, der bleibt: Die Uhr spielt jeden Arpeggio-Ton. Der Timer verlor unter dichter Last Töne (Stimmenlimit der Quelle „other“: 14) und stotterte.

## Tests
- Neu: `tests/e2e/hold_arp_classic.cjs` (Mess-Klasse): rot auf dem Parent (Hauptthread 22/22), grün danach.
- Weiter grün (siehe Status): `hold_quiet_classic`, `thunder_one_clock`, Build-Check, `run_tests.sh`, `run_e2e.sh`.

Rollback: `839293a`.
