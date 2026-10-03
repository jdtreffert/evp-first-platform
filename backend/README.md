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
  -> [validation]   planned
  -> [persistence]  planned
  -> response
```

## Layout

```
src/
  app.ts, server.ts, index.ts
  controllers/   services/   routes/   middleware/
  ingestion/     schemas/    normalizers/   types/   utils/
```

Conventions: strict TypeScript, named exports only, tests colocated in
`__tests__/` (Jest).

## API

`POST /api/events/ingest` — body `{ "id": string, "fields": { "Event_Type": string, ... } }`

| Status | Meaning |
|--------|---------|
| 201 | Body is the resulting `UnifiedEvent` |
| 400 | Malformed JSON, invalid record shape, or missing `Event_Type` |
| 422 | `Event_Type` has no registered normalizer |

`GET /` — health check.

Planned: `/events/query`, `/events/batch`, `/events/validate`.

## Scripts

- `npm run dev` — run with tsx
- `npm test` — Jest
- `npm run build` / `npm start` — compile to `dist/` and run

`PORT` (default 3000) is read from the environment / `.env`.
