# EVP First Backend

TypeScript + Express service built on a **Unified-Event architecture**. Every
event category is normalized into a single canonical model, `UnifiedEvent`
([src/types/UnifiedEvents.ts](src/types/UnifiedEvents.ts)).

## Pipeline

```
raw record { id, fields }
  -> detect Event_Type          (src/ingestion/detectEventType.ts)
  -> normalizerRegistry lookup  (src/normalizers/normalizerRegistry.ts)
  -> normalizer -> UnifiedEvent (pure, no I/O, input not mutated)
  -> validate UnifiedEvent      (src/schemas/unifiedEventSchema.ts)
  -> persist via EventRepository (src/persistence/)
  -> response
```

## Layout

```
src/
  app.ts, server.ts, index.ts
  controllers/   services/   routes/   middleware/
  ingestion/     schemas/    persistence/   normalizers/   types/   utils/
```

Conventions: strict TypeScript, named exports only, tests colocated in
`__tests__/` (Jest).

## API

`POST /api/events/ingest` — body `{ "id": string, "fields": { "Event_Type": string, ... } }`

| Status | Meaning |
|--------|---------|
| 201 | Event was stored; body is the resulting `UnifiedEvent` |
| 200 | An event with the same `uid` already existed and was replaced (idempotent re-ingest) |
| 400 | Malformed JSON, invalid record shape, or missing `Event_Type` |
| 422 | Unregistered `Event_Type`, or the normalized event failed validation (`details` lists `{ path, message }` errors) |

`POST /api/events/validate` — body is a `UnifiedEvent`; always 200 with `{ "valid": boolean, "errors": [{ "path", "message" }] }`.
See [the UnifiedEvent spec](src/schemas/UnifiedEventSpec.md).

`GET /` — health check.

## Persistence

Events are stored through the `EventRepository` interface
([src/persistence/eventRepository.ts](src/persistence/eventRepository.ts)); `uid` is the
identity and saving an existing `uid` replaces the event. The initial implementation,
`FileEventRepository`, keeps a JSON file (`{ "version": 1, "events": [...] }`):

- operations are serialized, so concurrent requests cannot lose writes
- writes go to a temp file and are renamed into place
- a missing file is an empty store; a corrupt or unrecognized file is an error and is never overwritten

A database-backed store only needs to implement the same interface and be passed to
`createApp({ repository })`.

Configure the location with `EVP_DATA_FILE` (default `data/events.json`, relative to the
working directory). The store contains patient data: `backend/data/` is git-ignored and
should not be committed.

`GET /api/events/query` — filter stored events. All parameters are optional; unknown or invalid ones return 400 with `details`.

| Parameter | Meaning |
|-----------|---------|
| `masterId`, `eventType` | Exact match |
| `from`, `to` | Inclusive `YYYY-MM-DD` range on the event's recorded calendar date (`from` must not be after `to`); undated events never match a range |
| `order` | `asc` (default) or `desc` by event date; undated events always last, ties broken by `uid` |
| `limit`, `offset` | Pagination; `limit` 1-500 (default 50), `offset` default 0 |

Response: `{ "events": [...], "total": n, "limit": n, "offset": n }`, where `total` counts matches before pagination.

`GET /api/events/:uid` — one event: 200, 404 if not found, 400 for a malformed `uid`.

`POST /api/events/batch` — body `{ "records": [ { "id", "fields" }, ... ] }` (1-500 records, 5 MB max body).

Each record goes through the same pipeline as `/ingest`, independently: valid records are stored and invalid ones are reported, so one bad record never discards the rest. Records are processed in order; a repeated `uid` replaces the earlier one.

```json
{
  "summary": { "received": 3, "created": 1, "updated": 1, "failed": 1 },
  "results": [
    { "index": 0, "status": "created", "uid": "A" },
    { "index": 1, "status": "updated", "uid": "B" },
    { "index": 2, "status": "failed", "error": "Normalized event failed validation", "details": [{ "path": "eventDate", "message": "..." }] }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 200 | The batch was processed; check `summary.failed` and per-record `results` (failures do not change the status) |
| 400 | Body is not `{ records: [...] }`, is empty, or has more than 500 records; nothing was stored |
| 413 | Body exceeds 5 MB |

Retrying is safe: re-sending records updates them by `uid`, so resend only the failed ones.

## Scripts

- `npm run dev` — run with tsx
- `npm test` — Jest
- `npm run build` / `npm start` — compile to `dist/` and run

`PORT` (default 3000) is read from the environment / `.env`.
