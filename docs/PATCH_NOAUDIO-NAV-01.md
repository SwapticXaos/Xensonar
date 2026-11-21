# NOAUDIO-NAV-01 · Spectral Forge ohne Audio: UP/UPPER arbeiten, nichts ist ausgegraut · Kachel-Auswahl milder

Parent: `c86e866` (`index.html` 8 365 560 B). Jetzt 8 366 775 B (+1,2 KB). Zone: WARM (Oberfläche). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshot, echte Klicks). **Nicht gehört.**

## 1. Leere Spectral Forge (NO SIGNAL / NO SOUND, noch kein Import)
Befund (Nutzer): Alle unteren Tasten sahen ausgegraut aus, und UP/UPPER taten nichts, obwohl sie ohne Audio funktionieren könnten (sie scrollen nur).
Ursache: `src/rooms/00_empty_audio_p32.js` setzte `inert:true` auf den **ganzen** Rack-Bereich (und CSS `opacity .83`, `saturate .82`, `pointer-events:none`), dazu wirken die einzelnen Tasten durch ihr `disabled` gedimmt. UP und UPPER (`xen-forge-up-triangle`, `xen-forge-upper-triangle`) sind immer aktive Tasten desselben Racks und waren deshalb mit blockiert.
Änderung:
- Das Rack ist **nicht mehr als Ganzes inert**. Stattdessen setzt ein Effekt (mit `MutationObserver`, damit auch später gerenderte oder geänderte Tasten erfasst werden) `inert` an **jedes Bedienelement außer UP/UPPER**: kein Fokus, kein Klick, kein Erst-Kontakt-Nebeneffekt. Gemessen: 13 von 13 übrigen Tasten inert, UP/UPPER nicht.
- **Normales Aussehen:** Rack ohne Abdunklung (`opacity 1`, kein Filter), `disabled`-Tasten ohne Dimmung (`040_xen-p9-m9-cockpit-canonical.css`, Zeigerform ohne Hand). Die alte Anzeige (NO SIGNAL, NO SOUND, Taktometer, alle Tasten) bleibt unverändert.
- UP/UPPER: `pointer-events:auto`; gemessen: Klick auf UPPER ohne Audio scrollt von 1005 px zum Seitenanfang. Die Tasten, die noch nichts können (z. B. Apply Raw), tun beim Klick nichts.

Tests: neu `tests/e2e/forge_noaudio_nav.cjs` (UP/UPPER aktiv und scrollen, alle übrigen inert und nicht gedimmt, Klick auf Apply Raw ohne Wirkung). **Drei Quelltext-Tests prüften den alten Vertrag „ganzes Rack inert“** (`test_forge_shared_inert_r14.cjs`, `test_forge_donor_animation_p33.cjs`) und sind auf den neuen angepasst (jede Taste einzeln inert außer UP/UPPER, Wrapper mit `ref` statt pauschalem `inert`). Grün außerdem im Bereich: `test_forge_empty_state_compact_p34`, `test_forge_first_contact_name_parity_r13`. Keine Suite.

## 2. Kacheln Spectral Forge / Melodic Loop
Die nicht gewählte Kachel ist nur noch **leicht** abgedunkelt (Helligkeit 0,8, Sättigung 0,82; vorher 0,58/0,65, Hover 0,95), die gewählte klar umrandet (weißer 2-px-Rahmen innen) und etwas heller (1,1). Nur CSS.

Rollback: `c86e866`.
