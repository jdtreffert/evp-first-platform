# API Reference

Base path: `/api`. All request and response bodies are JSON. Health check: `GET /` returns plain text.
The server listens on `PORT` (default 3000). There is currently **no authentication**
(see [limitations](./architecture.md#known-limitations)).

## Errors

Errors use `{ "error": string, "details"?: [...] }`. Validation details are
`{ "path": string, "message": string }` entries.

| Status | When |
|--------|------|
| 400 | Malformed JSON, invalid request shape, or invalid query parameters |
| 404 | Event not found |
| 413 | Request body over 5 MB |
| 422 | Valid request, but the event cannot be accepted (unsupported type, normalization or validation failure) |
| 500 | Unexpected error; the body is always `{ "error": "Internal server error" }` |

## POST /api/events/ingest

Normalizes, validates, and stores one event.

Request: `{ "id": string, "fields": { "Event_Type": string, ... } }`

```json
{ "id": "rec1", "fields": { "Event_Type": "ctDNA", "Event_UID": "E1", "Master_ID": "M1", "Event_Date": "2024-03-01", "ctDNA_Value": 0 } }
```

| Status | Meaning |
|--------|---------|
| 201 | Stored as a new event; body is the `UnifiedEvent` |
| 200 | An event with the same `uid` existed and was replaced; body is the `UnifiedEvent` |
| 400 | Invalid record shape, or missing `Event_Type` |
| 422 | Unsupported `Event_Type`, normalization failure, or the normalized event failed validation (`details`) |

`Master_ID` is required; `Event_Date` is optional but must be a real date if present.
See the [pipeline](./ingestion-pipeline.md).

## POST /api/events/batch

Ingests up to 500 records independently. Valid records are stored; invalid ones are reported.

Request: `{ "records": [ { "id", "fields" }, ... ] }`

```json
{
  "summary": { "received": 3, "created": 1, "updated": 1, "failed": 1 },
  "results": [
    { "index": 0, "status": "created", "uid": "A" },
    { "index": 1, "status": "updated", "uid": "B" },
    { "index": 2, "status": "failed", "error": "Normalized event failed validation",
      "details": [{ "path": "eventDate", "message": "Invalid date: ..." }] }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 200 | Batch processed. **Check `summary.failed`**; per-record failures do not change the status |
| 400 | Body is not `{ records: [...] }`, is empty, or exceeds 500 records; nothing stored |
| 413 | Body over 5 MB |

A failed `Storage error` entry means the record was not saved. Retrying is safe because saves
are upserts by `uid`; resend only the failures.

## POST /api/events/validate

Checks a `UnifiedEvent` without storing it. Always 200 for a JSON body; inspect `valid`.

```json
{ "valid": false, "errors": [{ "path": "uid", "message": "Invalid uid: ..." }] }
```

The body is a `UnifiedEvent`, not a raw record. See the [specification](../src/schemas/UnifiedEventSpec.md).

## GET /api/events/query

Lists stored events. All parameters are optional; unknown or invalid ones return 400.

| Parameter | Meaning |
|-----------|---------|
| `masterId`, `eventType` | Exact match |
| `from`, `to` | Inclusive `YYYY-MM-DD` range on the event's recorded calendar date; `from` must not be after `to`. Undated events never match a range |
| `order` | `asc` (default) or `desc` by event date. Undated events are always last; ties are broken by `uid` |
| `limit` | 1 to 500, default 50 |
| `offset` | Default 0 |

Response: `{ "events": [UnifiedEvent], "total": number, "limit": number, "offset": number }`.
`total` counts all matches before pagination.

## GET /api/events/:uid

Returns one `UnifiedEvent`: 200, 404 if no such event, 400 if `uid` is malformed.

## Example session

```sh
curl -X POST http://127.0.0.1:3000/api/events/ingest \
  -H 'content-type: application/json' \
  -d '{"id":"rec1","fields":{"Event_Type":"Note","Event_UID":"N1","Master_ID":"M1","Note_Text":"hello"}}'

curl 'http://127.0.0.1:3000/api/events/query?masterId=M1&order=desc&limit=10'
curl http://127.0.0.1:3000/api/events/N1
```
