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

The frontend has no test runner today (only `npm run build` and `npm run lint`). Phase selection and
presentation policy are plain functions that deserve automated tests; adding a frontend test runner is a new
dependency and needs a decision before that work starts.

## Diagnosis view

Built automatically from the existing events and an authoritative Diagnosis event: a horizontal timeline with
vertically separated thematic lanes, with the Diagnosis event as a distinctive milestone. Lanes are
presentation groupings, never new clinical event types, and will evolve as they are tested against real
journeys.

Candidate lanes and the event types they would draw from today:

| Lane | Event types |
|------|-------------|
| Presentation | Symptom |
| Clinical Encounters | None yet: there is no visit or encounter event type. Decision and Note are the closest. To be decided. |
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

## Open decisions

- What the Clinical Encounters lane draws from (see the lane table).
- Whether the Journey views replace or sit beside the existing onboarding flow in
  `frontend/src/pages/journey/onboarding/`, which keeps its own page state and does not write events.
