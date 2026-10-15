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

`UnifiedEvent` is the canonical representation of an event in a patient's journey.

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

## Schema change workflow

1. The user edits the Excel schema and exports it. Do not edit the export yourself; if it is out of date, say
   so and ask for a new export.
2. Copy it to `backend/schema/UnifiedEventsSchema.txt`, then in `backend/` run
   `node scripts/generateFieldCatalog.mjs`.
3. A new event type or field also needs entries in `eventTypeFields.ts`, a normalizer, the `UnifiedEvent` type
   (`types/UnifiedEvents.ts`), and the strict zod schema (`schemas/unifiedEventSchema.ts`).
4. Run `npm run schema:tables` to regenerate `backend/schema/tables/` and `backend/docs/schema-tables.md`.
5. Tests fail if the catalog or the generated tables drift from the schema files.

See `backend/README.md` and `backend/docs/` for the pipeline, API, and registry.

## Build and test

- Backend (`backend/`): `npx tsc --noEmit` and `npx jest`.
- Frontend (`frontend/`): `npm run build` and `npm run lint`.
- Add or update automated tests for meaningful behavior changes.

## Security and data handling

- Roles: `administrator` has full access, `clinical` is read-only, `patient` reads and writes only their own
  record. No role can delete events or documents.
- The JSON event store and the document folder are development-only. Do not treat them as suitable for other
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
