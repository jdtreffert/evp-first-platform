# Journey design

Design intent for patient-centered rendering of the longitudinal journey. Journey views are derived
presentations of the existing `UnifiedEvent` collection. They are not separate clinical records and must not
become independent sources of clinical truth. The data rules are in
[.github/copilot-instructions.md](../.github/copilot-instructions.md); the field and relationship tables are in
[backend/docs/schema-tables.md](../backend/docs/schema-tables.md).

## Views

Initially: Summary, Diagnosis, Treatment, Surveillance. Diagnosis is built first and is the reference
implementation for the rendering architecture; Treatment and Surveillance extend it rather than becoming
separate visualization systems.

## Architecture

Keep these responsibilities separate:

`UnifiedEvent collection` → `Phase selection` → `Presentation policy` → `Journey view model` → `Rendering`

- **Phase selection** decides which existing events belong to a phase. It is independent of rendering so the
  rules can change without rewriting components. Do not copy events into phase-specific stored datasets.
  Base it on event type and date; explicit relationships (`Event_Related_UID`) are optional and may only
  enrich the result.
- **Presentation policy** translates event types into display properties: lane, icon, color or style, default
  label, relative importance, and expansion behavior. These are presentation properties, not clinical data.
  Keep event-type-specific visual decisions out of individual components. Unknown or newly added event types
  must degrade gracefully instead of failing to render.
- **Rendering** shows the view model. Chronology is the spine, thematic lanes organize, milestones give
  meaning, and interaction gives detail. Not every event needs equal prominence; prefer a clear overview with
  details on selection over putting every attribute on the timeline.

## Code layout

The frontend already separates `pages/` (routed screens), `components/` (reusable UI, grouped by area, for
example `components/events/`) and `api/`. Journey code extends that structure:

| Location | Holds |
|----------|-------|
| `frontend/src/pages/MyJourney.tsx` | The existing tab container; Journey views are added as tabs here |
| `frontend/src/pages/journey/` | One screen per view (for example the Diagnosis view), alongside the existing timeline and onboarding screens |
| `frontend/src/components/journey/` | Rendering components: timeline, lanes, milestones, event detail |
| `frontend/src/journey/` | Non-UI logic: phase selection, presentation policy, and the view model. No React and no rendering imports, so it stays independent of the visuals |
| `frontend/src/api/` | Fetching events, as today; views do not call the API directly from rendering components |

The existing `JourneyTimeline` and `components/events/` (event form, card, history) keep working as they do.
Journey rendering reuses `EventHistory` and `DocumentLink` for provenance and documents instead of
duplicating them.

The frontend runs unit tests with Vitest (`npm test` in `frontend/`). Phase selection and presentation policy
are plain functions and should have tests beside them in `frontend/src/journey/__tests__/`.

## Diagnosis phase selection

Implemented in `frontend/src/journey/diagnosisPhase.ts` (`selectDiagnosisPhase`), with tests. The rules:

- **Anchor:** the earliest dated Diagnosis event by default (ties broken by uid). When a patient has several,
  the caller can choose another with `diagnosisUid`, and `diagnosisCandidates` lists them for a switch. An
  unknown or non-Diagnosis uid falls back to the earliest. With no dated Diagnosis event there is no phase.
- **Membership:** every event dated on or before the Diagnosis date, except treatment events (event types
  starting `Treatment_`), earliest first, including the Diagnosis event itself. Dates compare as calendar
  dates; the time of day is ignored.
- **Undated events** are returned separately in `undated` and never placed in the phase, since an unknown date
  is unknown, not "before".
- **Relationships are not used.** Selection depends on event type and date only; links may later enrich it.

Consequences to be aware of: for a later Diagnosis event the phase also contains the earlier Diagnosis event
and everything before it, which is the literal rule; only `Treatment_` types are excluded, so Decision,
Imaging_Response, Recurrence, Progression and QoL dated on or before the Diagnosis date are included.

## Diagnosis view

Built automatically from the existing events and an authoritative Diagnosis event: a horizontal timeline with
vertically separated thematic lanes, with the Diagnosis event as a distinctive milestone. Lanes are
presentation groupings, never new clinical event types, and will evolve as they are tested against real
journeys.

Candidate lanes and the event types they would draw from today:

| Lane | Event types |
|------|-------------|
| Presentation | Symptom |
| Investigations | Imaging, Imaging_Response, Cystoscopy, Cytology, Lab |
| Procedures | Procedure, TURBT, Cystoscopy_Biopsy |
| Pathology & Molecular | Pathology, Somatic, Germline, ctDNA, utDNA |
| Diagnosis | Diagnosis |

## Summary and derived information

Summary information is derived from events, not entered separately. Examples: first recorded event, the
Diagnosis milestone, intervals between meaningful events, event counts, phase boundaries, treatment and
surveillance periods. Keep recorded facts, normalized facts, derived values, and presentation metadata
distinct, and keep derived values traceable to their events.

## Interaction

The app is interactive, not a static presentation. Selecting an event may show its date, type, structured
attributes, narrative details already in the record, provenance and edit history, linked documents, and
explicitly recorded relationships. Never generate medical interpretations or recommendations from a
selection. Favor plain terminology, visual clarity, accessibility, and progressive disclosure. Views respect
the role rules: patients see only their own record.

## Extensibility

Design so these can be added without restructuring the canonical model, but do not build them speculatively:
richer relationships, more phases, alternative visualizations, derived summaries, patient-entered context,
cross-event queries, consented population analysis, and LLM-assisted navigation.

## Encounters as a grouping dimension

An Encounter (see [backend/docs/api.md](../backend/docs/api.md#encounters)) is not a thematic lane and is not
an event type. Events keep their own lane and their own `Event_Date` position on the timeline; an encounter
is a grouping drawn at its `Encounter_Date` with connectors to the events that link to it, since members can
have different dates. Grouping uses only the recorded `Encounter_UID`, never date equality. Phase selection
is unaffected. In a phase, show only the members inside it, with a count of members outside. Selecting an
encounter shows its summary, date, type, documents and member events. The view model that groups events by
encounter belongs in `frontend/src/journey/`, separate from rendering.

Implemented so far: `groupTimeline` in `frontend/src/journey/encounterGroups.ts` (tested) arranges a
patient's events into entries that are either an encounter with its events or a single event. An event with
no encounter, or whose encounter is not loaded, is shown on its own, since a missing link means unknown.
Entries are ordered by the encounter's date or the event's own date, undated last. The timeline screen
renders it through `components/journey/EncounterGroupCard` as an optional "Group events by encounter" view,
showing the encounter and its documents once above its events. The lane renderer will reuse the same view
model; the "count of members outside the phase" belongs there and is not built yet.

## Open decisions

- Which lane Decision and Note belong in, now that there is no Clinical Encounters lane.
- Whether the Journey views replace or sit beside the existing onboarding flow in
  `frontend/src/pages/journey/onboarding/`, which keeps its own page state and does not write events.
