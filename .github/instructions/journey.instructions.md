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
  layer, not scattered through components. Unknown event types must still render.
- Use each event's current version. Show provenance and edit history in event details.
- Never infer clinical facts or generate interpretations. Missing data is unknown, not negative.
- Respect roles: patients see only their own record; clinical accounts are read-only.
- Lanes are presentation groupings, not new event types. Do not change the canonical model to suit a view.
- Check the existing timeline and onboarding code before adding a new path.
- Layout: screens in `pages/journey/`, rendering components in `components/journey/`, and phase selection,
  presentation policy and view model in `frontend/src/journey/` with no React or rendering imports.
