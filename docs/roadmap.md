# Roadmap

Current priority is Journey visualization. Proceed incrementally; do not attempt several stages at once.
Design intent is in [journey-design.md](journey-design.md).

## Journey visualization

1. Establish the Journey workspace and navigation.
2. Implement and validate Diagnosis phase selection. (Done.)
3. Establish the presentation-policy architecture. (Done: lanes, names, milestone.)
4. Implement the interactive Diagnosis timeline. (First version done as the Diagnosis tab: view model, layout
   and renderer; to be refined against the reference journey.)
5. Refine the design against the reference patient journey.
6. Extend the proven architecture to Treatment.
7. Extend it to Surveillance.
8. Build the comprehensive Summary view.

## Encounters

Backend entity, the optional event link, the event form's Encounter section, an encounter editor on the
timeline (create, edit, and tick which unlinked events belong, with same-date events suggested but never
linked automatically), documents on encounters (attach a new file or an existing document once, shown
from every event in the encounter), and encounter grouping in the timeline (a tested view model and an
optional "Group events by encounter" view) are done. Still to do: draw encounters in the lane renderer, which
comes with the Diagnosis view.

Smaller follow-ups: show encounter history on the screen, and an "attach an existing document" picker on the
event form.

## Deferred

- Evidence-to-synthesis linking UI (after user testing and advisor input).
- A "create pathology from this TURBT" shortcut.
- Production readiness: production email provider, a database in place of JSON files, encryption, audit
  logging, malware scanning for documents, deployment.
- Analytics with a minimum cohort of 10, complementary suppression, and inference protection.
- UI and browser tests.
