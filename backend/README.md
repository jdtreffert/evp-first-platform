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

Endpoints (full details, parameters and examples in the [API reference](docs/api.md)):

| Method and path | Purpose |
|-----------------|---------|
| `POST /api/events/ingest` | Normalize, validate and store one event (201 new, 200 replaced) |
| `POST /api/events/batch` | Ingest up to 500 records independently; failures are reported per record |
| `POST /api/events/validate` | Validate a `UnifiedEvent` without storing it |
| `GET /api/events/query` | Filter stored events by `masterId`, `eventType`, date range, with pagination |
| `GET /api/events/:uid` | Fetch one event |
| `GET /` | Health check |

## Persistence

Events are stored through the `EventRepository` interface
([src/persistence/eventRepository.ts](src/persistence/eventRepository.ts)); `uid` is the
identity and saving an existing `uid` replaces the event. The initial `FileEventRepository`
keeps a JSON file; a database store only needs to implement the same interface and be passed to
`createApp({ repository })`.

Configure the location with `EVP_DATA_FILE` (default `data/events.json`, relative to the
working directory). The store contains patient data: `backend/data/` is git-ignored and
should not be committed.

## Documentation

- [Architecture](docs/architecture.md), including known limitations
- [Ingestion pipeline](docs/ingestion-pipeline.md)
- [Normalizer registry](docs/normalizer-registry.md)
- [API reference](docs/api.md)
- [UnifiedEvent specification](src/schemas/UnifiedEventSpec.md)

## Scripts

- `npm run dev` — run with tsx
- `npm test` — Jest
- `npm run build` / `npm start` — compile to `dist/` and run

`PORT` (default 3000) is read from the environment / `.env`.
