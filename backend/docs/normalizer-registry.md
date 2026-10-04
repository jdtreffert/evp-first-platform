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
| `Lab` | `normalizeLab` | `Lab` |
| `Somatic` | `normalizeSomatic` | `Somatic` |
| `Germline` | `normalizeGermline` | `Germline` |
| `ctDNA` | `normalizeCtDNA` | `ctDNA` |
| `utDNA` | `normalizeUtDNA` | `utDNA` |
| `Treatment` | `normalizeTreatment` | a subtype below (dispatcher) |
| `Treatment_Start` | `normalizeTreatmentStart` | `Treatment_Start` |
| `Treatment_Change` | `normalizeTreatmentChange` | `Treatment_Change` |
| `Treatment_Response` | `normalizeTreatmentResponse` | `Treatment_Response` |
| `Recurrence` | `normalizeRecurrence` | `Recurrence` |
| `Progression` | `normalizeProgression` | `Progression` |
| `Symptom` | `normalizeSymptom` | `Symptom` |
| `QoL` | `normalizeQoL` | `QoL` |
| `Decision` | `normalizeDecision` | `Decision` |
| `Document` | `normalizeDocument` | `Document` |
| `Event_Measure` | `normalizeEventMeasure` | `Event_Measure` |
| `Note` | `normalizeNote` | `Note` |
| `Other` | `normalizeOther` | `Other` |

### Schema alignment

The schema documentation (`UnifiedEventsSchema`) defines the `Event_Type` values, listed in
[eventTypes.ts](../src/schemas/eventTypes.ts) as `airtableEventTypes` (23 values: the original 21
plus `Lab` and `Pathology`). The registry also accepts `Document`, `Event_Measure` and `Treatment`,
which are outside that list. A test fails if the lists and the registry drift apart.

`Treatment_Outcome` and `Treatment_Regimen_Details` are not event types. Outcomes are recorded with
`Treatment_Response`, `Recurrence` and `Progression`; `Treatment_Regimen_Details` is an attribute of
`Treatment_Start` and `Treatment_Change`.

### The `Treatment` dispatcher

[`normalizeTreatment`](../src/normalizers/TreatmentNormalizer.ts) is a dispatcher, not a stored event
type. It inspects the record's fields and delegates to `Treatment_Start`, `Treatment_Change` or
`Treatment_Response`, checking in that order; the first match wins. A record with only general
treatment fields (`Treatment_Name`, `Treatment_Cycle`, `Treatment_Intent`) is a start. If no fields
match it throws, which the pipeline reports as 422. The stored `eventType` is the subtype.

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
