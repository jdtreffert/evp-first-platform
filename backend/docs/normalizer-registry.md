# Normalizer Registry

[`normalizerRegistry`](../src/normalizers/normalizerRegistry.ts) maps `Event_Type` to the
normalizer that converts a raw record into a `UnifiedEvent`. It is typed as `NormalizerRegistry`
(`{ [eventType: string]: EventNormalizer }`) and is the only place event types are enumerated;
validation reads its keys to decide which `eventType` values are legal.

## Registered types

| `Event_Type` | Normalizer | Emitted `eventType` |
|--------------|-----------|---------------------|
| `Diagnosis` | `normalizeDiagnosis` | `Diagnosis` |
| `Pathology` | `normalizePathology` | `Pathology` |
| `TURBT` | `normalizeTURBT` | `TURBT` |
| `Cytology` | `normalizeCytology` | `Cytology` |
| `Cystoscopy` | `normalizeCystoscopy` | `Cystoscopy` |
| `Cystoscopy_Biopsy` | `normalizeCystoscopyBiopsy` | `Cystoscopy_Biopsy` |
| `Imaging` | `normalizeImaging` | `Imaging` |
| `Imaging_Response` | `normalizeImagingResponse` | `Imaging_Response` |
| `Labs` | `normalizeLabs` | `Labs` |
| `Somatic` | `normalizeSomatic` | `Somatic` |
| `Germline` | `normalizeGermline` | `Germline` |
| `ctDNA` | `normalizeCtDNA` | `ctDNA` |
| `utDNA` | `normalizeUtDNA` | `utDNA` |
| `Treatment` | `normalizeTreatment` | a subtype below (dispatcher) |
| `Treatment_Start` | `normalizeTreatmentStart` | `Treatment_Start` |
| `Treatment_Change` | `normalizeTreatmentChange` | `Treatment_Change` |
| `Treatment_Response` | `normalizeTreatmentResponse` | `Treatment_Response` |
| `Treatment_Outcome` | `normalizeTreatmentOutcome` | `Treatment_Outcome` |
| `Treatment_Regimen_Details` | `normalizeTreatmentRegimenDetails` | `Treatment_Regimen_Details` |
| `Recurrence` | `normalizeRecurrence` | `Recurrence` |
| `Progression` | `normalizeProgression` | `Progression` |
| `Symptom` | `normalizeSymptom` | `Symptom` |
| `QoL` | `normalizeQoL` | `QoL` |
| `Decision` | `normalizeDecision` | `Decision` |
| `Document` | `normalizeDocument` | `Document` |
| `Event_Measure` | `normalizeEventMeasure` | `Event_Measure` |
| `Note` | `normalizeNote` | `Note` |
| `Other` | `normalizeOther` | `Other` |

### Airtable alignment

The Airtable `Event_Type` select field defines 21 options, listed in
[eventTypes.ts](../src/schemas/eventTypes.ts). All 21 are registered. The registry also accepts
7 platform-only types that have no Airtable option yet: `Labs`, `Pathology`, `Document`,
`Event_Measure`, `Treatment`, `Treatment_Outcome` and `Treatment_Regimen_Details`. A test fails if
the two lists and the registry drift apart. If Airtable gains options for these types, move them
from `platformOnlyEventTypes` to `airtableEventTypes`.

### The `Treatment` dispatcher

[`normalizeTreatment`](../src/normalizers/TreatmentNormalizer.ts) inspects the record's fields and
delegates to one subtype normalizer, checking in this order: start, change, response, outcome,
regimen details. The first match wins. If no subtype fields are present it throws, which the
pipeline reports as 422. The stored `eventType` is the subtype, not `Treatment`.

## Normalizer rules

- **Pure**: no I/O and no mutation of the input record.
- **Complete**: always return every core field (`uid`, `masterId`, `eventType`, `eventDate`, `payload`).
- **Preserve zero**: numeric fields use `?? null`, never `|| null`, because `0` is a real clinical value.
- **Name-matched output**: `eventType` equals the registry key (except the `Treatment` dispatcher).
- **Colocated tests**: each has a suite in `src/normalizers/__tests__/` named `<Normalizer>.test.ts`.

## Adding an event type

1. Add any new fields to `UnifiedEvent` ([UnifiedEvents.ts](../src/types/UnifiedEvents.ts)) **and** to
   [unifiedEventSchema.ts](../src/schemas/unifiedEventSchema.ts). The schema rejects unknown fields, so
   forgetting this makes every event of the new type fail validation.
2. Create `src/normalizers/<Name>Normalizer.ts` exporting `normalize<Name>(raw: RawEventRecord): UnifiedEvent`.
3. Register it in `normalizerRegistry.ts`.
4. Add `src/normalizers/__tests__/<Name>Normalizer.test.ts` using `testNormalizer` from `testUtils.ts`.
5. Add the row to the table above. A test checks that every registered type appears in this document.

The registry tests verify that each normalizer emits its own type and that its output passes the
schema, so steps 1 to 3 are caught if incomplete.
