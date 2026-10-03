# UnifiedEvent Specification

`UnifiedEvent` ([types/UnifiedEvents.ts](../types/UnifiedEvents.ts)) is the single
canonical event shape. It is enforced at runtime by
[unifiedEventSchema.ts](./unifiedEventSchema.ts), which is the source of truth for
validation. Keep the interface and the schema in sync; the registry round-trip test
fails if a normalizer emits a field the schema does not know.

## Core fields

| Field | Type | Rule |
|-------|------|------|
| `uid` | string | 1-128 chars: letters, digits, `_ . : -`; must start with a letter or digit |
| `masterId` | string | Required, non-empty (links the event to a patient master record) |
| `eventType` | string | Must be a key in `normalizerRegistry` |
| `eventDate` | string \| null | Real calendar date `YYYY-MM-DD`, or ISO 8601 date-time with offset (`Z` or `+hh:mm`); `2024-02-30` is rejected |
| `payload` | `{ id, fields }` | The raw record the event was normalized from |
| `eventSummary`, `eventSource` | string \| null, optional | |
| `eventDetails` | object, optional | Free-form details mirror |

## Field blocks

All other fields are optional and grouped by event category (documents, labs, imaging,
pathology, cystoscopy/biopsy, cytology, somatic, germline, ctDNA, utDNA, treatment,
decision, symptom, QoL, recurrence, progression, event measure, note, other).

- Text fields: `string | null`.
- Numeric fields (scores, values, cycles, grades): finite `number | null`. **Zero is a
  valid value** and is preserved by the normalizers.
- List fields: `string[]`.
- `labValues`: `Record<string, string>`; `documentAttachment`: any[].

## Strictness

Unknown top-level keys are rejected. Wrongly typed values (for example a numeric
field supplied as a string) are reported with their field path.

## Validation report

```json
{ "valid": false, "errors": [{ "path": "eventDate", "message": "Invalid date: ..." }] }
```

`POST /api/events/validate` returns this report with HTTP 200. `POST /api/events/ingest`
validates after normalization and returns HTTP 422 with the same errors as `details`.
