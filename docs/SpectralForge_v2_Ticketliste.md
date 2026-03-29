# Spectral Forge v2 – Ticketliste

## Phase 1 – Werkzeugprofile
- [x] Tool-Profile als eigene Zustände pro Werkzeug anlegen
- [x] `setActiveTool` lädt Profil des Zielwerkzeugs
- [x] `updateToolSettings` schreibt nur in Profil des aktiven Werkzeugs zurück
- [x] Morph-Defaultgröße als Werkzeugprofil setzen
- [x] Harmonic-Brush-Defaultgröße als Werkzeugprofil setzen

## Phase 2 – Stempelbibliothek v2
- [x] StampPreset-Metadaten erweitern (`tags`, `spectralRole`, `pitched`, `percussive`, `decayType`, `recommendedRenderModes`, `defaultSize`, `defaultIntensity`)
- [x] Kuratierte pitched/percussive Decay-Presets ergänzen
- [x] Toolbar zeigt Metadaten und Kategorie-Filter an
- [x] Laden eines Presets übernimmt empfohlene Größe/Intensität ins Stempelprofil

## Phase 3 – Projektbibliothek
- [x] Persistente Forge-Projektbibliothek via IndexedDB
- [x] Projekt-Snapshot aus Forge-Store erzeugen
- [x] Snapshot zurückladen können
- [x] Projektliste sortieren / laden / löschen
- [ ] Optionaler externer Projektordner (später)

## Phase 4 – Bildimport-Vorbereitung
- [ ] Bildimport-Mapping in Code einführen
- [ ] Luminanz → Amplitude, Zusatzebene → Körnung
- [ ] Importpfad für Bilddateien
