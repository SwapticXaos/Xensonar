# src/components

**Purpose:** Presentation-only UI components (e.g. shared buttons, modals, layout primitives). No domain room implementations.

**Room placement:** Domain rooms live under `src/features/<domain>/` or `src/game/<package>/`. Do not add room re-export shims or room components here. AppRoomContent imports canonical paths from features/ and game/ only.

**Reference:** `docu/DeVmeSH/CLUSTER-project-structure-module-placement-v1.md`
