---
description: "Use when building or changing Journey views, timeline rendering, phase selection, or presentation policy in the frontend."
applyTo: "frontend/src/pages/journey/**,frontend/src/components/journey/**,frontend/src/journey/**"
---
# Journey views

Follow [docs/journey-design.md](../../docs/journey-design.md). In short:

- Journey views derive from the existing `UnifiedEvent` collection. Do not store phase-specific copies of
  clinical data or create a second source of clinical truth.
- Keep this pipeline separate: event collection → phase selection → presentation policy → view model →
  rendering. Phase selection must not depend on rendering code.
- Phase selection uses event type and date. Relationships are optional and only enrich the result.
- Keep event-type-specific visual choices (lane, icon, style, label, importance) in one presentation-policy
  layer (`frontend/src/journey/presentationPolicy.ts`), not scattered through components. Unknown event types
  must still render.
- Use each event's current version. Show provenance and edit history in event details.
- Never infer clinical facts or generate interpretations. Missing data is unknown, not negative.
- Respect roles: patients see only their own record; clinical accounts are read-only.
- Lanes are presentation groupings, not new event types. Do not change the canonical model to suit a view.
- Check the existing timeline and onboarding code before adding a new path.
- Layout: screens in `pages/journey/`, rendering components in `components/journey/`, and phase selection,
  presentation policy and view model in `frontend/src/journey/` with no React or rendering imports.

## Encounters

An Encounter is a healthcare interaction that events arose from or were recorded in. The full data rules are in
[.github/copilot-instructions.md](../copilot-instructions.md) and the design is in
[docs/journey-design.md](../../docs/journey-design.md). For Journey code:

- Encounter is an optional grouping dimension across events, not a thematic lane and not a clinical event
  type. It does not take part in phase selection or in presentation policy for event types.
- An event renders normally without an `Encounter_UID`. A missing link means unknown, not "outside any
  encounter", and an event whose encounter is not loaded still renders.
- Never infer encounter membership from `Event_Date` or from events sharing a date. Rendering uses only the
  recorded `Encounter_UID`; same-date events may be suggested to the user in the editor, never grouped.
- Events with the same `Encounter_UID` may be visually grouped while each stays in its own thematic lane. Do
  the grouping once in the view model (`groupTimeline` in `frontend/src/journey/encounterGroups.ts`), not in
  components.
- `Encounter_Date` does not replace `Event_Date`: events are placed by their own date, and the encounter
  marker by `Encounter_Date`. In a phase view show only the members inside the phase.
- Encounter context may be exposed on demand (summary, date, type, documents, member events), without
  interpretation.
- Keep provenance and documents distinct from membership. An encounter's documents document the encounter and
  are shown labelled as such; an event's own documents stay with the event. Never copy one onto the other.
