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

Lanes and the event types in them, from the presentation policy in
`frontend/src/journey/presentationPolicy.ts` (tested; a new event type in the schema fails a test until it is
given a lane or listed as unassigned). Lanes are drawn in this order, and only those that have events:

| Lane | Event types |
|------|-------------|
| Treatment | Treatment_Start, Treatment_Delivery, Treatment_Change |
| Response & Disease Status | Treatment_Response, Recurrence, Progression |
| Symptoms & Experience | Symptom, QoL |
| Investigations | Lab, Imaging, Imaging_Response, Cystoscopy, Cytology, ctDNA, utDNA |
| Procedures | TURBT, Cystoscopy_Biopsy, Procedure |
| Pathology & Molecular | Pathology, Somatic, Germline |
| Context & Self-Management | Note |
| Decisions & Milestones | Diagnosis, Decision, Disease_Status |

Every registered event type now has a lane. Unknown or newly added types are drawn in an "Other" lane, after
the assigned lanes and only when it has events, so nothing silently disappears. A lane is chosen by event
type, never by attribute values.

**Milestones** are drawn as diamonds: Diagnosis, Treatment_Start, Treatment_Change, Treatment_Response,
Recurrence, Progression and Disease_Status (which has its own marker, see below). They are the points where
evidence from other events becomes a decision or a conclusion. Because the choice is by event type, every
Treatment_Change is a milestone, including the one that records that treatment is completed. Deliveries,
imaging, labs and the like are ordinary markers.

One recorded value also makes a milestone: a **Decision of type "Complete response confirmed"** is drawn as a
milestone diamond and labelled by what it records, consistent with a Disease_Status being a milestone. It stays
in the Decisions & Milestones lane, and every other Decision keeps the ordinary marker and the label "Decision".
This is `presentationForEvent` in the presentation policy; `presentationFor(type)` is unchanged and the lane is
still chosen by type alone.

The policy also owns the display name of each event type (for example "Lab work") and the lane colors.

## Treatment phase selection and view

Implemented in `frontend/src/journey/treatmentPhase.ts` (`selectTreatmentPhase`) and
`frontend/src/journey/treatmentView.ts` (`buildTreatmentView`), both tested, with a Treatment tab in My Journey.
The scope is one treatment course per journey: a later course after progression would be a new journey.

- **Membership:** every `Treatment_` event, whatever its date (the Diagnosis phase leaves them out), plus every
  other event dated after the Diagnosis date, up to the end of treatment. The Diagnosis is the one the
  Diagnosis view uses. With no Diagnosis recorded, the phase starts at the first treatment event.
- **End:** recorded, never inferred. Treatment ends when the latest Treatment_Change of type "Treatment
  completed" is not followed by a start, delivery or other change dated after it. Without that, treatment is
  ongoing and the phase is open-ended. A delivery on the same day as the completion does not re-open it.
- **Response belongs to the course:** Treatment_Response events stay in the Treatment phase, even when dated
  after the completion. Other events after the completion belong to Surveillance (below).
- **Partition:** the Diagnosis, Treatment and Surveillance phases never share an event, and together hold
  every dated event (a test checks this). Undated events are reported, never placed.
- **View:** `buildTreatmentView` reports the Diagnosis it follows, the completion that ends it (or ongoing), the
  lanes and the encounter connectors, using the same composition, layout and timeline as the Diagnosis view.
  An infusion visit shows as a line joining its delivery, lab and ctDNA across lanes.

## Post-treatment Surveillance phase selection and view

Implemented in `frontend/src/journey/surveillancePhase.ts` (`selectSurveillancePhase`) and
`frontend/src/journey/surveillanceView.ts` (`buildSurveillanceView`), both tested, with a "Post-treatment
Surveillance" tab in My Journey (the code keeps the shorter name Surveillance). It uses the same composition,
layout and timeline as the other phases.

- **Membership:** every non-`Treatment_` event dated after the day of the recorded Treatment completed.
  Treatment_Response events stay in the Treatment phase. The phase exists only once a completion is recorded,
  by the same rule the Treatment phase uses; the phase itself is never inferred from silence.
- **Statuses:** the selection reports `no-treatment`, `treatment-ongoing`, `no-events-yet` or `ready`, and the
  tab explains each of the first three instead of drawing an empty timeline.
- **Reference line:** a dashed, labelled vertical line marks the completion on the axis (`PhaseReference` in
  `phaseView.ts`), and the axis starts there so elapsed time since treatment is readable. References are a
  general mechanism a later view can reuse.
- **Facts shown:** the latest event, the days from completion to it, and the first Progression or Recurrence
  with the days to it. These are read from recorded dates only. "No Progression or Recurrence has been
  recorded" means nothing is in the record, not that none occurred.
- **Recording a recurrence or progression:** Recurrence and Progression are ordinary events (location, spread,
  modality, confirmation or stage change, notes). Each offers a picker for the evidence it was recognised from
  (imaging, cystoscopy, biopsy, cytology, pathology, ctDNA, utDNA, up to 90 days before) with the relationship
  `Derived_From`. The link is optional; without it the event still appears at its date.
- **Duration of complete response:** `assessCompleteResponse` in `frontend/src/journey/completeResponse.ts`
  (tested, no React). The platform does not define complete response; the community has not settled one and
  trials may. It starts at the earliest dated Decision of type "Complete response confirmed", the decision of the
  patient and care team, so the date is whatever definition they applied, and the Decision's notes and
  `Event_Related_UID` can record the basis. Changing the definition means editing that date (the history keeps the
  earlier one) and the duration follows. It ends at the first dated Recurrence or Progression on or after the
  confirmation, in any phase. With none recorded it is "ongoing" and reports the days elapsed to a date the caller
  passes (the tab passes today), described as elapsed time, never as a record that the response held. With no
  confirming decision no duration is shown. The confirmation is a second reference line on the timeline; labels
  stack on a lower row only when they would overlap.
- **Lanes and encounters** are as in the other views. Serial scans, labs and ctDNA at a visit are joined by
  the visit's encounter line.

Settled: ctDNA and utDNA stay in Investigations (utDNA is used in research and trials and is not yet generally
available or reimbursed, so it will be sparse), and Progression and Recurrence are milestones.

## Diagnosis view model

`buildDiagnosisView` in `frontend/src/journey/diagnosisView.ts` (tested, no React) combines the phase selection,
the presentation policy and the patient's encounters. Given the current events and encounters it returns:

- `lanes`: only the lanes that have events, in the agreed order with Other last; each lane's events earliest
  first, each carrying its presentation (name, lane, milestone), its own calendar date and its encounter.
- `milestone`: the Diagnosis event the view is built around, with `diagnosisCandidates` for switching.
- `encounters`: one connector per encounter that has events in the phase, ordered by the encounter's date, with
  its in-phase `members`, the `laneIds` they sit in, `crossLane` (a line across lanes is needed), and
  `outsideCount` (members of the encounter outside the phase, among the events given).
- `range`: the dates the axis must cover, which includes an encounter dated outside its members' dates.
- `undated`: events with unknown dates, never placed.

Rules it keeps: events are placed by their own date and never moved to their encounter's; membership comes only
from the recorded `Encounter_UID`, never from shared dates; an event whose encounter is not loaded renders
normally; nothing it is given is changed. A renderer draws a line at the connector's date joining members in
different lanes, with a short tick to any member dated differently.

## Diagnosis timeline (first rendering)

The My Journey page has a Diagnosis tab (`pages/journey/JourneyDiagnosis.tsx`). It loads all of a patient's
events and encounters, builds the view model, lays it out (`frontend/src/journey/diagnosisLayout.ts`, tested
geometry with no React) and draws it with `components/journey/DiagnosisTimeline.tsx`:

- A row per lane (only lanes with events), a month axis, and a marker per event colored by its lane. The
  Diagnosis is a larger diamond. Events are placed by their own date in proportion to the days between them;
  events of one lane that would overlap move to separate rows.
- Each encounter with two or more events in the phase gets a vertical line at its date across the lanes of its
  members, with a short dashed tick to any member dated differently.
- Selecting an event shows its normal card below (details, provenance, documents, history, its encounter).
  Selecting an encounter line shows the encounter, its documents and its in-phase events, and how many of its
  events fall after the Diagnosis. Every marker and line is a keyboard-focusable button.
- When a patient has several Diagnosis events, a selector chooses which one the view is built around.
- Read-only. Events without a date are listed as not placed, never guessed at.

Known limits of this first version: no zoom or pan beyond horizontal scrolling, no fixed lane labels while
scrolling a very long phase, and the Diagnosis tab covers only the Diagnosis phase.

## Marker labels, status and abbreviations

To keep timelines compact, each marker carries a short label (`compactLabel` in the presentation policy)
instead of the full type name; the full name, date, summary and any recorded status stay in the hover text and
the detail panel. Events use the name of their type, except treatment deliveries, which are labelled from their
data: a radiation dose by dose and units ("2 Gy", "180 cGy"); anything else by the treatment's short name with
the cycle when recorded ("EV C2", "pembro C3"); and "Delivery" when no treatment is named. A drug dose is not
put on the marker.

- **Abbreviations** live in `frontend/src/journey/treatmentLabels.ts`, one entry per Treatment_Name option, each
  with an optional short name and full name. A test fails when an option is added to the schema without an
  entry, so a new treatment needs a labelling decision. The wording for "Gemcitabine intravesical" and
  "Docetaxel intravesical" is not decided, and they keep their full text for now.
- **Legend:** the Treatment view lists the abbreviations its markers use, with full names, for readers who
  do not know them ("EV = Enfortumab vedotin").
- **Status:** a delivery recorded as Held, Interrupted, Partially Delivered or Not Completed is drawn as a
  hollow marker. A missing or unknown status is never drawn as incomplete.
- **Packing:** events in a lane go on separate rows only when their labels would overlap, using each label's
  estimated width, so short labels pack much closer than long ones. Marker sizes are shared between the layout
  and the renderer so the two cannot drift apart.

Possible later steps, not built: collapsing a dense run of identical events into one expandable marker, and
icons (for example a bag for an infusion, a scanner for imaging, a vial for a lab) with color for the agent.
Color must not be the only carrier of meaning, so the abbreviation stays beside any icon.

## Disease status

`Disease_Status` is an explicit, dated, provenance-backed assessment of the patient's disease status, entered by a
person or taken from a source: a category (No evidence of disease; Indeterminate or suspicious; Disease present;
Unknown), and optionally an extent, the basis for the status, the confidence the source stated, and notes. It
summarizes evidence; it does not replace, copy or change the evidence events (imaging, cystoscopy, biopsy,
cytology, pathology, ctDNA, utDNA, Treatment_Response, Recurrence, Progression). It is distinct from
Treatment_Response (response to treatment), Recurrence (disease returning) and Progression (existing disease
growing or spreading).

Rules that every view and later feature must keep:

- **Never inferred and never created automatically.** Not from a Treatment_Response of CR, negative imaging,
  a normal cystoscopy, negative cytology or pathology, undetectable ctDNA or utDNA, the absence of Recurrence or
  Progression, notes, or matching dates. A future prompt may invite the user to review status when new evidence
  accumulates; it must never silently create or change an event. Existing patients get no synthesized status.
- **The category alone chooses the label** (`diseaseStatusLabel` in the presentation policy): "No evidence of
  disease", "Indeterminate or suspicious", "Disease present", "Disease status unknown". Notes, summary, extent and
  confidence never do. A missing or unrecognised legacy value is drawn under the type name "Disease Status".
- **No effect on phases.** It does not define or move the Diagnosis, Treatment or Post-treatment Surveillance
  boundaries; it sits in the phase its own date falls in, whatever its category.
- **Presentation:** a milestone in Decisions & Milestones (provisional; Response & Disease Status is the other
  candidate, and moving it is a change to the presentation policy only), drawn as a diamond with an inner ring,
  the same size and lane color as the other milestone diamonds.
- **The latest status is a statement about its date.** `summarizeDiseaseStatus` and `describeDiseaseStatus`
  (`frontend/src/journey/diseaseStatus.ts`, no React, tested) report the latest dated status with everything
  recorded (category, date, extent, basis, confidence, source and provenance, notes, the supporting event and
  relationship, documents). The wording is "Latest recorded disease status: No evidence of disease. Recorded
  August 15, 2026.", never "NED today" or "current". With no status recorded it reads "Disease status: not
  recorded." and shows the latest Treatment_Response, Recurrence or Progression as it is, with no inference.
- **Newer assessment evidence** is a temporal observation only: events of the evidence types dated after the
  status date (not the same day, not undated, not withdrawn). It says nothing about whether they confirm or change
  the status.
- **One supporting event.** An event has a single `Event_Related_UID`, so a status can name one principal
  supporting event (default `Derived_From`; `Follow_up_to` for an earlier status). The other evidence stays as its
  own events, unlinked. A many-to-many relationship model is a separate architectural decision, not made here.
- **Required and optional fields:** only `Disease_Status_Category` is required (enforced on ingest and in the
  form); the rest are optional. No `Encounter_UID` is required.

There is no Summary view yet. The statement above is shown in the Post-treatment Surveillance facts as its
interim home, and the Summary will use the same functions.

## Summary and derived information

Summary information is derived from events, not entered separately. Examples: first recorded event, the
Diagnosis milestone, intervals between meaningful events, event counts, phase boundaries, treatment and
surveillance periods. Keep recorded facts, normalized facts, derived values, and presentation metadata
distinct, and keep derived values traceable to their events. A disease status is the exception to "derived": it
is a recorded assessment (see Disease status), and a Summary shows the latest recorded one with its date rather
than computing one.

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

- Whether the lane names fit every phase. Imaging_Response, ctDNA and utDNA stay in Investigations (settled
  after the Surveillance view). To be settled by looking at real journeys in the rendered views.
- Dense repeated events, such as daily radiation fractions (about 6 pixels apart), cannot be fixed by shorter
  labels and would still stack into many rows. If real data needs it, collapse a run of identical events into
  one expandable marker (for example "2 Gy ×30"); not built.
- Icons in place of text (treatment bags colored by agent, scanner graphics for imaging, blood vials for labs).
  Needs a design pass; the treatment label entries are objects so a color or icon can be added without
  restructuring.
- Which delivery statuses should be drawn hollow. Today: Held, Interrupted, Partially Delivered, Not Completed.
- Linking the evidence behind a milestone (the scans and tests behind a response, a change or a progression) to
  the milestone with `Event_Related_UID` and `Assessed_By`, so the renderer can draw them. Deferred until after
  user testing and advisor input, as before. Without links nothing is drawn or inferred.
- Analytics will want duration of response and progression-free survival. Duration of complete response is now
  computed from the "Complete response confirmed" decision (see the Post-treatment Surveillance section), but
  only up to a recorded Recurrence or Progression. For patients without one there is no recorded end of
  follow-up: the schema has no last-known-status date or death, and the absence of an event is not a negative
  result, so an ongoing duration is only elapsed time. A censoring date is to be decided when analytics is
  designed (options: the latest recorded follow-up assessment, or an explicit last-known-status field);
  analytics must also follow the cohort and suppression rules.
- How a second treatment course is represented as a new journey, since a journey is currently one patient
  record (`Master_ID`). Out of scope for now.
- Whether the Journey views replace or sit beside the existing onboarding flow in
  `frontend/src/pages/journey/onboarding/`, which keeps its own page state and does not write events.
