# Roadmap

Current priority is Journey visualization. Proceed incrementally; do not attempt several stages at once.
Design intent is in [journey-design.md](journey-design.md).

## Journey visualization

1. Establish the Journey workspace and navigation.
2. Implement and validate Diagnosis phase selection.
3. Establish the presentation-policy architecture.
4. Implement the interactive Diagnosis timeline.
5. Refine the design against the reference patient journey.
6. Extend the proven architecture to Treatment.
7. Extend it to Surveillance.
8. Build the comprehensive Summary view.

## Encounters

Backend entity, the optional event link, the event form's Encounter section, and an encounter editor on the
timeline (create, edit, and tick which unlinked events belong, with same-date events suggested but never
linked automatically) are done. Remaining increments, in order:

1. Documents on encounters, including an "attach an existing document" picker so a visit summary is attached
   once to the encounter and the documents already attached to events can be reused.
2. Journey grouping by encounter in the view model and renderer.

## Deferred

- Evidence-to-synthesis linking UI (after user testing and advisor input).
- A "create pathology from this TURBT" shortcut.
- Production readiness: production email provider, a database in place of JSON files, encryption, audit
  logging, malware scanning for documents, deployment.
- Analytics with a minimum cohort of 10, complementary suppression, and inference protection.
- UI and browser tests.
