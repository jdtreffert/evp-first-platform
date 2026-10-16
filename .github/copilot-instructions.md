# EVP First - Copilot Instructions

## Mission

EVP First is a mission-driven, patient-centered platform for assembling, organizing, and visualizing
longitudinal health journey information. The initial clinical focus is bladder cancer and related
conditions, particularly complex treatment and surveillance journeys.

It is a patient journey companion: it helps patients assemble and understand their information and makes
organized longitudinal information potentially useful to patients and their care teams. It does not give
medical advice, diagnose disease, recommend treatment, or replace clinicians.

Favor patient understanding, longitudinal organization, data provenance, technical accuracy, and
extensibility.

## Canonical data

`UnifiedEvent` is the canonical representation of an event in a patient's journey. An `Encounter` is a separate
lightweight grouping entity (a healthcare interaction that events arose from or were recorded in); it is never
an event type and never replaces or duplicates events.

- The schema export `backend/schema/UnifiedEventsSchema.txt` (Excel "Unicode Text", UTF-16) is the source of
  truth for fields, types, and options. Never hand-edit `backend/src/schemas/eventFieldCatalog.ts`; it is
  generated.
- Which fields each event type uses, and which events a new event can be related to, live in
  `backend/src/schemas/eventTypeFields.ts` and are documented in `backend/docs/schema-tables.md`.
- Keep separate: canonical event data, normalization, presentation policy, rendering, and derived summaries.
- Do not change the canonical model to make a UI easier. Do not create visualization-specific copies of
  clinical data. Do not hard-code behavior for one patient's journey; work on any valid collection of events.
- Do not infer clinical facts that are not in the data. Missing data is unknown, never negative.
- Preserve source and provenance (`Event_Source`, server-set `recordedAt` and role, edit history) when events
  are transformed for display. Views use the current version of each event.
- Storage stays flat and raw. Derived values must stay traceable to the events they come from.
- Event relationships (`Event_Related_UID`) are optional and may be sparse. Never require them.
- Encounter association (`Encounter_UID`) is optional, single-valued, and means "arose from or was recorded in"
  that encounter. A missing value means unknown, not "no encounter". Never infer membership from matching
  dates; same-date events may only be suggested to the user. `Encounter_Date` and `Event_Date` are independent.
  Provenance (documents, `Event_Source`) stays separate from encounter membership.

## Schema change workflow

1. The schema file `backend/schema/UnifiedEventsSchema.txt` is authoritative and version-controlled; its history
   in git is the record of every change. Either the user (saving an Excel "Unicode Text" export over it) or
   the assistant (editing it directly, keeping UTF-16 with CRLF) may change it. Say what changed so it can be
   reviewed, and never leave a separate copy that can drift (for example in Downloads).
2. In `backend/` run `node scripts/generateFieldCatalog.mjs`.
3. A new event type or field also needs entries in `eventTypeFields.ts`, a normalizer, the `UnifiedEvent` type
   (`types/UnifiedEvents.ts`), and the strict zod schema (`schemas/unifiedEventSchema.ts`).
4. Run `npm run schema:tables` to regenerate `backend/schema/tables/` and `backend/docs/schema-tables.md`.
5. Tests fail if the catalog or the generated tables drift from the schema files.

See `backend/README.md` and `backend/docs/` for the pipeline, API, and registry.

## Build and test

- Backend (`backend/`): `npx tsc --noEmit` and `npx jest`.
- Frontend (`frontend/`): `npm run build`, `npm run lint` and `npm test` (Vitest, for plain logic such as
  phase selection and presentation policy).
- Add or update automated tests for meaningful behavior changes.

## Security and data handling

- Roles: `administrator` has full access, `clinical` is read-only, `patient` reads and writes only their own
  record. No role can delete events or documents. An event entered in error (a duplicate, for example) is
  withdrawn, not deleted: it is kept with its history and hidden from queries, and can be restored.
- The JSON event and encounter stores and the document folder are development-only. Do not treat them as suitable for other
  people's patient data; production needs a database, encryption, backups, and audit logging.
- Never commit secrets, print them, or log one-time sign-in codes. Keep `.env`, stored events, documents, and
  account files out of anything shared outside the repository.
- Analytics is deferred. When built it must use a minimum cohort of 10, complementary suppression, and
  inference protection.

## Journey and presentation

The app is moving from event capture toward patient-centered rendering of the journey (Summary, Diagnosis,
Treatment, Surveillance views). Views are derived presentations of the existing events, not separate clinical
records. See [docs/journey-design.md](../docs/journey-design.md) and
[docs/roadmap.md](../docs/roadmap.md). Future LLM features may assist navigation and assembly but are never
the source of clinical facts.

## Development approach

- Prefer small, coherent, testable increments. Maintain backward compatibility with event capture, the
  timeline, and the registry unless a change is explicitly required.
- Before a significant architectural change: inspect the existing implementation, check whether existing
  abstractions already fit, describe the approach and the files likely to change, and name any conflict with
  these principles.
- Do not add a framework, major dependency, persistent data structure, or architectural layer without saying
  why existing mechanisms are insufficient. Avoid premature abstraction and speculative features.
- After a significant increment, report briefly: what was done, files changed, decisions and assumptions,
  deviations from specifications, open questions, and anything learned that matters for future work.
